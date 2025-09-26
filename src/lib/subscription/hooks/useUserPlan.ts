'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';

export interface UserPlan {
  plan: 'free' | 'pro';
  planExpiredAt?: string;
  isLoading: boolean;
}

interface UserUsageStats {
  totalArticles: number;
  monthlyImagesUsed: number;
  usageLoading: boolean;
}

interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  upgradePrompt?: string;
}

interface UserPlanContextType extends UserPlan, UserUsageStats {
  refreshPlan: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  hasFeature: (featureId: string) => boolean;
  getFeatureLimit: (featureId: string) => number;
  checkFeatureAccess: (featureId: string) => FeatureAccessResult;
  canCreateArticle: () => { canCreate: boolean; reason?: string };
  isPro: boolean;
  isExpired: boolean;
  daysRemaining: number;
}

const UserPlanContext = createContext<UserPlanContextType | null>(null);

// Provider 组件
export function UserPlanProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [planData, setPlanData] = useState<UserPlan>({
    plan: 'free',
    isLoading: true
  });
  
  const [usageData, setUsageData] = useState<UserUsageStats>({
    totalArticles: 0,
    monthlyImagesUsed: 0,
    usageLoading: true
  });

  const refreshPlan = useCallback(async () => {
    if (!session?.user?.email) {
      setPlanData({ plan: 'free', isLoading: false });
      return;
    }

    try {
      const response = await fetch('/api/auth/user-plan');
      const data = await response.json();
      
      if (data.success) {
        setPlanData({
          ...data.data,
          isLoading: false
        });
      } else {
        setPlanData({ plan: 'free', isLoading: false });
      }
    } catch (error) {
      console.error('获取用户订阅信息失败:', error);
      setPlanData({ plan: 'free', isLoading: false });
    }
  }, [session?.user?.email]);

  const refreshUsage = useCallback(async () => {
    if (!session?.user?.email) {
      setUsageData({ totalArticles: 0, monthlyImagesUsed: 0, usageLoading: false });
      return;
    }

    try {
      // 并行获取文章数量和图片使用量
      const [articlesResponse, imagesResponse] = await Promise.all([
        fetch('/api/articles?page=1&limit=1'),
        fetch('/api/usage/images')
      ]);
      
      const [articlesData, imagesData] = await Promise.all([
        articlesResponse.json(),
        imagesResponse.json()
      ]);
      
      setUsageData({
        totalArticles: articlesData.success ? articlesData.data.total : 0,
        monthlyImagesUsed: imagesData.success ? imagesData.data.monthlyUsed : 0,
        usageLoading: false
      });
    } catch (error) {
      console.error('获取使用统计失败:', error);
      setUsageData({ totalArticles: 0, monthlyImagesUsed: 0, usageLoading: false });
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (session?.user?.email) {
      refreshPlan();
      refreshUsage();
    }
  }, [session?.user?.email]); // 只在session变化时触发，避免循环调用

  // 计算订阅状态
  const isPro = planData.plan === 'pro' && (!planData.planExpiredAt || new Date(planData.planExpiredAt) > new Date());
  const isExpired = Boolean(planData.plan === 'pro' && planData.planExpiredAt && new Date(planData.planExpiredAt) <= new Date());
  
  // 计算剩余天数
  const daysRemaining = planData.planExpiredAt 
    ? Math.max(0, Math.ceil((new Date(planData.planExpiredAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // 检查是否有某个功能权限
  const hasFeature = useCallback((featureId: string) => {
    const { FEATURES } = require('../config/features');
    const feature = FEATURES[featureId];
    
    if (!feature) return false;
    
    // 如果是专业版功能且用户不是专业版，返回false
    if (feature.plans.includes('pro') && !feature.plans.includes('free')) {
      return isPro;
    }
    
    return feature.plans.includes(planData.plan);
  }, [planData.plan, isPro]);

  // 获取功能限制数量
  const getFeatureLimit = useCallback((featureId: string) => {
    const { FEATURES } = require('../config/features');
    const feature = FEATURES[featureId];
    
    if (!feature || !feature.limits) return 0;
    
    return feature.limits[planData.plan] || 0;
  }, [planData.plan]);

  // 统一的功能权限检查
  const checkFeatureAccess = useCallback((featureId: string): FeatureAccessResult => {
    const { FEATURES, UPGRADE_PROMPTS } = require('../config/features');
    const feature = FEATURES[featureId];
    
    if (!feature) {
      return { hasAccess: false, reason: '功能不存在' };
    }

    // 如果已经是专业版，检查是否过期
    if (isPro) {
      return { hasAccess: true };
    }

    // 免费版用户检查权限
    if (feature.plans.includes('free')) {
      // 如果有使用限制，检查是否超限
      if (feature.limits && feature.limits.free) {
        const limit = feature.limits.free;
        if (limit > 0) {
          // 这里可以根据不同功能类型检查不同的使用量
          if (featureId === 'unlimited-articles') {
            if (usageData.totalArticles >= limit) {
              return {
                hasAccess: false,
                reason: `免费版最多只能创建 ${limit} 篇文章`,
                upgradePrompt: 'article-limit'
              };
            }
          }
          
          if (featureId === 'cloud-images') {
            if (usageData.monthlyImagesUsed >= limit) {
              return {
                hasAccess: false,
                reason: `当月图片使用量已达上限（${usageData.monthlyImagesUsed}/${limit}张）`,
                upgradePrompt: 'cloud-images-limit'
              };
            }
          }
        }
      }
      return { hasAccess: true };
    }

    // 专业版功能，免费版用户无权限
    const upgradePrompt = Object.keys(UPGRADE_PROMPTS).find(key => 
      UPGRADE_PROMPTS[key].features.includes(featureId)
    ) || 'default';

    return {
      hasAccess: false,
      reason: `此功能需要专业版权限`,
      upgradePrompt
    };
  }, [isPro, usageData.totalArticles]);

  // 检查是否可以创建文章
  const canCreateArticle = useCallback(() => {
    const accessResult = checkFeatureAccess('unlimited-articles');
    return {
      canCreate: accessResult.hasAccess,
      reason: accessResult.reason
    };
  }, [checkFeatureAccess]);

  const contextValue: UserPlanContextType = {
    ...planData,
    ...usageData,
    refreshPlan,
    refreshUsage,
    hasFeature,
    getFeatureLimit,
    checkFeatureAccess,
    canCreateArticle,
    isPro,
    isExpired,
    daysRemaining
  };

  return React.createElement(
    UserPlanContext.Provider,
    { value: contextValue },
    children
  );
}

// Hook
export function useUserPlan() {
  const context = useContext(UserPlanContext);
  if (!context) {
    throw new Error('useUserPlan must be used within UserPlanProvider');
  }
  return context;
}