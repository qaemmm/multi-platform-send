'use client';

import { useState, useEffect, useCallback } from 'react';

interface ExtensionInfo {
  version?: string;
  installed: boolean;
}

export function useExtensionDetector() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(false); // 修复：初始为false，避免首次检测被跳过
  const [extensionInfo, setExtensionInfo] = useState<ExtensionInfo | null>(null);
  const [detectionAttempts, setDetectionAttempts] = useState(0);
  const [hasDetected, setHasDetected] = useState(false);

  const MAX_DETECTION_ATTEMPTS = 3;
  const DETECTION_TIMEOUT = 5000;

  const checkExtension = useCallback(() => {
    // 如果已经在检测中，跳过
    if (isChecking) {
      console.log('🔍 跳过插件检测 - 正在检测中');
      return;
    }

    // 如果已经成功安装，不需要重复检测
    if (isInstalled) {
      console.log('🔍 跳过插件检测 - 已确认安装');
      return;
    }

    // 如果检测次数过多，停止自动检测
    if (detectionAttempts >= MAX_DETECTION_ATTEMPTS) {
      console.log('🔍 检测次数已达上限，停止自动检测');
      setIsChecking(false);
      return;
    }

    console.log('🔍 检测字流插件... (尝试', detectionAttempts + 1, '/', MAX_DETECTION_ATTEMPTS, ')');
    console.log('📍 当前页面域名:', window.location.origin);

    setIsChecking(true);
    setDetectionAttempts(prev => prev + 1);

    // 发送检测消息到插件
    window.postMessage({
      type: 'ZILIU_EXTENSION_DETECT',
      source: 'ziliu-website',
      timestamp: Date.now()
    }, '*');

    console.log('📤 已发送 ZILIU_EXTENSION_DETECT 消息');

    // 设置超时，如果5秒内没有响应则认为未安装
    const timeout = setTimeout(() => {
      console.log('⏰ 插件检测超时，本次检测结果：未安装');
      setIsInstalled(false);
      setExtensionInfo(null);
      setIsChecking(false);
      // 不设置 hasDetected，允许后续手动重试
    }, DETECTION_TIMEOUT);

    // 监听插件响应
    const handleMessage = (event: MessageEvent) => {
      // 修复：简化消息来源校验，content script使用window.postMessage时origin是当前页面
      if (event.origin !== window.location.origin) {
        return;
      }

      console.log('📨 收到消息事件:', event.data?.type);
      console.log('📨 消息来源:', event.origin);

      if (event.data?.type === 'ZILIU_EXTENSION_RESPONSE') {
        console.log('✅ 检测到插件已安装:', event.data);
        clearTimeout(timeout);
        setIsInstalled(true);
        setExtensionInfo({
          version: event.data.version,
          installed: true
        });
        setIsChecking(false);
        setHasDetected(true); // 只有成功检测后才标记为已完成
        window.removeEventListener('message', handleMessage);
      } else if (event.data?.type === 'ZILIU_EXTENSION_READY') {
        console.log('✅ 收到插件就绪信号:', event.data);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
    };
  }, [isChecking, isInstalled, detectionAttempts]);

  useEffect(() => {
    // 只在组件挂载时执行一次检测
    const delayedCheck = setTimeout(() => {
      checkExtension();
    }, 1000);

    return () => clearTimeout(delayedCheck);
  }, []);

  // 添加自动重试机制，但限制重试次数
  useEffect(() => {
    // 只在特定条件下才自动重试
    if (!isInstalled && !isChecking && detectionAttempts < MAX_DETECTION_ATTEMPTS && !hasDetected) {
      const retryInterval = setInterval(() => {
        console.log('🔄 自动重试扩展检测...');
        checkExtension();
      }, 10000); // 每10秒重试一次

      return () => clearInterval(retryInterval);
    }
  }, [isInstalled, isChecking, detectionAttempts, hasDetected, checkExtension]);

  // 提供重置检测的方法
  const resetDetection = useCallback(() => {
    console.log('🔄 重置扩展检测状态');
    setHasDetected(false);
    setDetectionAttempts(0);
    setIsInstalled(false);
    setExtensionInfo(null);
    setIsChecking(false);

    // 重置后延迟重新检测
    setTimeout(() => {
      console.log('🔄 重置后重新开始检测');
      checkExtension();
    }, 1000);
  }, [checkExtension]);

  return {
    isInstalled,
    isChecking,
    extensionInfo,
    checkExtension,
    resetDetection
  };
}