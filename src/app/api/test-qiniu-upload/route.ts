import { NextRequest, NextResponse } from 'next/server';
import { createQiniuStorageService } from '@/lib/services/qiniu-storage';

export async function POST() {
  try {
    console.log('🔧 开始测试七牛云上传...');

    // 创建七牛云服务实例
    const qiniuService = createQiniuStorageService();
    if (!qiniuService) {
      return NextResponse.json(
        { success: false, error: '七牛云服务未配置' },
        { status: 500 }
      );
    }

    // 创建测试图片数据 (1x1像素PNG)
    const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const testBlob = new Blob([testImageData], { type: 'image/png' });

    console.log('📤 上传测试图片到七牛云...');

    // 上传到七牛云
    const uploadResult = await qiniuService.uploadFile(testBlob, 'test-direct-upload.png');

    if (uploadResult.success) {
      console.log('✅ 七牛云上传成功:', uploadResult.url);

      return NextResponse.json({
        success: true,
        url: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        fileType: uploadResult.fileType,
        uploadPath: uploadResult.uploadPath,
        source: 'qiniu'
      });
    } else {
      console.error('❌ 七牛云上传失败:', uploadResult.error);
      return NextResponse.json(
        { success: false, error: `七牛云上传失败: ${uploadResult.error}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ 七牛云测试API异常:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}