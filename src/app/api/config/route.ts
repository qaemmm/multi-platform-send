import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 返回当前配置信息（用于测试）
  const config = {
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json({
    success: true,
    data: config
  });
}
