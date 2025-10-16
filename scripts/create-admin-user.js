/**
 * 管理员脚本：创建用户并设置为会员
 * 使用方法：node scripts/create-admin-user.js
 */

const bcrypt = require('bcryptjs');
const path = require('path');

// 模拟数据库操作（需要根据实际项目配置调整）
async function createAdminUser() {
  try {
    console.log('🚀 开始创建管理员账号...');

    // 用户信息
    const userData = {
      name: '管理员用户',
      email: '842123094@qq.com',
      password: '123456'
    };

    // 加密密码
    const passwordHash = await bcrypt.hash(userData.password, 12);

    console.log('📧 邮箱:', userData.email);
    console.log('🔐 密码:', userData.password);
    console.log('🏷️ 姓名:', userData.name);
    console.log('🔒 密码哈希:', passwordHash);

    // 生成插入数据库的SQL命令
    const insertUserSQL = `
INSERT INTO users (id, name, email, passwordHash, plan, planExpiredAt, createdAt, updatedAt)
VALUES (
  '${generateId()}',
  '${userData.name}',
  '${userData.email}',
  '${passwordHash}',
  'pro',
  '${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}',
  '${new Date().toISOString()}',
  '${new Date().toISOString()}'
);`;

    console.log('\n📝 请手动执行以下SQL命令到数据库：');
    console.log('=' .repeat(80));
    console.log(insertUserSQL);
    console.log('=' .repeat(80));

    // 创建 .env 配置建议
    const envConfig = `
# 添加到 .env 文件中的管理员配置
ADMIN_EMAILS="${userData.email}"
`;

    console.log('\n🔧 环境变量配置：');
    console.log('=' .repeat(50));
    console.log(envConfig);
    console.log('=' .repeat(50));

    console.log('\n✅ 配置信息已生成！');
    console.log('\n📋 下一步操作：');
    console.log('1. 复制上面的SQL命令到数据库执行');
    console.log('2. 将环境变量添加到 .env 文件');
    console.log('3. 重启应用服务');
    console.log('4. 使用 842123094@qq.com / 123456 登录');

  } catch (error) {
    console.error('❌ 创建用户失败:', error);
  }
}

// 生成简单的ID（模拟cuid2）
function generateId() {
  return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// 执行脚本
createAdminUser();