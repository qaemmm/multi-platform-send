import { NextResponse } from 'next/server';
import { createQiniuStorageService } from '@/lib/services/qiniu-storage';

export async function GET() {
  try {
    // 检查环境变量
    const envCheck = {
      QINIU_ACCESS_KEY: process.env.QINIU_ACCESS_KEY ? '✅' : '❌',
      QINIU_SECRET_KEY: process.env.QINIU_SECRET_KEY ? '✅' : '❌',
      QINIU_BUCKET: process.env.QINIU_BUCKET ? '✅' : '❌',
      QINIU_DOMAIN: process.env.QINIU_DOMAIN ? '✅' : '❌',
      QINIU_ZONE: process.env.QINIU_ZONE ? '✅' : '❌',
      IMAGE_STORAGE_PROVIDER: process.env.IMAGE_STORAGE_PROVIDER || 'auto',
    };

    // 检查七牛云服务初始化
    let qiniuService = null;
    let qiniuStatus = '❌ 未初始化';

    try {
      qiniuService = createQiniuStorageService();
      if (qiniuService) {
        qiniuStatus = '✅ 初始化成功';
      } else {
        qiniuStatus = '❌ 初始化失败';
      }
    } catch (error) {
      qiniuStatus = `❌ 初始化错误: ${error instanceof Error ? error.message : '未知错误'}`;
    }

    return NextResponse.json({
      success: true,
      message: '健康检查通过',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      qiniu: {
        status: qiniuStatus,
        service: qiniuService ? '✅ 已创建' : '❌ 未创建'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}