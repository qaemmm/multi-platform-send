import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// 请求验证schema
const publishSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  platform: z.enum(['wechat', 'zhihu', 'juejin', 'zsxq']),
  settings: z.object({
    id: z.string(),
    name: z.string(),
    platform: z.string(),
    isDefault: z.boolean(),
    authorName: z.string().optional(),
    headerContent: z.string().optional(),
    footerContent: z.string().optional(),
    platformConfig: z.any().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: '未授权访问',
      }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, platform, settings } = publishSchema.parse(body);

    // 应用设置到内容
    let finalContent = content;
    
    // 添加开头内容
    if (settings.headerContent) {
      finalContent = settings.headerContent + '\n\n' + finalContent;
    }

    // 添加结尾内容
    if (settings.footerContent) {
      finalContent = finalContent + '\n\n' + settings.footerContent;
    }

    // 根据平台执行不同的发布逻辑
    let publishResult;
    
    switch (platform) {
      case 'zsxq':
        publishResult = await publishToZsxq(title, finalContent, settings);
        break;
      case 'wechat':
        publishResult = await publishToWechat(title, finalContent, settings);
        break;
      case 'zhihu':
        publishResult = await publishToZhihu(title, finalContent, settings);
        break;
      case 'juejin':
        publishResult = await publishToJuejin(title, finalContent, settings);
        break;
      default:
        throw new Error(`不支持的平台: ${platform}`);
    }

    return NextResponse.json({
      success: true,
      data: publishResult,
    });
  } catch (error) {
    console.error('Publish error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: error.issues?.[0]?.message || '参数错误',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '发布失败',
    }, { status: 500 });
  }
}

// 知识星球发布函数
async function publishToZsxq(title: string, content: string, settings: any) {
  const groupIds = settings.platformConfig?.groupIds || [];
  
  if (groupIds.length === 0) {
    throw new Error('请配置知识星球ID');
  }

  const results = [];
  
  for (const groupId of groupIds) {
    try {
      // 这里需要实现实际的知识星球API调用
      // 目前返回模拟结果
      const result = {
        groupId,
        success: true,
        url: `https://wx.zsxq.com/group/${groupId}`,
        message: '发布成功',
      };
      results.push(result);
    } catch (error) {
      results.push({
        groupId,
        success: false,
        error: error instanceof Error ? error.message : '发布失败',
      });
    }
  }

  return {
    platform: 'zsxq',
    results,
    totalCount: groupIds.length,
    successCount: results.filter(r => r.success).length,
  };
}

// 其他平台的发布函数（暂时返回模拟结果）
async function publishToWechat(title: string, content: string, settings: any) {
  // TODO: 实现微信公众号发布逻辑
  return {
    platform: 'wechat',
    success: true,
    message: '微信公众号发布功能开发中',
  };
}

async function publishToZhihu(title: string, content: string, settings: any) {
  // TODO: 实现知乎发布逻辑
  return {
    platform: 'zhihu',
    success: true,
    message: '知乎发布功能开发中',
  };
}

async function publishToJuejin(title: string, content: string, settings: any) {
  // TODO: 实现掘金发布逻辑
  return {
    platform: 'juejin',
    success: true,
    message: '掘金发布功能开发中',
  };
}

