'use client';

import { useState, useEffect, useCallback } from 'react';

interface ExtensionInfo {
  version?: string;
  installed: boolean;
}

export function useExtensionDetector() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [extensionInfo, setExtensionInfo] = useState<ExtensionInfo | null>(null);

  const checkExtension = useCallback(() => {
    setIsChecking(true);
    console.log('🔍 检测字流插件...');

    // 发送检测消息到插件
    window.postMessage({
      type: 'ZILIU_EXTENSION_DETECT',
      source: 'ziliu-website',
      timestamp: Date.now()
    }, '*');

    // 设置超时，如果3秒内没有响应则认为未安装
    const timeout = setTimeout(() => {
      console.log('⏰ 插件检测超时，可能未安装');
      setIsInstalled(false);
      setExtensionInfo(null);
      setIsChecking(false);
    }, 3000);

    // 监听插件响应
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ZILIU_EXTENSION_RESPONSE') {
        console.log('✅ 检测到插件已安装:', event.data);
        clearTimeout(timeout);
        setIsInstalled(true);
        setExtensionInfo({
          version: event.data.version,
          installed: true
        });
        setIsChecking(false);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    // 延迟检测，确保页面完全加载
    const delayedCheck = setTimeout(() => {
      checkExtension();
    }, 1000);

    return () => clearTimeout(delayedCheck);
  }, [checkExtension]);

  // 向插件发送发布请求
  const publishToExtension = useCallback(async (data: {
    title: string;
    content: string;
    platform: 'wechat' | 'zhihu' | 'juejin' | 'zsxq';
  }) => {
    if (!isInstalled) {
      throw new Error('插件未安装');
    }

    return new Promise((resolve, reject) => {
      const requestId = `publish_${Date.now()}`;
      
      // 监听发布结果
      const handleResponse = (event: MessageEvent) => {
        if (event.data?.type === 'ZILIU_PUBLISH_RESPONSE' && event.data?.requestId === requestId) {
          window.removeEventListener('message', handleResponse);
          if (event.data.success) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error || '发布失败'));
          }
        }
      };

      window.addEventListener('message', handleResponse);

      // 发送发布请求
      window.postMessage({
        type: 'ZILIU_PUBLISH_REQUEST',
        requestId,
        data,
        timestamp: Date.now()
      }, '*');

      // 设置超时
      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        reject(new Error('发布超时'));
      }, 30000);
    });
  }, [isInstalled]);

  return {
    isInstalled,
    isChecking,
    extensionInfo,
    checkExtension,
    publishToExtension
  };
}