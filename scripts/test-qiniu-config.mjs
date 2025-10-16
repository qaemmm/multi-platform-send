#!/usr/bin/env node
/**
 * 测试七牛云配置和上传功能
 */

import { createQiniuStorageService } from '../src/lib/services/qiniu-storage.js';

async function testQiniuConfig() {
  console.log('🔧 正在初始化七牛云服务...');

  const qiniuService = createQiniuStorageService();

  if (!qiniuService) {
    console.error('❌ 七牛云服务初始化失败');
    console.log('请检查以下环境变量是否正确配置：');
    console.log('- QINIU_ACCESS_KEY');
    console.log('- QINIU_SECRET_KEY');
    console.log('- QINIU_BUCKET');
    console.log('- QINIU_DOMAIN');
    console.log('- QINIU_ZONE');
    return;
  }

  console.log('✅ 七牛云服务初始化成功');

  // 创建测试图片
  const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const testBlob = new Blob([testImageData], { type: 'image/png' });

  console.log('📤 正在测试上传...');

  try {
    const result = await qiniuService.uploadFile(testBlob, 'test-image.png');

    if (result.success) {
      console.log('✅ 上传成功！');
      console.log('📋 文件信息：');
      console.log('   - URL:', result.url);
      console.log('   - 文件名:', result.fileName);
      console.log('   - 大小:', result.fileSize, 'bytes');
      console.log('   - 路径:', result.uploadPath);

      // 测试访问
      console.log('\n🔍 正在测试访问...');
      const response = await fetch(result.url);

      if (response.ok) {
        console.log('✅ 文件可以正常访问！');
        console.log('🌐 访问URL:', result.url);
      } else {
        console.log('❌ 文件无法访问，状态码:', response.status);
        console.log('📄 响应内容:', await response.text());
      }
    } else {
      console.log('❌ 上传失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testQiniuConfig();