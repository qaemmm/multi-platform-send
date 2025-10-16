'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { WechatGuideDialog } from './wechat-guide-dialog';

interface CustomerSupportButtonProps {
  className?: string;
}

export function CustomerSupportButton({ 
  className = ''
}: CustomerSupportButtonProps) {
  const [showWechatGuide, setShowWechatGuide] = useState(false);

  const handleClick = () => {
    setShowWechatGuide(true);
  };

  return (
    <>
      <div className={`fixed bottom-6 right-6 z-40 group ${className}`}>
        <Button
          onClick={handleClick}
          className="h-16 w-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
          size="lg"
        >
          {/* 微信图标背景 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <MessageCircle className="h-7 w-7 text-white group-hover:scale-110 transition-transform duration-300" />
          </div>
          
          {/* 小红点提示 */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-white text-xs font-bold">?</span>
          </div>
          
          {/* 底部文字标签 */}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-90">
            客服
          </div>
        </Button>
        
        {/* 悬浮提示 */}
        <div className="absolute bottom-20 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            💬 联系客服获取帮助
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
        
        {/* 功能说明 */}
        <div className="absolute -top-2 -left-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap border">
            问题反馈・用户群・兑换码
          </div>
        </div>
      </div>

      <WechatGuideDialog
        isOpen={showWechatGuide}
        onClose={() => setShowWechatGuide(false)}
        onProceedToRedeem={() => setShowWechatGuide(false)}
        title="联系客服"
        description="扫描微信二维码联系客服，获取帮助、问题反馈或加入用户群"
      />
    </>
  );
}

