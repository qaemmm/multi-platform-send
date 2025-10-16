import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, imageUsageStats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 检查认证
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user.length) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 获取当月图片使用量
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM格式
    const usageStats = await db
      .select()
      .from(imageUsageStats)
      .where(and(
        eq(imageUsageStats.userId, user[0].id),
        eq(imageUsageStats.month, currentMonth)
      ))
      .limit(1);

    const monthlyUsed = usageStats.length > 0 ? usageStats[0].usedCount : 0;

    return NextResponse.json({
      success: true,
      data: {
        monthlyUsed,
        month: currentMonth
      }
    });

  } catch (error) {
    console.error('获取图片使用量失败:', error);
    return NextResponse.json(
      { success: false, error: '获取使用量失败' },
      { status: 500 }
    );
  }
}