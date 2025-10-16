// 修复用户专业版状态的脚本
const { db } = require('./src/lib/db');
const { users } = require('./src/lib/db/schema');
const { eq } = require('drizzle-orm');

async function fixUserPlan() {
  try {
    // 设置用户的专业版状态为永不过期
    const result = await db
      .update(users)
      .set({
        plan_expired_at: null, // null 表示永不过期
        plan: 'pro'
      })
      .where(eq(users.email, '842123094@qq.com'));

    console.log('✅ 用户专业版状态已修复');

    // 验证更新结果
    const user = await db.query.users.findFirst({
      where: eq(users.email, '842123094@qq.com'),
      columns: {
        email: true,
        plan: true,
        plan_expired_at: true
      }
    });

    console.log('用户当前状态:', user);
    console.log('专业版状态:', user.plan === 'pro' && !user.plan_expired_at ? '✅ 有效' : '❌ 无效');

  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixUserPlan();
}

module.exports = { fixUserPlan };