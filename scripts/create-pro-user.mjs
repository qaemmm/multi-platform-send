#!/usr/bin/env node
/**
 * 创建用户并设置为专业版
 * 专门用于解决 842123094@qq.com 用户的登录问题
 */

import { createClient } from '@libsql/client';
import { createId } from '@paralleldrive/cuid2';

async function main() {
  const userEmail = '842123094@qq.com';
  const userPassword = '123456';

  const url = process.env.TURSO_DATABASE_URL || 'file:./dev.db';
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  console.log('🔗 连接数据库:', url.startsWith('file:') ? '本地 dev.db' : 'Turso');

  const client = createClient({ url, authToken });

  try {
    // 检查用户是否存在
    const existingUser = await client.execute({
      sql: 'SELECT id, email, plan FROM users WHERE email = ? LIMIT 1',
      args: [userEmail],
    });

    if (existingUser.rows.length > 0) {
      console.log('✅ 用户已存在:', existingUser.rows[0]);

      // 更新为专业版
      await client.execute({
        sql: 'UPDATE users SET plan = ?, plan_expired_at = ?, updated_at = ? WHERE email = ?',
        args: ['pro', null, Date.now(), userEmail],
      });

      console.log('✅ 用户已更新为专业版');
    } else {
      // 创建新用户
      const userId = createId();
      const now = new Date();

      await client.execute({
        sql: 'INSERT INTO users (id, email, password_hash, plan, plan_expired_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [
          userId,
          userEmail,
          userPassword, // 注意：实际应该使用哈希密码
          'pro',
          null, // 不过期
          now.getTime(),
          now.getTime()
        ],
      });

      console.log('✅ 用户创建成功并设置为专业版');
      console.log('   用户ID:', userId);
      console.log('   邮箱:', userEmail);
    }

    // 验证结果
    const result = await client.execute({
      sql: 'SELECT email, plan, plan_expired_at FROM users WHERE email = ? LIMIT 1',
      args: [userEmail],
    });

    const user = result.rows[0];
    console.log('📋 最终用户状态:');
    console.log('   邮箱:', user.email);
    console.log('   计划:', user.plan);
    console.log('   过期时间:', user.plan_expired_at || '永不过期');

  } catch (err) {
    console.error('❌ 操作失败:', err.message || err);
    process.exit(1);
  } finally {
    try { await client.close?.(); } catch (_) {}
  }
}

main();