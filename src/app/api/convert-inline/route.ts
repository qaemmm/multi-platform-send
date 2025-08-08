import { NextRequest, NextResponse } from 'next/server';
import { convertToWechatInline, WECHAT_STYLES } from '@/lib/converter';
import { z } from 'zod';

// 请求验证schema
const convertSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
  platform: z.enum(['wechat']).default('wechat'),
  style: z.enum(['default', 'tech', 'minimal']).default('default'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, platform, style } = convertSchema.parse(body);

    if (platform === 'wechat') {
      const inlineHtml = convertToWechatInline(content, style as keyof typeof WECHAT_STYLES);
      const wordCount = content.replace(/\s/g, '').length;
      const readingTime = Math.ceil(wordCount / 300);

      return NextResponse.json({
        success: true,
        data: {
          inlineHtml,
          wordCount,
          readingTime,
          style: WECHAT_STYLES[style as keyof typeof WECHAT_STYLES].name,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: '暂不支持该平台',
    }, { status: 400 });
  } catch (error) {
    console.error('Convert inline error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
      error: error.issues?.[0]?.message || '参数错误',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: '转换失败',
    }, { status: 500 });
  }
}
