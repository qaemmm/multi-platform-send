/**
 * 网站端插件检测脚本
 * 专门用于在字流网站上响应插件检测请求
 */
(function () {
  'use strict';

  // 节流：避免频繁响应导致控制台“像在刷新”
  let lastDetectRespondAt = 0;

  console.log('🌐 字流网站端检测脚本已加载');
  console.log('📍 当前页面URL:', window.location.href);
  console.log('📍 当前页面域名:', window.location.origin);

  // 获取插件版本，使用备用方案
  const getExtensionVersion = () => {
    // 方案1: 从ZiliuConstants获取
    if (window.ZiliuConstants?.VERSION) {
      return window.ZiliuConstants.VERSION;
    }
    // 方案2: 从manifest获取（备用）
    if (typeof chrome !== 'undefined' && chrome?.runtime?.getManifest) {
      try {
        return chrome.runtime.getManifest().version;
      } catch (e) {
        console.warn('无法从manifest获取版本:', e);
      }
    }
    // 方案3: 返回默认版本
    return '1.1.0';
  };

  const extensionVersion = getExtensionVersion();
  console.log('🔧 ZiliuConstants是否可用:', !!window.ZiliuConstants);
  console.log('📦 插件版本:', extensionVersion);

  // 监听来自网页的插件检测消息
  window.addEventListener('message', (event) => {
    console.log('📡 扩展收到消息事件:', event.data?.type);
    console.log('📡 消息来源:', event.origin);

    // 处理来自字流网站（包括本地开发环境）的消息
    const isAllowedOrigin = event.origin === window.location.origin ||
      event.origin.includes('localhost:3000') ||
      event.origin.includes('127.0.0.1:3000') ||
      event.origin.includes('ziliu.online') ||
      event.origin.includes('www.ziliu.online');

    console.log('📡 检查消息来源是否允许:', isAllowedOrigin);

    if (!isAllowedOrigin) {
      console.log('🚫 消息来源被拒绝:', event.origin);
      return;
    }

    const { type, data } = event.data;

    console.log('📡 解析消息类型:', type);

    if (type === 'ZILIU_EXTENSION_DETECT') {
      const now = Date.now();
      // 1200ms 内的重复请求直接忽略，避免焦点切换造成日志风暴
      if (now - lastDetectRespondAt < 1200) {
        return;
      }
      lastDetectRespondAt = now;

      console.log('🎯 网站端收到插件检测请求');
      console.log('📦 扩展版本:', extensionVersion);

      // 响应插件检测
      const response = {
        type: 'ZILIU_EXTENSION_RESPONSE',
        version: extensionVersion,
        installed: true,
        source: 'ziliu-extension',
        timestamp: now
      };

      console.log('📤 准备发送插件检测响应:', response);
      console.log('🎯 目标域名:', event.origin);

      // 仅回发给来源域，避免重复
      try {
        window.postMessage(response, event.origin);
        console.log('✅ 响应已发送到:', event.origin);
      } catch (error) {
        console.error('❌ 发送响应失败:', error);
      }
    }
  });

  // 主动告知网站插件已就绪（多次发送以确保收到）
  const sendReadySignal = () => {
    const readyMessage = {
      type: 'ZILIU_EXTENSION_READY',
      version: extensionVersion,
      installed: true,
      source: 'ziliu-extension',
      timestamp: Date.now()
    };

    try {
      window.postMessage(readyMessage, window.location.origin);
      console.log('📢 网站端主动发送插件就绪信号');
    } catch (error) {
      console.error('❌ 发送就绪信号失败:', error);
    }
  };

  // 多次发送就绪信号,确保页面能接收到
  setTimeout(sendReadySignal, 200);
  setTimeout(sendReadySignal, 500);
  setTimeout(sendReadySignal, 1000);
  setTimeout(sendReadySignal, 2000);

  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    console.log('🧹 网站端检测脚本即将卸载');
  });

})();