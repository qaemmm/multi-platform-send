import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, imageUsageStats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { FEATURES } from '../subscription/config/features';

interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

/**
 * 检查用户的功能访问权限
 */
async function checkUserFeatureAccess(
  userEmail: string, 
  featureId: string
): Promise<FeatureAccessResult> {
  try {
    // 获取功能配置
    const feature = FEATURES[featureId];
    if (!feature) {
      return { hasAccess: false, reason: '功能不存在' };
    }

    // 获取用户订阅信息
    const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (!user.length) {
      return { hasAccess: false, reason: '用户不存在' };
    }

    const userPlan = user[0].plan || 'free';
    const planExpiredAt = user[0].planExpiredAt;

    // 检查专业版是否过期
    const isPro = userPlan === 'pro' && (!planExpiredAt || new Date(planExpiredAt) > new Date());

    // 检查功能权限
    if (feature.plans.includes('free') || feature.plans.includes(userPlan)) {
      // 检查使用限制
      if (feature.limits) {
        const limit = isPro ? feature.limits.pro : feature.limits.free;
        if (limit && limit > 0) {
          // 检查特定功能的使用量
          if (featureId === 'cloud-images') {
            // 检查当月图片使用量
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM格式
            const usageStats = await db
              .select()
              .from(imageUsageStats)
              .where(and(
                eq(imageUsageStats.userId, user[0].id),
                eq(imageUsageStats.month, currentMonth)
              ))
              .limit(1);

            const usedCount = usageStats.length > 0 ? usageStats[0].usedCount : 0;
            
            if (usedCount >= limit) {
              return {
                hasAccess: false,
                reason: `当月图片使用量已达上限（${usedCount}/${limit}张）`,
                upgradeRequired: !isPro
              };
            }
          }
          
          if (featureId === 'unlimited-articles') {
            // 这里可以添加文章数量检查
            // 暂时跳过，保持现有逻辑
          }
        }
      }
      return { hasAccess: true };
    }

    // 如果功能不支持当前用户的订阅计划
    return {
      hasAccess: false,
      reason: '当前订阅计划无法使用此功能',
      upgradeRequired: !isPro
    };

  } catch (error) {
    console.error('检查用户功能权限失败:', error);
    return { hasAccess: false, reason: '系统错误' };
  }
}

/**
 * 订阅功能校验中间件
 */
export function withSubscription(featureId: string) {
  return async function(_request: NextRequest): Promise<NextResponse | null> {
    try {
      // 检查用户认证
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json(
          { success: false, error: '未登录', authRequired: true },
          { status: 401 }
        );
      }

      // 检查功能访问权限
      const accessResult = await checkUserFeatureAccess(session.user.email, featureId);
      
      if (!accessResult.hasAccess) {
        return NextResponse.json({
          success: false,
          error: accessResult.reason || '无权限访问',
          upgradeRequired: accessResult.upgradeRequired || false,
          featureId
        }, { status: 403 });
      }

      // 权限检查通过，返回null表示继续执行
      return null;

    } catch (error) {
      console.error('订阅中间件错误:', error);
      return NextResponse.json(
        { success: false, error: '系统错误' },
        { status: 500 }
      );
    }
  };
}

/**
 * 应用订阅中间件的辅助函数
 */
export async function applySubscriptionCheck(
  request: NextRequest, 
  featureId: string
): Promise<NextResponse | null> {
  const middleware = withSubscription(featureId);
  return await middleware(request);
}