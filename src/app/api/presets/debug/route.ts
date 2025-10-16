import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { publishPresets, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// 调试预设数据的API端点
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    // 获取用户的所有预设
    const presets = await db.query.publishPresets.findMany({
      where: eq(publishPresets.userId, user.id),
      orderBy: (presets, { desc }) => [desc(presets.updatedAt)],
    });

    // 分析预设数据
    const analysis = {
      totalPresets: presets.length,
      platformDistribution: {} as Record<string, number>,
      presetsWithoutPlatform: 0,
      presetsWithContent: 0,
      zhihuPresets: [] as any[],
      allPresets: presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        platform: preset.platform,
        isDefault: preset.isDefault,
        hasHeaderContent: !!preset.headerContent,
        hasFooterContent: !!preset.footerContent,
        headerContentLength: preset.headerContent?.length || 0,
        footerContentLength: preset.footerContent?.length || 0,
      }))
    };

    // 统计平台分布
    presets.forEach(preset => {
      const platform = preset.platform || 'unknown';
      analysis.platformDistribution[platform] = (analysis.platformDistribution[platform] || 0) + 1;
      
      if (!preset.platform) {
        analysis.presetsWithoutPlatform++;
      }
      
      if (preset.headerContent || preset.footerContent) {
        analysis.presetsWithContent++;
      }
      
      if (preset.platform === 'zhihu') {
        analysis.zhihuPresets.push({
          id: preset.id,
          name: preset.name,
          isDefault: preset.isDefault,
          headerContent: preset.headerContent,
          footerContent: preset.footerContent,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('调试预设数据失败:', error);
    return NextResponse.json({
      success: false,
      error: '调试预设数据失败',
    }, { status: 500 });
  }
}

// 修复预设平台字段的API端点
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    const body = await request.json();
    const { presetId, newPlatform } = body;

    if (!presetId || !newPlatform) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数',
      }, { status: 400 });
    }

    // 验证平台值
    const validPlatforms = ['wechat', 'zhihu', 'juejin', 'zsxq'];
    if (!validPlatforms.includes(newPlatform)) {
      return NextResponse.json({
        success: false,
        error: '无效的平台值',
      }, { status: 400 });
    }

    // 更新预设的平台字段
    await db.update(publishPresets)
      .set({ 
        platform: newPlatform,
        updatedAt: new Date(),
      })
      .where(and(
        eq(publishPresets.id, presetId),
        eq(publishPresets.userId, user.id)
      ));

    return NextResponse.json({
      success: true,
      message: `预设平台已更新为 ${newPlatform}`,
    });
  } catch (error) {
    console.error('修复预设平台字段失败:', error);
    return NextResponse.json({
      success: false,
      error: '修复预设平台字段失败',
    }, { status: 500 });
  }
}
