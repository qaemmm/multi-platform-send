#!/usr/bin/env node
/**
 * 最终配置测试 - 验证七牛云新域名完整功能
 */

import { config } from 'dotenv';

// 加载环境变量
config({ path: '.env' });

console.log('🎯 最终配置测试');
console.log('='.repeat(50));

// 检查环境变量
console.log('📋 环境变量检查：');
const requiredVars = [
  'QINIU_ACCESS_KEY',
  'QINIU_SECRET_KEY',
  'QINIU_BUCKET',
  'QINIU_DOMAIN',
  'IMAGE_STORAGE_PROVIDER'
];

let missingVars = [];
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value !== 'your-' + varName.toLowerCase()) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`❌ ${varName}: 未配置`);
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log(`\n⚠️  请先配置以下环境变量: ${missingVars.join(', ')}`);
  console.log('在 .env 文件中设置正确的值');
  process.exit(1);
}

console.log('\n🧪 开始测试七牛云功能...');

// 动态导入七牛云服务
async function testQiniuService() {
  try {
    const { createQiniuStorageService } = await import('../src/lib/services/qiniu-storage.ts');
    const qiniuService = createQiniuStorageService();

    if (!qiniuService) {
      console.log('❌ 七牛云服务初始化失败');
      return false;
    }

    console.log('✅ 七牛云服务初始化成功');

    // 创建测试图片
    const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwWKJCdL4QAAAABJRU5ErkJggg==', 'base64');
    const testBlob = new Blob([testImageData], { type: 'image/png' });

    console.log('📤 正在上传测试图片...');
    const timestamp = Date.now();
    const fileName = `test-final-${timestamp}.png`;

    const result = await qiniuService.uploadFile(testBlob, fileName);

    if (result.success) {
      console.log('✅ 上传成功！');
      console.log('📄 文件URL:', result.url);

      // 测试访问
      console.log('🔍 正在测试访问...');
      try {
        const response = await fetch(result.url, { timeout: 15000 });

        if (response.ok) {
          console.log('✅ 文件访问成功！');
          console.log('📊 状态码:', response.status);
          console.log('📏 文件大小:', response.headers.get('content-length'), 'bytes');

          // 验证内容
          const buffer = await response.arrayBuffer();
          if (buffer.byteLength > 0) {
            console.log('✅ 文件内容正常');

            // 测试在浏览器中的访问
            console.log('\n🌐 浏览器访问测试:');
            console.log('请复制以下URL在浏览器中打开:');
            console.log(result.url);

            return true;
          } else {
            console.log('❌ 文件内容为空');
            return false;
          }
        } else {
          console.log('❌ 文件访问失败，状态码:', response.status);
          return false;
        }
      } catch (accessError) {
        console.log('❌ 访问测试失败:', accessError.message);
        return false;
      }
    } else {
      console.log('❌ 上传失败:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
    return false;
  }
}

// 运行测试
testQiniuService().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 配置测试完全通过！');
    console.log('✅ 七牛云新域名配置成功');
    console.log('✅ 上传功能正常');
    console.log('✅ 访问功能正常');
    console.log('\n🚀 现在可以正常使用图片上传功能了！');
  } else {
    console.log('❌ 配置测试失败');
    console.log('请检查：');
    console.log('1. 环境变量是否正确');
    console.log('2. 七牛云控制台配置');
    console.log('3. 网络连接是否正常');
  }
}).catch(error => {
  console.log('💥 测试异常:', error.message);
});