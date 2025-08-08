import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { publishPresets, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// 设置默认预设
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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

    // 检查预设是否存在
    const existingPreset = await db.query.publishPresets.findFirst({
      where: and(
        eq(publishPresets.id, id),
        eq(publishPresets.userId, user.id)
      ),
    });

    if (!existingPreset) {
      return NextResponse.json({
        success: false,
        error: '预设不存在',
      }, { status: 404 });
    }

    // 先取消所有预设的默认状态
    await db.update(publishPresets)
      .set({ isDefault: false })
      .where(eq(publishPresets.userId, user.id));

    // 设置当前预设为默认
    await db.update(publishPresets)
      .set({
        isDefault: true,
        updatedAt: new Date(),
      })
      .where(and(
        eq(publishPresets.id, id),
        eq(publishPresets.userId, user.id)
      ));

    return NextResponse.json({
      success: true,
      message: '默认预设设置成功',
    });
  } catch (error) {
    console.error('设置默认预设失败:', error);
    return NextResponse.json({
      success: false,
      error: '设置默认预设失败',
    }, { status: 500 });
  }
}
