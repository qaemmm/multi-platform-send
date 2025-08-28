/**
 * 平台管理器 - 统一管理所有发布平台
 */
class PlatformManager {
  constructor() {
    this.platforms = new Map();
    this.currentPlatform = null;
    this.init();
  }

  /**
   * 初始化平台管理器
   */
  init() {
    // 只注册当前环境中可用的平台
    try {
      if (typeof WeChatPlatform !== 'undefined') {
        this.registerPlatform(new WeChatPlatform());
      }
    } catch (error) {
      console.warn('微信平台初始化失败:', error.message);
    }

    try {
      if (typeof ZhihuPlatform !== 'undefined') {
        this.registerPlatform(new ZhihuPlatform());
      }
    } catch (error) {
      console.warn('知乎平台初始化失败:', error.message);
    }

    try {
      if (typeof JuejinPlatform !== 'undefined') {
        this.registerPlatform(new JuejinPlatform());
      }
    } catch (error) {
      console.warn('掘金平台初始化失败:', error.message);
    }

    // 可以在这里添加更多平台
    // try {
    //   if (typeof JianshuPlatform !== 'undefined') {
    //     this.registerPlatform(new JianshuPlatform());
    //   }
    // } catch (error) {
    //   console.warn('简书平台初始化失败:', error.message);
    // }
  }

  /**
   * 注册平台
   * @param {BasePlatform} platform - 平台实例
   */
  registerPlatform(platform) {
    if (!(platform instanceof BasePlatform)) {
      throw new Error('Platform must extend BasePlatform');
    }
    
    this.platforms.set(platform.name, platform);
    console.log(`已注册平台: ${platform.displayName}`);
  }

  /**
   * 获取平台
   * @param {string} name - 平台名称
   * @returns {BasePlatform|null}
   */
  getPlatform(name) {
    return this.platforms.get(name) || null;
  }

  /**
   * 获取所有平台
   * @returns {Array<BasePlatform>}
   */
  getAllPlatforms() {
    return Array.from(this.platforms.values());
  }

  /**
   * 根据URL检测当前平台
   * @param {string} url - 页面URL
   * @returns {BasePlatform|null}
   */
  detectPlatform(url) {
    for (const platform of this.platforms.values()) {
      if (platform.isEditorPage(url)) {
        this.currentPlatform = platform;
        return platform;
      }
    }
    return null;
  }

  /**
   * 获取当前平台
   * @returns {BasePlatform|null}
   */
  getCurrentPlatform() {
    return this.currentPlatform;
  }

  /**
   * 设置当前平台
   * @param {string} platformName - 平台名称
   */
  setCurrentPlatform(platformName) {
    const platform = this.getPlatform(platformName);
    if (platform) {
      this.currentPlatform = platform;
    }
  }

  /**
   * 处理一键发布
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>}
   */
  async handlePublish(data) {
    const platformName = data.platform || 'wechat';
    const platform = this.getPlatform(platformName);
    
    if (!platform) {
      return { success: false, error: `不支持的平台: ${platformName}` };
    }

    try {
      // 查找现有的平台标签页
      const tabs = await this.findPlatformTabs(platform);
      
      if (tabs.length > 0) {
        // 如果有现有页面，激活并填充
        return await this.fillExistingTab(tabs[0], platform, data);
      } else {
        // 如果没有现有页面，创建新页面
        return await this.createNewTab(platform, data);
      }
    } catch (error) {
      console.error('发布失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 查找平台相关的标签页
   * @param {BasePlatform} platform - 平台实例
   * @returns {Promise<Array>}
   */
  async findPlatformTabs(platform) {
    const queries = platform.urlPatterns.map(pattern => ({ url: pattern }));
    const allTabs = [];
    
    for (const query of queries) {
      const tabs = await chrome.tabs.query(query);
      allTabs.push(...tabs);
    }
    
    return allTabs;
  }

  /**
   * 在现有标签页中填充内容
   * @param {Object} tab - 标签页对象
   * @param {BasePlatform} platform - 平台实例
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>}
   */
  async fillExistingTab(tab, platform, data) {
    return new Promise((resolve) => {
      // 激活标签页
      chrome.tabs.update(tab.id, { active: true });
      
      // 等待页面激活后填充内容
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'fillContent',
          platform: platform.name,
          data: data
        }, (response) => {
          resolve(response || { success: false, error: '填充失败' });
        });
      }, 500);
    });
  }

  /**
   * 创建新标签页并填充内容
   * @param {BasePlatform} platform - 平台实例
   * @param {Object} data - 发布数据
   * @returns {Promise<Object>}
   */
  async createNewTab(platform, data) {
    return new Promise((resolve) => {
      // 创建新标签页
      chrome.tabs.create({
        url: platform.editorUrl,
        active: true
      }, (newTab) => {
        // 监听页面加载完成
        const listener = (tabId, changeInfo) => {
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            
            // 页面加载完成后填充内容
            setTimeout(() => {
              chrome.tabs.sendMessage(newTab.id, {
                action: 'fillContent',
                platform: platform.name,
                data: data
              }, (response) => {
                resolve(response || { success: false, error: '填充失败' });
              });
            }, 2000); // 给页面更多时间加载
          }
        };
        
        chrome.tabs.onUpdated.addListener(listener);
      });
    });
  }

  /**
   * 应用发布设置
   * @param {string} platformName - 平台名称
   * @param {Object} settings - 发布设置
   * @returns {Promise<Object>}
   */
  async applySettings(platformName, settings) {
    const platform = this.getPlatform(platformName);
    if (!platform) {
      return { success: false, error: `不支持的平台: ${platformName}` };
    }

    return await platform.applySettings(settings);
  }

  /**
   * 获取平台配置选项
   * @param {string} platformName - 平台名称
   * @returns {Object}
   */
  getPlatformConfig(platformName) {
    const platform = this.getPlatform(platformName);
    if (!platform) {
      return {};
    }

    return platform.getConfigOptions();
  }

  /**
   * 验证平台设置
   * @param {string} platformName - 平台名称
   * @param {Object} settings - 设置对象
   * @returns {Object}
   */
  validatePlatformSettings(platformName, settings) {
    const platform = this.getPlatform(platformName);
    if (!platform) {
      return { valid: false, errors: ['不支持的平台'] };
    }

    return platform.validateSettings(settings);
  }

  /**
   * 处理内容转换
   * @param {string} platformName - 平台名称
   * @param {string} content - 原始内容
   * @param {Object} options - 转换选项
   * @returns {string}
   */
  transformContent(platformName, content, options = {}) {
    const platform = this.getPlatform(platformName);
    if (!platform) {
      return content;
    }

    return platform.transformContent(content, options);
  }
}

// 创建全局平台管理器实例
const platformManager = new PlatformManager();

// 导出平台管理器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PlatformManager, platformManager };
} else if (typeof window !== 'undefined') {
  window.PlatformManager = PlatformManager;
  window.platformManager = platformManager;
}
