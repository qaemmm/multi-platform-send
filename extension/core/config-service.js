/**
 * 新架�?- 配置服务
 * 替代旧的ZiliuConstants，提供统一的配置管理服�?
 */
class ConfigService {
  constructor() {
    this.config = {
      // 基础配置
      API_BASE_URL: null,
      VERSION: '3.0',
      
      // UI配置
      PANEL_ID: 'ziliu-assistant-panel',
      
      // 选择器配�?
      SELECTORS: {
        WECHAT: {
          TITLE_INPUT: '#js_title',
          AUTHOR_INPUT: '#js_author', 
          CONTENT_EDITOR: '#js_editor_insertimg',
          SUMMARY_INPUT: '#js_digest'
        },
        ZHIHU: {
          TITLE_INPUT: '.WriteIndex-titleInput textarea',
          CONTENT_EDITOR: '.DraftEditor-root'
        },
        JUEJIN: {
          TITLE_INPUT: '.title-input input',
          CONTENT_EDITOR: '.CodeMirror'
        },
        ZSXQ: {
          CONTENT_EDITOR: '.ql-editor'
        }
      },
      
      // 平台配置（动态从插件配置获取�?
      PLATFORMS: {},
      
      // API配置
      API: {
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        CACHE_EXPIRATION: 5 * 60 * 1000 // 5分钟
      },
      
      // UI样式配置
      STYLES: {
        NOTIFICATION_DURATION: 3000,
        LOADING_DELAY: 100
      }
    };
    
    this.initialized = false;
  }

  /**
   * 初始化配置服�?
   */
  async init() {
    if (this.initialized) return;

    try {
      // 从存储中获取API基础URL
      const result = await chrome.storage.sync.get(['apiBaseUrl']);
      const fallbackBase = window.ZiliuConstants?.DEFAULT_API_BASE_URL || 'https://ziliu.huiouye.online';
      let baseUrl = result.apiBaseUrl || fallbackBase;

      // Normalize legacy www domain to avoid cross-origin cookie issues
      if (baseUrl?.startsWith('https://www.ziliu.huiouye.online')) {
        baseUrl = `https://ziliu.huiouye.online${baseUrl.slice('https://www.ziliu.huiouye.online'.length)}`;
        try {
          await chrome.storage.sync.set({ apiBaseUrl: baseUrl });
        } catch (storageError) {
          console.warn('保存修正后的 API 基础 URL 失败:', storageError);
        }
      }

      this.config.API_BASE_URL = baseUrl;
      
      // 从插件配置加载平台配�?
      this.loadPlatformConfigs();
      
      this.initialized = true;
      console.log('�?配置服务初始化完成，API URL:', this.config.API_BASE_URL);
      
      // 触发配置加载完成事件
      if (window.ZiliuEventBus) {
        ZiliuEventBus.emit('config:loaded', this.config);
      }
    } catch (error) {
      console.error('�?配置服务初始化失�?', error);
      this.config.API_BASE_URL = window.ZiliuConstants?.DEFAULT_API_BASE_URL || 'https://ziliu.huiouye.online';
      this.initialized = true;
    }
  }

  /**
   * 从插件配置加载平台配�?
   */
  loadPlatformConfigs() {
    if (!window.ZiliuPluginConfig || !window.ZiliuPluginConfig.platforms) {
      console.warn('⚠️ 插件配置未加载，使用空平台配�?);
      return;
    }

    window.ZiliuPluginConfig.platforms.forEach(platform => {
      if (platform.enabled) {
        // 提取主域�?
        const mainUrl = platform.urlPatterns[0] || '';
        const hostMatch = mainUrl.match(/https?:\/\/([^\/]+)/);
        const host = hostMatch ? hostMatch[1] : '';

        // 转换为旧格式以保持兼容�?
        this.config.PLATFORMS[platform.id.toUpperCase()] = {
          id: platform.id,
          name: platform.displayName,
          host: host
        };
      }
    });

    console.log('�?平台配置已从插件配置加载:', Object.keys(this.config.PLATFORMS));
  }

  /**
   * 获取配置�?
   */
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * 设置配置�?
   */
  set(key, value) {
    const keys = key.split('.');
    let target = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    target[keys[keys.length - 1]] = value;
    
    // 触发配置变更事件
    if (window.ZiliuEventBus) {
      ZiliuEventBus.emit('config:changed', { key, value });
    }
  }

  /**
   * 获取API基础URL
   */
  getApiBaseUrl() {
    return this.config.API_BASE_URL;
  }

  /**
   * 设置API基础URL
   */
  async setApiBaseUrl(url) {
    this.config.API_BASE_URL = url;
    
    try {
      await chrome.storage.sync.set({ apiBaseUrl: url });
      console.log('�?API基础URL已更�?', url);
      
      // 触发URL变更事件
      if (window.ZiliuEventBus) {
        ZiliuEventBus.emit('config:apiUrlChanged', url);
      }
    } catch (error) {
      console.error('�?保存API基础URL失败:', error);
      throw error;
    }
  }

  /**
   * 获取平台配置
   */
  getPlatformConfig(platformId) {
    const platformKey = platformId.toUpperCase();
    return this.config.PLATFORMS[platformKey] || null;
  }

  /**
   * 获取平台选择�?
   */
  getPlatformSelectors(platformId) {
    const platformKey = platformId.toUpperCase();
    return this.config.SELECTORS[platformKey] || {};
  }

  /**
   * 根据URL检测平�?
   */
  detectPlatformFromUrl(url) {
    for (const [key, platform] of Object.entries(this.config.PLATFORMS)) {
      if (url.includes(platform.host)) {
        return platform;
      }
    }
    return null;
  }

  /**
   * 获取所有平台配�?
   */
  getAllPlatforms() {
    return Object.values(this.config.PLATFORMS);
  }

  /**
   * 获取版本信息
   */
  getVersion() {
    return this.config.VERSION;
  }

  /**
   * 获取面板ID
   */
  getPanelId() {
    return this.config.PANEL_ID;
  }

  /**
   * 获取API配置
   */
  getApiConfig() {
    return {
      ...this.config.API,
      baseURL: this.config.API_BASE_URL
    };
  }

  /**
   * 获取样式配置
   */
  getStyleConfig() {
    return this.config.STYLES;
  }

  /**
   * 合并配置
   */
  merge(newConfig) {
    this.config = this.deepMerge(this.config, newConfig);
    
    // 触发配置合并事件
    if (window.ZiliuEventBus) {
      ZiliuEventBus.emit('config:merged', newConfig);
    }
  }

  /**
   * 深度合并对象
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * 导出配置（用于调试）
   */
  export() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 重置配置为默认�?
   */
  reset() {
    // 保存当前API URL
    const currentApiUrl = this.config.API_BASE_URL;
    
    // 重新创建配置对象
    this.config = {
      API_BASE_URL: currentApiUrl,
      VERSION: '3.0',
      PANEL_ID: 'ziliu-assistant-panel',
      // ... 其他默认配置
    };
    
    // 触发重置事件
    if (window.ZiliuEventBus) {
      ZiliuEventBus.emit('config:reset');
    }
  }

  /**
   * 检查配置是否已初始�?
   */
  isInitialized() {
    return this.initialized;
  }
}

// 创建全局实例
window.ZiliuConfigService = new ConfigService();

console.log('�?字流配置服务已加�?);
