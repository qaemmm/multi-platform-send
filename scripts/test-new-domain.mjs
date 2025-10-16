#!/usr/bin/env node
/**
 * 测试新的七牛云域名配置
 */

import { createQiniuStorageService } from '../src/lib/services/qiniu-storage.ts';

async function testNewDomain() {
  console.log('🧪 开始测试新域名 cdn.huiouye.top');

  // 测试七牛云服务
  const qiniuService = createQiniuStorageService();

  if (!qiniuService) {
    console.error('❌ 七牛云服务初始化失败');
    console.log('请检查环境变量配置');
    return;
  }

  console.log('✅ 七牛云服务初始化成功');

  // 创建测试图片 (1x1像素的红色PNG)
  const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwWKJCdL4QAAAABJRU5ErkJggg==', 'base64');
  const testBlob = new Blob([testImageData], { type: 'image/png' });

  console.log('\n📤 正在测试上传...');

  try {
    const result = await qiniuService.uploadFile(testBlob, 'test-new-domain.png');

    if (result.success) {
      console.log('✅ 上传成功！');
      console.log('📋 文件信息：');
      console.log('   - URL:', result.url);
      console.log('   - 文件名:', result.fileName);
      console.log('   - 大小:', result.fileSize, 'bytes');
      console.log('   - 路径:', result.uploadPath);

      // 测试访问
      console.log('\n🔍 正在测试访问...');
      try {
        const response = await fetch(result.url, {
          method: 'GET',
          timeout: 15000
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const contentLength = response.headers.get('content-length');

          console.log('✅ 文件可以正常访问！');
          console.log('📊 访问信息：');
          console.log('   - 状态码:', response.status);
          console.log('   - Content-Type:', contentType);
          console.log('   - Content-Length:', contentLength);
          console.log('🌐 访问URL:', result.url);

          // 验证图片内容
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength > 0) {
            console.log('✅ 图片内容正常，大小:', arrayBuffer.byteLength, 'bytes');
          } else {
            console.log('❌ 图片内容为空');
          }

        } else {
          console.log('❌ 文件无法访问，状态码:', response.status);
          console.log('📄 响应内容:', await response.text());
        }
      } catch (accessError) {
        console.log('❌ 访问测试失败:', accessError.message);
        console.log('💡 可能原因：DNS配置未生效或网络问题');
      }

      // 测试不同的URL格式
      console.log('\n🔗 测试不同的URL格式...');
      const testUrls = [
        result.url, // 原始URL
        result.url.replace('http://', 'https://'), // HTTPS版本
      ];

      for (const testUrl of testUrls) {
        try {
          console.log(`📍 测试: ${testUrl}`);
          const testResponse = await fetch(testUrl, {
            method: 'HEAD',
            timeout: 10000
          });
          console.log(`   ${testResponse.ok ? '✅' : '❌'} 状态码: ${testResponse.status}`);
        } catch (e) {
          console.log(`   ❌ 错误: ${e.message}`);
        }
      }

    } else {
      console.log('❌ 上传失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  console.log('\n💡 配置建议：');
  console.log('如果测试通过，请更新 .env 文件：');
  console.log('QINIU_DOMAIN="http://cdn.huiouye.top"');
  console.log('IMAGE_STORAGE_PROVIDER="qiniu"');
}

testNewDomain();