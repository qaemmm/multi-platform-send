'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Copy, Check, X, Gift, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface WechatGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToRedeem: () => void;
  title?: string;
  description?: string;
}

export function WechatGuideDialog({ 
  isOpen, 
  onClose, 
  onProceedToRedeem,
  title = "获取专业版兑换码",
  description = "扫描微信二维码，联系客服获取兑换码，立即升级专业版"
}: WechatGuideDialogProps) {
  const [copied, setCopied] = useState(false);
  
  const wechatId = "mjcoding3";
  
  if (!isOpen) return null;

  const copyWechatId = async () => {
    try {
      await navigator.clipboard.writeText(wechatId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto bg-white">
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 flex-1 justify-center">
              <MessageCircle className="h-6 w-6 text-green-600" />
              <CardTitle className="text-xl font-bold text-gray-900">{title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-gray-600 text-sm">{description}</p>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* 二维码区域 */}
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-gray-50 rounded-2xl shadow-inner mb-4">
              <Image
                src="/wx.jpg"
                alt="微信二维码"
                width={192}
                height={192}
                className="w-48 h-48 rounded-xl border-2 border-green-200 object-cover"
                priority
              />
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-green-800 mb-1">✅ 扫码添加客服微信</p>
              <p className="text-xs text-green-700">立即获取专业版兑换码，解锁全部功能</p>
            </div>
          </div>

          {/* 微信号 */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">微信号</p>
                <p className="font-mono font-semibold text-gray-900">{wechatId}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyWechatId}
                className="ml-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-600" />
                    <span className="text-green-600">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 获取流程 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 获取步骤：</h4>
            <div className="space-y-2 text-xs text-blue-800">
              <div className="flex items-start space-x-2">
                <span className="inline-block w-4 h-4 bg-blue-200 text-blue-800 rounded-full text-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <span>扫描上方二维码或搜索微信号添加客服</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="inline-block w-4 h-4 bg-blue-200 text-blue-800 rounded-full text-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <span>联系客服说明需要兑换码（月卡¥19.9 / 年卡¥199）</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="inline-block w-4 h-4 bg-blue-200 text-blue-800 rounded-full text-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <span>获得12位兑换码后，点击下方按钮进行兑换</span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              稍后联系
            </Button>
            <Button
              onClick={onProceedToRedeem}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Gift className="h-4 w-4 mr-2" />
              已有兑换码
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* 底部提示 */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              🔒 安全提醒：请认准官方客服，谨防诈骗
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}