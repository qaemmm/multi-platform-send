'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useExtensionDetector } from '@/hooks/useExtensionDetector';
import { 
  Loader2, 
  Chrome, 
  ExternalLink, 
  CheckCircle2,
  AlertTriangle,
  Rocket
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SmartPublishButtonProps {
  article: {
    title: string;
    content: string;
  };
  platform: 'wechat' | 'zhihu' | 'juejin' | 'zsxq';
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
}

const PLATFORM_CONFIG = {
  wechat: {
    name: '微信公众号',
    emoji: '📱',
    color: 'bg-green-600 hover:bg-green-700',
    url: 'https://mp.weixin.qq.com'
  },
  zhihu: {
    name: '知乎',
    emoji: '🔵', 
    color: 'bg-blue-600 hover:bg-blue-700',
    url: 'https://zhuanlan.zhihu.com/write'
  },
  juejin: {
    name: '掘金',
    emoji: '⚡',
    color: 'bg-blue-500 hover:bg-blue-600',
    url: 'https://juejin.cn/editor/drafts/new'
  },
  zsxq: {
    name: '知识星球',
    emoji: '🌟',
    color: 'bg-yellow-500 hover:bg-yellow-600',
    url: 'https://wx.zsxq.com'
  }
};

export function SmartPublishButton({ 
  article, 
  platform, 
  variant = 'default',
  size = 'default' 
}: SmartPublishButtonProps) {
  const router = useRouter();
  const { isInstalled, isChecking, publishToExtension } = useExtensionDetector();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const platformInfo = PLATFORM_CONFIG[platform];

  // 发布到插件
  const handlePublishWithExtension = async () => {
    if (!article.title.trim() || !article.content.trim()) {
      setPublishResult({
        type: 'error',
        message: '请先填写标题和内容'
      });
      setTimeout(() => setPublishResult({ type: null, message: '' }), 3000);
      return;
    }

    setIsPublishing(true);
    setPublishResult({ type: null, message: '' });

    try {
      await publishToExtension({
        title: article.title,
        content: article.content,
        platform
      });

      setPublishResult({
        type: 'success',
        message: `成功发布到${platformInfo.name}！`
      });
      setTimeout(() => setPublishResult({ type: null, message: '' }), 5000);
    } catch (error) {
      console.error('发布失败:', error);
      setPublishResult({
        type: 'error',
        message: error instanceof Error ? error.message : '发布失败，请重试'
      });
      setTimeout(() => setPublishResult({ type: null, message: '' }), 5000);
    } finally {
      setIsPublishing(false);
    }
  };

  // 跳转到插件下载页面
  const handleInstallExtension = () => {
    router.push('/extension');
  };

  // 打开平台页面（备用方案）
  const handleOpenPlatform = () => {
    window.open(platformInfo.url, '_blank');
  };

  // 检查状态时显示检测按钮
  if (isChecking) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className="w-full"
      >
        <Loader2 className="mr-2 animate-spin" size={16} />
        检测插件中...
      </Button>
    );
  }

  // 插件已安装 - 显示智能发布按钮
  if (isInstalled) {
    return (
      <div className="w-full">
        <Button
          variant={variant}
          size={size}
          className={`w-full ${variant === 'default' ? platformInfo.color : ''}`}
          onClick={handlePublishWithExtension}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={16} />
              发布中...
            </>
          ) : (
            <>
              <Rocket className="mr-2" size={16} />
              {platformInfo.emoji} 发布到{platformInfo.name}
            </>
          )}
        </Button>

        {/* 发布结果提示 */}
        {publishResult.type && (
          <div className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${
            publishResult.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {publishResult.type === 'success' ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            {publishResult.message}
          </div>
        )}
      </div>
    );
  }

  // 插件未安装 - 显示安装引导按钮
  return (
    <div className="w-full space-y-2">
      <Button
        variant="outline"
        size={size}
        className="w-full border-dashed border-2 hover:border-blue-300"
        onClick={handleInstallExtension}
      >
        <Chrome className="mr-2" size={16} />
        安装插件后一键发布
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs"
        onClick={handleOpenPlatform}
      >
        <ExternalLink className="mr-1" size={12} />
        或手动打开{platformInfo.name}
      </Button>
    </div>
  );
}