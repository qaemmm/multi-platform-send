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

  return {
    isInstalled,
    isChecking,
    extensionInfo,
    checkExtension
  };
}