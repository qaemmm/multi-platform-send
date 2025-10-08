/**
 * 测试 Cloudflare R2 图片上传功能
 * 使用方法: node scripts/test-r2-upload.js
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config();

console.log('🔧 开始测试 Cloudflare R2 配置...\n');

// 检查环境变量
const requiredEnvVars = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME'
];

console.log('📋 检查环境变量:');
let allEnvVarsPresent = true;
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  const masked = value ? `${value.substring(0, 8)}...` : '❌ 未设置';
  console.log(`  ${envVar}: ${masked}`);

  if (!value) {
    allEnvVarsPresent = false;
  }
}

if (!allEnvVarsPresent) {
  console.log('\n❌ 部分环境变量未设置，请检查 .env 文件');
  process.exit(1);
}

console.log('\n✅ 所有必需的环境变量已配置\n');

// 配置 R2 客户端
console.log('🔌 连接到 Cloudflare R2...');
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  tls: true,
});

console.log(`📦 Bucket: ${process.env.R2_BUCKET_NAME}`);
console.log(`🌐 Endpoint: https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\n`);

// 创建一个简单的测试图片 (1x1 像素的红色 PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const testImageBuffer = Buffer.from(testImageBase64, 'base64');

async function testUpload() {
  try {
    const testFileName = `test-${Date.now()}.png`;
    const testFilePath = `images/test/${testFileName}`;

    console.log('📤 开始上传测试图片...');
    console.log(`   文件名: ${testFileName}`);
    console.log(`   路径: ${testFilePath}`);
    console.log(`   大小: ${testImageBuffer.length} bytes\n`);

    // 上传测试
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: testFilePath,
      Body: testImageBuffer,
      ContentType: 'image/png',
      ContentLength: testImageBuffer.length,
      Metadata: {
        'test': 'true',
        'upload-time': new Date().toISOString(),
      },
    });

    const uploadResult = await r2Client.send(uploadCommand);
    console.log('✅ 上传成功!');
    console.log('   ETag:', uploadResult.ETag);

    // 构建公开访问 URL
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${testFilePath}`
      : `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/${testFilePath}`;

    console.log('\n🌐 公开访问 URL:');
    console.log(`   ${publicUrl}\n`);

    // 验证文件是否可以读取
    console.log('🔍 验证文件是否可读取...');
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: testFilePath,
    });

    const getResult = await r2Client.send(getCommand);
    console.log('✅ 文件可以成功读取');
    console.log('   Content-Type:', getResult.ContentType);
    console.log('   Content-Length:', getResult.ContentLength);

    console.log('\n🎉 测试成功! R2 配置正确，可以正常使用。\n');
    console.log('💡 提示:');
    console.log('   - 测试文件已上传到 R2');
    console.log('   - 你可以在浏览器中访问上面的 URL 查看图片');
    console.log('   - 如果无法访问，请检查 R2 bucket 的公共访问设置\n');

    return true;

  } catch (error) {
    console.error('\n❌ 测试失败!\n');
    console.error('错误详情:', error.message);

    if (error.$metadata) {
      console.error('HTTP状态码:', error.$metadata.httpStatusCode);
    }

    console.log('\n🔧 可能的解决方案:');
    console.log('1. 检查 R2_ACCESS_KEY_ID 和 R2_SECRET_ACCESS_KEY 是否正确');
    console.log('2. 确认 API Token 有 "Edit" 权限');
    console.log('3. 检查 R2_BUCKET_NAME 是否存在');
    console.log('4. 确认 R2_ACCOUNT_ID 正确\n');

    return false;
  }
}

// 运行测试
testUpload().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('未预期的错误:', error);
  process.exit(1);
});
