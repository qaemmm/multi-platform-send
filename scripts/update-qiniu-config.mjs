#!/usr/bin/env node
/**
 * 更新七牛云配置为自定义域名
 */

import { createQiniuStorageService } from '../src/lib/services/qiniu-storage.js';
import { readFileSync, writeFileSync } from 'fs';

async function updateQiniuConfig() {
  console.log('🔧 正在检查七牛云配置...');

  // 检查当前的 .env 文件
  try {
    const envContent = readFileSync('.env', 'utf8');
    console.log('📋 当前 .env 文件内容：');
    console.log(envContent);
  } catch (error) {
    console.log('❌ 找不到 .env 文件');
  }

  console.log('\n📝 建议的配置更新：');
  console.log('=====================================');
  console.log('# 七牛云配置（使用自定义域名）');
  console.log('QINIU_ACCESS_KEY="your-access-key"');
  console.log('QINIU_SECRET_KEY="your-secret-key"');
  console.log('QINIU_BUCKET="你的bucket名称"');
  console.log('QINIU_DOMAIN="https://img.xxxx.vip"  # 改为你的自定义域名');
  console.log('QINIU_ZONE="Zone_as0"  # 新加坡节点');
  console.log('IMAGE_STORAGE_PROVIDER="qiniu"');
  console.log('=====================================');

  // 测试新的配置
  console.log('\n🧪 测试七牛云服务...');
  const qiniuService = createQiniuStorageService();

  if (!qiniuService) {
    console.error('❌ 七牛云服务初始化失败');
    console.log('请检查环境变量配置');
    return;
  }

  console.log('✅ 七牛云服务初始化成功');

  // 创建测试图片
  const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const testBlob = new Blob([testImageData], { type: 'image/png' });

  console.log('\n📤 正在测试上传...');

  try {
    const result = await qiniuService.uploadFile(testBlob, 'test-config.png');

    if (result.success) {
      console.log('✅ 上传成功！');
      console.log('📋 文件信息：');
      console.log('   - URL:', result.url);
      console.log('   - 文件名:', result.fileName);
      console.log('   - 路径:', result.uploadPath);

      // 测试访问
      console.log('\n🔍 正在测试访问...');
      try {
        const response = await fetch(result.url, {
          method: 'HEAD',
          timeout: 10000
        });

        if (response.ok) {
          console.log('✅ 文件可以正常访问！');
          console.log('🌐 访问URL:', result.url);
        } else {
          console.log('❌ 文件无法访问，状态码:', response.status);
          console.log('💡 可能原因：CNAME配置未生效或域名绑定有问题');
        }
      } catch (accessError) {
        console.log('❌ 访问测试失败:', accessError.message);
        console.log('💡 建议等待DNS解析生效后再测试');
      }
    } else {
      console.log('❌ 上传失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  console.log('\n💡 使用提示：');
  console.log('1. 修改DNS配置，去掉CNAME记录值末尾的点');
  console.log('2. 等待DNS解析生效（通常需要几分钟到几小时）');
  console.log('3. 更新 .env 文件中的 QINIU_DOMAIN 为你的自定义域名');
  console.log('4. 重启开发服务器: npm run dev');
}

updateQiniuConfig();