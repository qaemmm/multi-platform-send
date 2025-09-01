import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 获取用户订阅信息
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

    return NextResponse.json({
      success: true,
      data: {
        plan: user.plan,
        planExpiredAt: user.planExpiredAt?.toISOString(),
        isPro: user.plan === 'pro' && (!user.planExpiredAt || user.planExpiredAt > new Date()),
        isExpired: user.plan === 'pro' && user.planExpiredAt && user.planExpiredAt <= new Date(),
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