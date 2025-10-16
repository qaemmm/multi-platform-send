import { NextRequest, NextResponse } from 'next/server';
import { createQiniuStorageService } from '@/lib/services/qiniu-storage';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, userEmail } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: '缺少图片URL参数' },
        { status: 400 }
      );
    }

    // 验证URL格式
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: '无效的图片URL格式' },
        { status: 400 }
      );
    }

    // 检查是否为支持的图片URL
    const supportedDomains = [
      'feishu.cn',
      'larksuite.com',
      'bytedance.net',
      'mmbiz.qpic.cn', // 微信图片
      'qpic.cn',
      'sinaimg.cn',
      'imgur.com',
      'github.com',
      'githubusercontent.com'
    ];

    const isSupported = supportedDomains.some(domain =>
      url.hostname.includes(domain)
    );

    if (!isSupported && !url.protocol.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: '不支持的图片来源域名' },
        { status: 400 }
      );
    }

    console.log('📤 开始下载并上传图片:', imageUrl);

    // 创建七牛云服务实例
    const qiniuService = createQiniuStorageService();
    if (!qiniuService) {
      return NextResponse.json(
        { success: false, error: '七牛云服务未配置' },
        { status: 500 }
      );
    }

    // 下载图片
    console.log('📥 下载图片中...');
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': url.origin,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      // 设置超时
      signal: AbortSignal.timeout(30000) // 30秒超时
    });

    if (!response.ok) {
      console.error('❌ 图片下载失败:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: `图片下载失败: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    // 检查内容类型
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'URL不是有效的图片资源' },
        { status: 400 }
      );
    }

    // 检查文件大小（限制10MB）
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '图片文件过大，最大支持10MB' },
        { status: 400 }
      );
    }

    const blob = await response.blob();
    console.log('✅ 图片下载完成，大小:', blob.size, 'bytes');

    // 生成文件名
    const urlPath = url.pathname;
    const fileName = urlPath.split('/').pop() || 'image.jpg';
    const cleanFileName = fileName.split('?')[0] || 'image.jpg';

    // 确保有文件扩展名
    const finalFileName = cleanFileName.includes('.') ? cleanFileName : `${cleanFileName}.jpg`;

    console.log('📤 上传到七牛云中...');

    // 上传到七牛云
    const uploadResult = await qiniuService.uploadFile(blob, finalFileName);

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
    console.error('❌ 图片上传API异常:', error);

    // 处理超时错误
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: '图片下载超时' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 支持OPTIONS请求（CORS预检）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}