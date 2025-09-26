/**
 * 网站端插件检测脚本
 * 专门用于在字流网站上响应插件检测请求
 */
(function() {
  'use strict';

  console.log('🌐 字流网站端检测脚本已加载');
  console.log('📍 当前页面URL:', window.location.href);
  console.log('📍 当前页面域名:', window.location.origin);
  console.log('🔧 ZiliuConstants是否可用:', !!window.ZiliuConstants);
  console.log('📦 插件版本:', window.ZiliuConstants?.VERSION || '未知');

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
      console.log('🎯 网站端收到插件检测请求');
      console.log('📦 扩展版本:', window.ZiliuConstants?.VERSION || '1.0.0');

      // 响应插件检测
      const response = {
        type: 'ZILIU_EXTENSION_RESPONSE',
        version: window.ZiliuConstants?.VERSION || '1.0.0',
        installed: true,
        source: 'ziliu-extension',
        timestamp: Date.now()
      };

      console.log('📤 准备发送插件检测响应:', response);
      console.log('🎯 目标域名:', event.origin);

      // 发送响应
      try {
        window.postMessage(response, event.origin);
        console.log('✅ 响应已发送到:', event.origin);
      } catch (error) {
        console.error('❌ 发送响应失败:', error);
      }

      // 也尝试发送到开发环境
      if (event.origin.includes('localhost')) {
        setTimeout(() => {
          console.log('🔄 尝试发送响应到开发环境');
          window.postMessage(response, 'http://localhost:3000');
        }, 50);
      }
    }
  });

  // 主动告知网站插件已就绪
  setTimeout(() => {
    const readyMessage = {
      type: 'ZILIU_EXTENSION_READY',
      version: window.ZiliuConstants?.VERSION || '1.0.0',
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
  }, 200);

  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    console.log('🧹 网站端检测脚本即将卸载');
  });

})();