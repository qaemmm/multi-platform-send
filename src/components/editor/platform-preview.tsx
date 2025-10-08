'use client';

import { useState, useEffect, useCallback } from 'react';
import { Platform } from '@/types/platform-settings';
import { Smartphone, Monitor, Palette, Loader2, ExternalLink, Settings, Chrome, Copy } from 'lucide-react';
import { PublishSettings } from './publish-settings';
import { useUserPlan } from '@/lib/subscription/hooks/useUserPlan';
import { PlatformGuard, StyleGuard } from '@/lib/subscription/components/FeatureGuard';
import { UpgradePrompt } from '@/lib/subscription/components/UpgradePrompt';
import { useExtensionDetector } from '@/hooks/useExtensionDetector';
import { Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlatformPreviewProps {
  title: string;
  content: string;
}

export function PlatformPreview({ title, content }: PlatformPreviewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('wechat');
  const [selectedStyle, setSelectedStyle] = useState<'default' | 'tech' | 'minimal'>('default');
  const [previewHtml, setPreviewHtml] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [appliedSettings, setAppliedSettings] = useState<any>(null);
  const [finalContent, setFinalContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // 添加订阅信息和插件检测
  const { hasFeature, checkFeatureAccess } = useUserPlan();
  const { isInstalled, isChecking, resetDetection } = useExtensionDetector();
  const router = useRouter();

  // 平台配置
  const platforms = [
    {
      id: 'wechat' as Platform,
      name: '公众号',
      icon: '📱',
      color: 'bg-green-500',
      description: '微信公众号文章'
    },
    {
      id: 'zhihu' as Platform,
      name: '知乎',
      icon: '🔵',
      color: 'bg-blue-500',
      description: '知乎专栏文章'
    },
    {
      id: 'juejin' as Platform,
      name: '掘金',
      icon: '⚡',
      color: 'bg-cyan-500',
      description: '掘金技术文章'
    },
    {
      id: 'zsxq' as Platform,
      name: '知识星球',
      icon: '🌟',
      color: 'bg-yellow-500',
      description: '知识星球文章和主题'
    },
    {
      id: 'csdn' as Platform,
      name: 'CSDN',
      icon: '🅲',
      color: 'bg-red-500',
      description: 'CSDN 博客文章'
    },
    {
      id: 'xiaohongshu' as Platform,
      name: '小红书',
      icon: '🍓',
      color: 'bg-rose-500',
      description: '小红书图文笔记'
    }
  ];

  // 应用发布设置到内容
  const applySettingsToContent = useCallback((baseContent: string, settings: any) => {
    if (!settings) return baseContent;

    let fullContent = baseContent;

    // 添加开头内容
    if (settings.headerContent) {
      fullContent = settings.headerContent + '\n\n' + fullContent;
    }

    // 添加结尾内容
    if (settings.footerContent) {
      fullContent = fullContent + '\n\n' + settings.footerContent;
    }

    return fullContent;
  }, []);

  // 更新最终内容
  useEffect(() => {
    const newFinalContent = applySettingsToContent(content, appliedSettings);
    setFinalContent(newFinalContent);
  }, [content, appliedSettings, applySettingsToContent]);

  // 转换预览
  const handlePreview = useCallback(async (platform: Platform, style: string) => {
    const contentToPreview = finalContent || content;

    if (!contentToPreview.trim()) {
      setPreviewHtml('');
      return;
    }

    setIsConverting(true);
    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentToPreview,
          platform,
          style,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPreviewHtml(data.data.html);
      } else {
        console.error('转换失败:', data.error);
      }
    } catch (error) {
      console.error('转换错误:', error);
    } finally {
      setIsConverting(false);
    }
  }, [finalContent, content]);

  // 自动预览
  useEffect(() => {
    const timer = setTimeout(() => {
      handlePreview(selectedPlatform, selectedStyle);
    }, 500);

    return () => clearTimeout(timer);
  }, [finalContent, selectedPlatform, selectedStyle, handlePreview]);

  // 平台切换时立即预览
  const handlePlatformChange = useCallback((platform: Platform) => {
    setSelectedPlatform(platform);
    handlePreview(platform, selectedStyle);
  }, [selectedStyle, handlePreview]);

  // 样式切换时立即预览
  const handleStyleChange = useCallback((style: string) => {
    setSelectedStyle(style as any);
    handlePreview(selectedPlatform, style);
  }, [selectedPlatform, handlePreview]);

  // 获取平台发布URL
  const getPlatformUrl = (platform: Platform) => {
    switch (platform) {
      case 'wechat':
        return 'https://mp.weixin.qq.com/';
      case 'zhihu':
        return 'https://zhuanlan.zhihu.com/write';
      case 'juejin':
        return 'https://juejin.cn/editor/drafts/new?v=2';
      case 'zsxq':
        return 'https://wx.zsxq.com/';
      case 'csdn':
        return 'https://mp.csdn.net/mp_blog/creation/editor';
      case 'xiaohongshu':
        return 'https://creator.xiaohongshu.com/publish/publish?from=tab_switch';
      default:
        return '';
    }
  };

  // 处理发布
  const handlePublish = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    // 如果插件未安装，引导用户安装
    if (!isInstalled) {
      router.push('/extension');
      return;
    }

    setIsPublishing(true);

    try {
      const contentToPublish = finalContent || content;
      const platformUrl = getPlatformUrl(selectedPlatform);

      // 准备要复制的内容
      let contentToCopy = '';

      // 添加标题
      if (title) {
        contentToCopy += `# ${title}\n\n`;
      }

      // 添加内容（优先使用Markdown格式）
      contentToCopy += contentToPublish;

      // 添加发布预设的开头和结尾内容
      if (appliedSettings) {
        if (appliedSettings.headerContent) {
          contentToCopy = appliedSettings.headerContent + '\n\n' + contentToCopy;
        }
        if (appliedSettings.footerContent) {
          contentToCopy += '\n\n' + appliedSettings.footerContent;
        }
      }

      // 复制到剪贴板并打开平台页面
      try {
        await navigator.clipboard.writeText(contentToCopy);
        if (typeof window !== 'undefined') {
          window.open(platformUrl, '_blank');
        }
      } catch (error) {
        console.error('复制失败:', error);
        if (typeof window !== 'undefined') {
          window.open(platformUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('发布失败:', error);
    } finally {
      setIsPublishing(false);
    }
  }, [selectedPlatform, title, content, finalContent, appliedSettings, isInstalled, router]);
  return (
    <div className="flex flex-col h-full">
      {/* 预览控制栏 */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-700 flex items-center">
            {selectedPlatform === 'wechat' ? (
              <Smartphone className="h-4 w-4 mr-2" />
            ) : (
              <Monitor className="h-4 w-4 mr-2" />
            )}
            预览
          </h3>
          {isConverting && (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
              转换中...
            </div>
          )}
        </div>

        {/* 平台选择器 */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-gray-700">发布平台:</span>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {platforms.map((platform) => {
              const platformFeatureId = `${platform.id}-platform`;
              const hasAccess = hasFeature(platformFeatureId);
              const accessResult = checkFeatureAccess(platformFeatureId);

              return (
                <div key={platform.id} className="relative">
                  <button
                    onClick={() => {
                      if (hasAccess) {
                        handlePlatformChange(platform.id);
                      } else {
                        alert(accessResult.reason || '此平台需要专业版权限');
                      }
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${selectedPlatform === platform.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : hasAccess
                        ? 'text-gray-600 hover:text-gray-900'
                        : 'text-gray-400 cursor-not-allowed opacity-60'
                      }`}
                    disabled={!hasAccess}
                    title={!hasAccess ? accessResult.reason : platform.description}
                  >
                    <span>{platform.icon}</span>
                    <span>{platform.name}</span>
                    {!hasAccess && platform.id !== 'wechat' && (
                      <span className="text-xs text-yellow-600 ml-1">💎</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 样式选择器和发布设置 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">样式:</span>
            </div>
            <select
              value={selectedStyle}
              onChange={(e) => {
                const newStyle = e.target.value;
                if (newStyle !== 'default') {
                  const styleAccess = checkFeatureAccess('advanced-styles');
                  if (!styleAccess.hasAccess) {
                    alert(styleAccess.reason || '高级样式需要专业版权限');
                    return;
                  }
                }
                handleStyleChange(newStyle);
              }}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="default">默认样式</option>
              <option value="tech" disabled={!hasFeature('advanced-styles')}>
                技术风格 {!hasFeature('advanced-styles') ? '💎' : ''}
              </option>
              <option value="minimal" disabled={!hasFeature('advanced-styles')}>
                简约风格 {!hasFeature('advanced-styles') ? '💎' : ''}
              </option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            {/* 发布设置 */}
            {hasFeature('publish-presets') ? (
              <PublishSettings
                platform={selectedPlatform}
                onApplySettings={(settings) => {
                  console.log('应用发布设置:', settings);
                  setAppliedSettings(settings);
                  // 立即重新预览
                  setTimeout(() => {
                    handlePreview(selectedPlatform, selectedStyle);
                  }, 100);
                }}
              />
            ) : (
              <button
                onClick={() => {
                  alert('发布设置功能仅限专业版用户使用，请升级后体验完整功能');
                }}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-200 rounded-md text-sm font-medium bg-gray-50 text-gray-400 cursor-not-allowed transition-colors hover:bg-gray-100"
              >
                <Settings className="h-4 w-4" />
                <span>发布设置</span>
                <Crown className="h-3 w-3 text-amber-500" />
              </button>
            )}

            {/* 去发布按钮 */}
            {isChecking ? (
              <button
                disabled
                className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>检测中...</span>
              </button>
            ) : !isInstalled ? (
              <button
                onClick={() => router.push('/extension')}
                className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300"
                title="需要先安装插件才能发布"
              >
                <Chrome className="h-4 w-4" />
                <span>安装插件</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={isPublishing || !title.trim() || !content.trim()}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isPublishing || !title.trim() || !content.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                  }`}
                title={`复制内容并打开${platforms.find(p => p.id === selectedPlatform)?.name}`}
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span>{isPublishing ? '准备中...' : '去平台发布'}</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* 显示当前应用的设置 */}
        {appliedSettings && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="text-xs text-green-700 font-medium">
              ✅ 已应用设置: {appliedSettings.name} ({appliedSettings.platform === 'wechat' ? '微信公众号' : appliedSettings.platform})
            </div>
            {appliedSettings.headerContent && (
              <div className="text-xs text-gray-600 mt-1">
                📝 包含开头内容
              </div>
            )}
            {appliedSettings.footerContent && (
              <div className="text-xs text-gray-600 mt-1">
                📝 包含结尾内容
              </div>
            )}
          </div>
        )}
      </div>

      {/* 预览内容 */}
      <div className="flex-1 overflow-auto flex flex-col">
        {isConverting || !content ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              {isConverting ? (
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">转换中...</span>
                </div>
              ) : (
                <div className="space-y-2 text-gray-400">
                  <div className="text-2xl">📝</div>
                  <div className="text-sm">开始输入内容以查看预览</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              {selectedPlatform === 'wechat' && <WechatPreview title={title} content={previewHtml} />}
              {selectedPlatform === 'zhihu' && <ZhihuPreview title={title} content={previewHtml} />}
              {selectedPlatform === 'juejin' && <JuejinPreview title={title} content={previewHtml} />}
              {selectedPlatform === 'csdn' && <CsdnPreview title={title} content={previewHtml} />}
              {selectedPlatform === 'xiaohongshu' && <XiaohongshuPreview title={title} content={previewHtml} />}
              {selectedPlatform === 'zsxq' && <ZsxqPreview title={title} content={previewHtml} />}
            </div>

            {/* 升级提示区域 */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              {/* 平台权限提示 */}
              {selectedPlatform !== 'wechat' && !hasFeature(`${selectedPlatform}-platform`) && (
                <div className="mb-3">
                  <UpgradePrompt scenario="platform-locked" style="inline" />
                </div>
              )}

              {/* 样式权限提示 */}
              {selectedStyle !== 'default' && !hasFeature('advanced-styles') && (
                <div className="mb-3">
                  <UpgradePrompt scenario="style-locked" style="inline" />
                </div>
              )}

              {/* 发布预设提示 */}
              {selectedPlatform !== 'wechat' && !hasFeature('publish-presets') && !appliedSettings && (
                <div className="mb-3">
                  <UpgradePrompt scenario="preset-locked" style="inline" />
                </div>
              )}

              {/* 如果没有任何限制，显示一般升级提示 */}
              {selectedPlatform === 'wechat' && selectedStyle === 'default' && (
                <UpgradePrompt scenario="dashboard-upgrade" style="inline" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 微信公众号预览
function WechatPreview({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-6 flex justify-center items-center min-h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* iPhone 样机 */}
      <div className="relative">
        <div className="w-[390px] h-[844px] bg-black rounded-[60px] p-2 shadow-2xl">
          <div className="w-full h-full bg-white rounded-[48px] overflow-hidden flex flex-col relative">
            {/* 动态岛 */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-black rounded-full z-10"></div>

            {/* 状态栏 */}
            <div className="h-12 bg-white flex items-center justify-between px-6 pt-4">
              <div className="text-sm font-semibold text-black">9:41</div>
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-1 h-3 bg-black rounded-full"></div>
                  <div className="w-1 h-4 bg-black rounded-full"></div>
                  <div className="w-1 h-5 bg-black rounded-full"></div>
                  <div className="w-1 h-6 bg-black rounded-full"></div>
                </div>
                <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.166 4.999c5.208-5.208 13.651-5.208 18.859 0a.833.833 0 1 1-1.178 1.178c-4.375-4.375-11.471-4.375-15.846 0a.833.833 0 0 1-1.178-1.178z" />
                  <path d="M5.01 7.844c3.125-3.125 8.195-3.125 11.32 0a.833.833 0 1 1-1.178 1.178c-2.292-2.292-6.014-2.292-8.306 0a.833.833 0 0 1-1.178-1.178z" />
                  <path d="M7.854 10.688c1.042-1.042 2.734-1.042 3.776 0a.833.833 0 1 1-1.178 1.178.833.833 0 0 0-1.178 0 .833.833 0 0 1-1.178-1.178z" />
                  <circle cx="10" cy="15" r="1.5" />
                </svg>
                <div className="flex items-center">
                  <div className="w-6 h-3 border border-black rounded-sm relative">
                    <div className="w-4 h-1.5 bg-green-500 rounded-sm absolute top-0.5 left-0.5"></div>
                  </div>
                  <div className="w-0.5 h-1.5 bg-black rounded-r-sm ml-0.5"></div>
                </div>
              </div>
            </div>

            {/* 微信公众号头部 */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                字
              </div>
              <div className="ml-3 flex-1">
                <div className="text-base font-medium text-gray-900 break-words whitespace-normal">
                  {title || '字流'}
                </div>
                <div className="text-xs text-gray-500">刚刚</div>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
                </svg>
              </div>
            </div>

            {/* 文章内容区域 */}
            <div className="flex-1 overflow-auto bg-white">
              <div className="px-4 py-4">
                <div
                  className="wechat-content text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            </div>

            {/* 底部安全区域 */}
            <div className="h-8 bg-white"></div>
          </div>
        </div>

        {/* 手机标签 */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium">
          iPhone 14 Pro 预览
        </div>
      </div>
    </div>
  );
}

// 知乎预览
function ZhihuPreview({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
        {/* 知乎头部 */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              知
            </div>
            <div>
              <div className="font-medium text-gray-900">字流</div>
              <div className="text-sm text-gray-500">刚刚发布</div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title || '文章标题'}</h1>
        </div>

        {/* 文章内容 */}
        <div className="p-6">
          <div
            className="zhihu-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center space-x-6">
          <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2.61l.69.83L10 18h4m-7-10v2m0-2V9a2 2 0 012-2h2a2 2 0 012 2v1" />
            </svg>
            <span>赞同</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>评论</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>分享</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// 掘金预览
function JuejinPreview({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
        {/* 掘金头部 */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{title || '文章标题'}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                掘
              </div>
              <span>字流</span>
            </div>
            <span>·</span>
            <span>刚刚</span>
            <span>·</span>
            <span>阅读 1</span>
          </div>
        </div>

        {/* 文章内容 */}
        <div className="p-6">
          <div
            className="juejin-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 text-gray-500 hover:text-red-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>点赞</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>评论</span>
            </button>
          </div>
          <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>分享</span>
          </button>
        </div>
      </div>
    </div>
  );
}


// CSDN 预览
function CsdnPreview({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* CSDN 顶部品牌栏 */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center font-bold">C</div>
            <div className="font-semibold tracking-wide">CSDN · 技术社区</div>
          </div>
          <div className="text-sm text-white/80">预览</div>
        </div>

        {/* 标题与作者信息 */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">{title || '文章标题'}</h1>
          <div className="flex items-center text-sm text-gray-500 space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">字</div>
              <span>字流</span>
            </div>
            <span>·</span>
            <span>刚刚</span>
            <span>·</span>
            <span>阅读 1</span>
          </div>
        </div>

        {/* 文章内容 */}
        <div className="p-6">
          <div
            className="csdn-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* 底部交互条 */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-6">
            <button className="flex items-center space-x-2 text-gray-600 hover:text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>点赞</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>评论</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684z" />
              </svg>
              <span>分享</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// 知识星球预览
function ZsxqPreview({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
        {/* 知识星球头部 */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
              星
            </div>
            <div>
              <div className="font-medium text-gray-900">字流</div>
              <div className="text-sm text-gray-500">刚刚发布</div>
            </div>
          </div>
          {title && <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>}
        </div>

        {/* 文章内容 */}
        <div className="p-6">
          <div
            className="zsxq-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center space-x-6">
          <button className="flex items-center space-x-2 text-gray-500 hover:text-yellow-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2.61l.69.83L10 18h4m-7-10v2m0-2V9a2 2 0 012-2h2a2 2 0 012 2v1" />
            </svg>
            <span>点赞</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-500 hover:text-yellow-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>评论</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-500 hover:text-yellow-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>分享</span>
          </button>
        </div>
      </div>
    </div>
  );
}


// 小红书预览
function XiaohongshuPreview({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-6 bg-rose-50 min-h-full">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-rose-100 overflow-hidden">
        {/* 顶部品牌条 */}
        <div className="bg-rose-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center font-bold">R</div>
            <div className="font-semibold tracking-wide">小红书 · 创作平台</div>
          </div>
          <div className="text-sm text-white/80">预览</div>
        </div>
        {/* 标题 */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{title || '笔记标题'}</h1>
          <div className="text-xs text-gray-400">图文笔记</div>
        </div>
        {/* 正文 */}
        <div className="p-6">
          <div className="xhs-content prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>
    </div>
  );
}
