#!/usr/bin/env node
/**
 * 将指定邮箱的用户设置为 Pro（不限制或指定过期时间）
 * 使用 @libsql/client 直接更新数据库，避免暴露管理 API。
 *
 * 用法示例：
 *   node ./scripts/fix-user-plan.mjs --email=you@example.com
 *   node ./scripts/fix-user-plan.mjs --email=you@example.com --expires=2026-12-31
 *
 * 数据库选择策略：
 * - 如果存在 TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN)，连接 Turso
 * - 否则使用本地 SQLite 文件 file:./dev.db
 */

import { createClient } from '@libsql/client';

function parseArgs(argv) {
  const args = {};
  for (const item of argv.slice(2)) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function toTimestampMs(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) throw new Error(`无效的日期格式: ${dateStr}`);
  return d.getTime(); // Drizzle schema 使用 integer timestamp（ms）
}

async function main() {
  const { email, expires } = parseArgs(process.argv);
  if (!email) {
    console.error('用法: node scripts/fix-user-plan.mjs --email=<邮箱> [--expires=YYYY-MM-DD]');
    process.exit(1);
  }

  const url = process.env.TURSO_DATABASE_URL || 'file:./dev.db';
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  console.log('🔗 连接数据库:', url.startsWith('file:') ? '本地 dev.db' : 'Turso');

  const client = createClient({ url, authToken });

  try {
    // 1) 检查用户是否存在
    const res1 = await client.execute({
      sql: 'SELECT id, plan, plan_expired_at FROM users WHERE email = ? LIMIT 1',
      args: [email],
    });

    if (res1.rows.length === 0) {
      throw new Error(`用户不存在，请先在网站注册并登录该邮箱: ${email}`);
    }

    const expiresTs = toTimestampMs(expires);

    // 2) 更新为 pro
    await client.execute({
      sql: 'UPDATE users SET plan = ?, plan_expired_at = ?, updated_at = ? WHERE email = ?',
      args: ['pro', expiresTs, Date.now(), email],
    });

    // 3) 查询结果确认
    const res2 = await client.execute({
      sql: 'SELECT email, plan, plan_expired_at FROM users WHERE email = ? LIMIT 1',
      args: [email],
    });

    const row = res2.rows[0];
    const expiredAt = row.plan_expired_at ? new Date(Number(row.plan_expired_at)).toISOString() : null;

    console.log('✅ 已更新为 Pro');
    console.log('   邮箱:', row.email);
    console.log('   计划: pro');
    console.log('   过期时间:', expiredAt || '不限期');
    console.log('\n提示: 访问 /api/auth/user-plan 或 /api/auth/user-plan-dev 验证 isPro 状态\n');
  } catch (err) {
    console.error('❌ 操作失败:', err.message || err);
    process.exit(1);
  } finally {
    try { await client.close?.(); } catch (_) {}
  }
}

main();

