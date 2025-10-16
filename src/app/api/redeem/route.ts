import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, redeemCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 兑换码使用
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code?.trim()) {
      return NextResponse.json({
        success: false,
        error: '请输入兑换码',
      }, { status: 400 });
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

    // 查找兑换码
    const redeemCode = await db.query.redeemCodes.findFirst({
      where: eq(redeemCodes.code, code.trim().toUpperCase()),
    });

    if (!redeemCode) {
      return NextResponse.json({
        success: false,
        error: '兑换码不存在或已失效',
      }, { status: 400 });
    }

    if (redeemCode.isUsed) {
      return NextResponse.json({
        success: false,
        error: '兑换码已被使用',
      }, { status: 400 });
    }

    // 计算新的过期时间
    const now = new Date();
    let newExpiredAt: Date;

    // 如果用户当前是专业版且未过期，从当前过期时间开始计算
    if (user.plan === 'pro' && user.planExpiredAt && new Date(user.planExpiredAt) > now) {
      newExpiredAt = new Date(user.planExpiredAt);
    } else {
      newExpiredAt = new Date(now);
    }

    // 根据兑换码类型添加时长
    newExpiredAt.setMonth(newExpiredAt.getMonth() + redeemCode.duration);

    // 开启事务
    await db.transaction(async (tx) => {
      // 更新用户订阅信息
      await tx.update(users)
        .set({
          plan: 'pro',
          planExpiredAt: newExpiredAt,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));

      // 标记兑换码为已使用
      await tx.update(redeemCodes)
        .set({
          isUsed: true,
          usedBy: user.id,
          usedAt: now,
        })
        .where(eq(redeemCodes.id, redeemCode.id));
    });

    return NextResponse.json({
      success: true,
      data: {
        plan: 'pro',
        planExpiredAt: newExpiredAt.toISOString(),
        duration: redeemCode.duration,
        type: redeemCode.type,
      },
      message: `恭喜！兑换成功，专业版有效期至 ${newExpiredAt.toLocaleDateString('zh-CN')}`,
    });
  } catch (error) {
    console.error('兑换码使用失败:', error);
    return NextResponse.json({
      success: false,
      error: '兑换失败，请稍后重试',
    }, { status: 500 });
  }
}