'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Gift, Sparkles, X } from 'lucide-react';
import { UPGRADE_PROMPTS, PRICING_CONFIG } from '../config/features';
import { useUserPlan } from '../hooks/useUserPlan';
import { RedeemCodeDialog } from '@/components/ui/redeem-code-dialog';
import { WechatGuideDialog } from '@/components/ui/wechat-guide-dialog';

interface UpgradePromptProps {
  scenario: keyof typeof UPGRADE_PROMPTS;
  style?: 'card' | 'modal' | 'inline' | 'tooltip';
  onClose?: () => void;
}

export function UpgradePrompt({ scenario, style: overrideStyle, onClose }: UpgradePromptProps) {
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [showWechatGuide, setShowWechatGuide] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const config = UPGRADE_PROMPTS[scenario];
  if (!config) return null;

  const displayStyle = overrideStyle || config.style;

  const { refreshPlan, refreshUsage } = useUserPlan();

  const handleRedeemSuccess = (_data: any) => {
    // 局部刷新用户订阅与用量，避免整页刷新
    refreshPlan?.();
    refreshUsage?.();
  };

  // 卡片样式
  if (displayStyle === 'card') {
    return (
      <>
        <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Crown className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">{config.title}</h3>
                </div>
                <p className="text-blue-700 mb-3">{config.description}</p>
                <div className="flex flex-wrap gap-2">
                  {config.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Button
                  onClick={() => setShowWechatGuide(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  {config.cta}
                </Button>
                <div className="text-center">
                  <div className="text-sm font-medium text-blue-900">¥19.9/月 或 ¥199/年</div>
                  <div className="text-xs text-blue-600">年付立省¥40</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <WechatGuideDialog
          isOpen={showWechatGuide}
          onClose={() => setShowWechatGuide(false)}
          onProceedToRedeem={() => {
            setShowWechatGuide(false);
            setShowRedeemDialog(true);
          }}
        />

        <RedeemCodeDialog
          isOpen={showRedeemDialog}
          onClose={() => setShowRedeemDialog(false)}
          onSuccess={handleRedeemSuccess}
        />
      </>
    );
  }

  // 模态框样式
  if (displayStyle === 'modal') {
    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Crown className="h-6 w-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900">{config.title}</h3>
                </div>
                {onClose && (
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <p className="text-gray-600 mb-4">{config.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="font-medium text-gray-900">月付版</div>
                  <div className="text-2xl font-bold text-blue-600">¥19.9</div>
                  <div className="text-sm text-gray-500">按月计费</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 text-center border border-yellow-200">
                  <div className="font-medium text-gray-900">年付版</div>
                  <div className="text-2xl font-bold text-orange-600">¥199</div>
                  <div className="text-sm text-orange-600">立省¥40</div>
                </div>
              </div>

              <Button
                onClick={() => setShowWechatGuide(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Gift className="h-4 w-4 mr-2" />
                联系微信获取兑换码
              </Button>
            </CardContent>
          </Card>
        </div>

        <WechatGuideDialog
          isOpen={showWechatGuide}
          onClose={() => setShowWechatGuide(false)}
          onProceedToRedeem={() => {
            setShowWechatGuide(false);
            setShowRedeemDialog(true);
          }}
        />

        <RedeemCodeDialog
          isOpen={showRedeemDialog}
          onClose={() => setShowRedeemDialog(false)}
          onSuccess={handleRedeemSuccess}
        />
      </>
    );
  }

  // 行内样式
  if (displayStyle === 'inline') {
    return (
      <>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">{config.title}</span>
            </div>
            <Button
              size="sm"
              onClick={() => setShowWechatGuide(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1"
            >
              升级
            </Button>
          </div>
          <p className="text-xs text-blue-700 mt-1">{config.description}</p>
        </div>

        <WechatGuideDialog
          isOpen={showWechatGuide}
          onClose={() => setShowWechatGuide(false)}
          onProceedToRedeem={() => {
            setShowWechatGuide(false);
            setShowRedeemDialog(true);
          }}
        />

        <RedeemCodeDialog
          isOpen={showRedeemDialog}
          onClose={() => setShowRedeemDialog(false)}
          onSuccess={handleRedeemSuccess}
        />
      </>
    );
  }

  // 工具提示样式
  return (
    <>
      <div className="relative group">
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
          <Crown className="h-2 w-2 text-white" />
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
          <div className="text-sm font-medium text-gray-900 mb-1">{config.title}</div>
          <div className="text-xs text-gray-600 mb-2">{config.description}</div>
          <Button
            size="sm"
            onClick={() => setShowWechatGuide(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-xs"
          >
            {config.cta}
          </Button>
        </div>
      </div>

      <WechatGuideDialog
        isOpen={showWechatGuide}
        onClose={() => setShowWechatGuide(false)}
        onProceedToRedeem={() => {
          setShowWechatGuide(false);
          setShowRedeemDialog(true);
        }}
      />

      <RedeemCodeDialog
        isOpen={showRedeemDialog}
        onClose={() => setShowRedeemDialog(false)}
        onSuccess={handleRedeemSuccess}
      />
    </>
  );
}