import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 开发环境专用 - 获取用户订阅信息（绕过认证）
export async function GET(request: NextRequest) {
  try {
    // 开发环境专用 - 直接查询数据库
    const userEmail = '842123094@qq.com';

    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
      columns: {
        id: true,
        email: true,
        name: true,
        plan: true,
        planExpiredAt: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }

    // 计算专业版状态（以 schema 字段 planExpiredAt 为准）
    const expiredAt: Date | null = user.planExpiredAt ?? null;
    const isProPlan = user.plan === 'pro';
    const isExpired = isProPlan && !!expiredAt && expiredAt <= new Date();
    const isValidPro = isProPlan && !isExpired;

    return NextResponse.json({
      success: true,
      data: {
        plan: user.plan,
        planExpiredAt: expiredAt ? expiredAt.toISOString() : null,
        isPro: isValidPro,
        isExpired: isExpired
      },
    });
  } catch (error) {
    console.error('获取用户订阅信息失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取用户订阅信息失败',
    }, { status: 500 });
  }
}