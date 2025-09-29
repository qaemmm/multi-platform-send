#!/usr/bin/env node
/**
 * 修复用户密码哈希问题
 * 将明文密码更新为bcrypt哈希密码
 */

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

async function main() {
  const userEmail = '842123094@qq.com';
  const plainPassword = '123456';

  const url = process.env.TURSO_DATABASE_URL || 'file:./dev.db';
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  console.log('🔗 连接数据库:', url.startsWith('file:') ? '本地 dev.db' : 'Turso');

  const client = createClient({ url, authToken });

  try {
    // 检查用户当前状态
    const currentUser = await client.execute({
      sql: 'SELECT id, email, password_hash, plan FROM users WHERE email = ? LIMIT 1',
      args: [userEmail],
    });

    if (currentUser.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const user = currentUser.rows[0];
    console.log('📋 当前用户状态:');
    console.log('   邮箱:', user.email);
    console.log('   计划:', user.plan);
    console.log('   当前密码哈希:', user.password_hash ? '已设置' : '未设置');

    // 生成密码哈希
    console.log('🔐 正在生成密码哈希...');
    const passwordHash = await bcrypt.hash(plainPassword, 12);
    console.log('✅ 密码哈希生成成功');

    // 更新用户密码
    await client.execute({
      sql: 'UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?',
      args: [passwordHash, Date.now(), userEmail],
    });

    console.log('✅ 用户密码已更新为bcrypt哈希');

    // 验证更新结果
    const updatedUser = await client.execute({
      sql: 'SELECT email, password_hash, plan FROM users WHERE email = ? LIMIT 1',
      args: [userEmail],
    });

    const finalUser = updatedUser.rows[0];
    console.log('📋 最终用户状态:');
    console.log('   邮箱:', finalUser.email);
    console.log('   计划:', finalUser.plan);
    console.log('   密码哈希:', finalUser.password_hash ? '已设置' : '未设置');

    // 测试密码验证
    console.log('🧪 测试密码验证...');
    const isValid = await bcrypt.compare(plainPassword, finalUser.password_hash);
    console.log('   密码验证结果:', isValid ? '✅ 通过' : '❌ 失败');

  } catch (err) {
    console.error('❌ 操作失败:', err.message || err);
    process.exit(1);
  } finally {
    try { await client.close?.(); } catch (_) {}
  }
}

main();