import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, redeemCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// 管理员邮箱列表（从环境变量获取）
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

// 生成兑换码
function generateRedeemCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) result += '-';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 批量生成兑换码
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    // 检查管理员权限
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const body = await request.json();
    const { type, count = 1, note = '' } = body;

    if (!type || !['monthly', 'yearly'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: '兑换码类型无效',
      }, { status: 400 });
    }

    if (count < 1 || count > 100) {
      return NextResponse.json({
        success: false,
        error: '生成数量必须在1-100之间',
      }, { status: 400 });
    }

    // 根据类型设置时长
    const duration = type === 'monthly' ? 1 : 12;

    // 批量生成兑换码
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = generateRedeemCode();
      codes.push({
        id: createId(),
        code,
        type,
        duration,
        createdBy: session.user.email,
        note: note || `${type === 'monthly' ? '月卡' : '年卡'} - 批次${Date.now()}`,
      });
    }

    // 插入数据库
    await db.insert(redeemCodes).values(codes);

    return NextResponse.json({
      success: true,
      data: codes,
      message: `成功生成 ${count} 个${type === 'monthly' ? '月卡' : '年卡'}兑换码`,
    });
  } catch (error) {
    console.error('生成兑换码失败:', error);
    return NextResponse.json({
      success: false,
      error: '生成兑换码失败',
    }, { status: 500 });
  }
}

// 获取兑换码列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    // 检查管理员权限
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({
        success: false,
        error: '权限不足',
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // 'used' | 'unused' | null

    // 构建查询条件
    let whereCondition;
    if (status === 'used') {
      whereCondition = eq(redeemCodes.isUsed, true);
    } else if (status === 'unused') {
      whereCondition = eq(redeemCodes.isUsed, false);
    }

    // 获取兑换码列表
    const codes = await db.query.redeemCodes.findMany({
      where: whereCondition,
      orderBy: (codes, { desc }) => [desc(codes.createdAt)],
      limit,
      offset: (page - 1) * limit,
    });

    // 手动关联用户信息
    const codesWithUsers = await Promise.all(
      codes.map(async (code) => {
        if (code.usedBy) {
          const user = await db.query.users.findFirst({
            where: eq(users.id, code.usedBy),
            columns: {
              id: true,
              name: true,
              email: true,
            }
          });
          return {
            ...code,
            usedByUser: user
          };
        }
        return code;
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        codes: codesWithUsers,
        pagination: {
          page,
          limit,
          total: codesWithUsers.length, // 简化版本，实际应该查询总数
        }
      },
    });
  } catch (error) {
    console.error('获取兑换码列表失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取兑换码列表失败',
    }, { status: 500 });
  }
}