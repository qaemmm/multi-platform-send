/**
 * 平台管理服务 - 统一管理平台相关的业务逻辑
 * 从 background.js 中移出的平台业务逻辑
 */
class ZiliuPlatformManager {
  constructor() {
    this.supportedPlatforms = new Map();
    this.init();
  }

  /**
   * 初始化平台管理器
   */
  init() {
    console.log('🚀 平台管理服务初始化');
    this.loadPlatformConfigs();
  }

  /**
   * 从插件配置加载平台配置
   */
  loadPlatformConfigs() {
    if (!window.ZiliuPluginConfig) {
      console.warn('⚠️ 插件配置未找到，延迟加载平台配置');
      // 延迟重试加载配置
      setTimeout(() => {
        if (window.ZiliuPluginConfig) {
          this.loadPlatformConfigs();
        }
      }, 1000);
      return;
    }

    const platforms = window.ZiliuPluginConfig.platforms || [];
    platforms.forEach(platform => {
      if (platform.enabled) {
        this.supportedPlatforms.set(platform.id, {
          ...platform,
          // 添加发布相关配置
          publishConfig: this.createPublishConfig(platform)
        });
        console.log(`✅ 已加载平台配置: ${platform.displayName}`);
      }
    });
  }

  /**
   * 根据平台配置创建发布配置
   */
  createPublishConfig(platform) {
    return {
      urlPattern: this.buildUrlPattern(platform.urlPatterns),
      newTabUrl: platform.editorUrl,
      platformName: platform.displayName,
      loadDelay: platform.specialHandling?.initDelay || 2000
    };
  }

  /**
   * 构建URL模式（取第一个作为发布检查模式）
   */
  buildUrlPattern(urlPatterns) {
    if (!urlPatterns || urlPatterns.length === 0) {
      return '*';
    }
    return urlPatterns[0].replace('https://', '*://').replace('http://', '*://');
  }

  /**
   * 获取平台发布配置
   */
  getPlatformPublishConfig(platformId) {
    const platform = this.supportedPlatforms.get(platformId);
    return platform?.publishConfig || null;
  }

  /**
   * 根据URL查找匹配的平台
   */
  findPlatformByUrl(url) {
    for (const [id, platform] of this.supportedPlatforms) {
      if (this.urlMatches(url, platform.publishConfig.urlPattern)) {
        return { id, ...platform };
      }
    }
    return null;
  }

  /**
   * 检查URL是否匹配模式
   */
  urlMatches(url, pattern) {
    try {
      const escapedPattern = pattern
        .replace(/[.+^${}()|[\]\\?]/g, '\\$&')
        .replace(/\*/g, '.*');
      const regex = new RegExp('^' + escapedPattern + '$', 'i');
      return regex.test(url);
    } catch (error) {
      console.warn('URL匹配失败:', { pattern, error });
      return false;
    }
  }

  /**
   * 获取所有支持的平台ID列表
   */
  getSupportedPlatforms() {
    return Array.from(this.supportedPlatforms.keys());
  }

  /**
   * 获取平台信息
   */
  getPlatformInfo(platformId) {
    return this.supportedPlatforms.get(platformId) || null;
  }

  /**
   * 检查平台是否支持特定功能
   */
  supportsFeature(platformId, feature) {
    const platform = this.supportedPlatforms.get(platformId);
    return platform ? platform.features.includes(feature) : false;
  }

  /**
   * 获取平台的特殊处理配置
   */
  getSpecialHandling(platformId) {
    const platform = this.supportedPlatforms.get(platformId);
    return platform?.specialHandling || {};
  }

  /**
   * 规范化平台ID（处理中文名称映射）
   */
  normalizePlatformId(platform) {
    const mappings = {
      '微信': 'wechat',
      '微信公众号': 'wechat',
      '知乎': 'zhihu',
      '掘金': 'juejin',
      '知识星球': 'zsxq'
    };

    const normalized = platform?.toLowerCase() || 'wechat';
    return mappings[platform] || mappings[normalized] || normalized;
  }

  /**
   * 检查平台是否被禁用
   */
  isPlatformDisabled(platformId) {
    const platform = this.supportedPlatforms.get(platformId);
    return platform?.specialHandling?.disabled === true;
  }

  /**
   * 检查平台是否仅支持复制模式
   */
  isCopyOnlyPlatform(platformId) {
    const platform = this.supportedPlatforms.get(platformId);
    return platform?.specialHandling?.copyOnly === true;
  }
}

// 全局平台管理器实例
window.ZiliuPlatformManager = new ZiliuPlatformManager();