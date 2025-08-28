// 字流助手 - 常量配置
(function() {
  'use strict';

  // 全局常量配置
  window.ZiliuConstants = {
    // 版本信息
    VERSION: '1.4.0',

    // API基础URL - 可以通过环境变量或配置修改
    API_BASE_URL: 'http://localhost:3000',
    
    // 支持的平台
    PLATFORMS: {
      WECHAT: 'wechat',
      ZHIHU: 'zhihu', 
      JUEJIN: 'juejin',
      XIAOHONGSHU: 'xiaohongshu'
    },

    // 平台信息
    PLATFORM_INFO: {
      wechat: {
        name: '微信公众号',
        icon: '📱',
        color: '#07C160'
      },
      zhihu: {
        name: '知乎',
        icon: '🔵', 
        color: '#0084FF'
      },
      juejin: {
        name: '掘金',
        icon: '⚡',
        color: '#1E80FF'
      },
      xiaohongshu: {
        name: '小红书',
        icon: '📝',
        color: '#FF2442'
      }
    },

    // API端点
    API_ENDPOINTS: {
      ARTICLES: '/api/articles',
      PRESETS: '/api/presets', 
      CONVERT: '/api/convert',
      LOGIN_CHECK: '/api/auth/session'
    },

    // 默认配置
    DEFAULTS: {
      AUTHOR: '孟健',
      PLATFORM: 'wechat',
      STYLE: 'default',
      PAGE_SIZE: 8
    },

    // 消息类型
    MESSAGE_TYPES: {
      PING: 'ping',
      FILL_CONTENT: 'fillContent',
      API_REQUEST: 'apiRequest',
      CONFIG_UPDATED: 'configUpdated'
    },

    // 通知类型
    NOTIFICATION_TYPES: {
      SUCCESS: 'success',
      ERROR: 'error', 
      INFO: 'info',
      WARNING: 'warning'
    },

    // 延迟时间（毫秒）
    DELAYS: {
      INPUT: 500,
      SEARCH: 300,
      NOTIFICATION: 3000
    },

    // 获取完整的API URL
    getApiUrl(endpoint) {
      return this.API_BASE_URL + endpoint;
    },

    // 获取平台信息
    getPlatformInfo(platform) {
      return this.PLATFORM_INFO[platform] || this.PLATFORM_INFO.wechat;
    },

    // 检测当前平台
    detectCurrentPlatform() {
      const url = window.location.href;
      if (url.includes('mp.weixin.qq.com')) {
        return this.PLATFORMS.WECHAT;
      } else if (url.includes('zhuanlan.zhihu.com')) {
        return this.PLATFORMS.ZHIHU;
      } else if (url.includes('juejin.cn')) {
        return this.PLATFORMS.JUEJIN;
      } else if (url.includes('xiaohongshu.com')) {
        return this.PLATFORMS.XIAOHONGSHU;
      }
      return this.PLATFORMS.WECHAT; // 默认
    }
  };

  console.log('✅ 字流助手常量配置已加载');
})();
