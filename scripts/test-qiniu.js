/**
 * 七牛云存储服务测试脚本
 */
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testQiniuService() {
  try {
    // 动态导入 ES 模块
    const { createQiniuStorageService } = await import('../src/lib/services/qiniu-storage.js');

    console.log('🔧 正在测试七牛云存储服务...\n');

    // 检查环境变量
    console.log('📋 环境变量检查:');
    console.log('  QINIU_ACCESS_KEY:', process.env.QINIU_ACCESS_KEY ? '✅ 已设置' : '❌ 未设置');
    console.log('  QINIU_SECRET_KEY:', process.env.QINIU_SECRET_KEY ? '✅ 已设置' : '❌ 未设置');
    console.log('  QINIU_BUCKET:', process.env.QINIU_BUCKET ? '✅ 已设置' : '❌ 未设置');
    console.log('  QINIU_DOMAIN:', process.env.QINIU_DOMAIN ? '✅ 已设置' : '❌ 未设置');
    console.log('  QINIU_ZONE:', process.env.QINIU_ZONE || '默认: Zone_z0');
    console.log('');

    // 创建服务实例
    const qiniuService = createQiniuStorageService();

    if (!qiniuService) {
      console.log('❌ 七牛云服务创建失败，请检查配置');
      return;
    }

    console.log('✅ 七牛云服务创建成功\n');

    // 创建测试图片 (1x1 像素的透明 PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0B, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    // 创建 Blob
    const testBlob = new Blob([testImageBuffer], { type: 'image/png' });

    console.log('📤 开始上传测试图片...');
    const uploadResult = await qiniuService.uploadFile(testBlob, 'test-qiniu.png');

    if (uploadResult.success) {
      console.log('✅ 上传成功!');
      console.log('  文件名:', uploadResult.fileName);
      console.log('  文件大小:', uploadResult.fileSize, 'bytes');
      console.log('  访问链接:', uploadResult.url);
      console.log('  存储路径:', uploadResult.uploadPath);
      console.log('');

      // 测试文件信息获取
      console.log('📋 获取文件信息...');
      const fileInfo = await qiniuService.getFileInfo(uploadResult.uploadPath);

      if (fileInfo.success) {
        console.log('✅ 文件信息获取成功');
        console.log('  文件大小:', fileInfo.data.fsize, 'bytes');
        console.log('  文件类型:', fileInfo.data.mimeType);
        console.log('  上传时间:', new Date(fileInfo.data.putTime / 10000).toLocaleString());
      } else {
        console.log('❌ 获取文件信息失败:', fileInfo.error);
      }
      console.log('');

      // 测试删除文件
      console.log('🗑️ 删除测试文件...');
      const deleteResult = await qiniuService.deleteFile(uploadResult.uploadPath);

      if (deleteResult.success) {
        console.log('✅ 文件删除成功');
      } else {
        console.log('❌ 文件删除失败:', deleteResult.error);
      }

    } else {
      console.log('❌ 上传失败:', uploadResult.error);
    }

    console.log('\n🎉 七牛云存储服务测试完成');

  } catch (error) {
    console.error('💥 测试过程中出现错误:', error);
  }
}

// 运行测试
testQiniuService();