/**
 * 基础平台类 - 所有平台都需要继承这个类
 */
class BasePlatform {
  constructor(config = {}) {
    this.name = config.name || 'unknown';
    this.displayName = config.displayName || this.name;
    this.urlPatterns = config.urlPatterns || [];
    this.editorUrl = config.editorUrl || '';
    this.config = config;
  }

  /**
   * 检查当前页面是否是该平台的编辑器
   * @param {string} url - 页面URL
   * @returns {boolean}
   */
  isEditorPage(url) {
    return this.urlPatterns.some(pattern => {
      try {
        // 将通配符模式转换为正则表达式
        // 先转义特殊字符，保留 * 不转义
        let escapedPattern = pattern.replace(/[.+^${}()|[\]\\?]/g, '\\$&');
        
        // 将 * 替换为 .* （通配符匹配任意字符）
        escapedPattern = escapedPattern.replace(/\*/g, '.*');
        
        const regex = new RegExp('^' + escapedPattern + '$', 'i');
        const matches = regex.test(url);
        
        // 调试日志
        if (this.name === 'zsxq' || this.name === 'wechat') {
          console.log(`🔍 ${this.displayName}URL匹配调试:`, {
            url,
            pattern,
            escapedPattern,
            regex: regex.toString(),
            matches
          });
        }
        
        return matches;
      } catch (error) {
        console.error(`❌ ${this.displayName}URL匹配失败:`, {
          pattern,
          error: error.message
        });
        return false;
      }
    });
  }

  /**
   * 查找该平台的编辑器元素
   * @returns {Object} 包含编辑器元素信息的对象
   */
  findEditorElements() {
    throw new Error('findEditorElements method must be implemented by subclass');
  }

  /**
   * 填充内容到编辑器
   * @param {Object} data - 要填充的数据
   * @returns {Promise<Object>} 填充结果
   */
  async fillContent(data) {
    throw new Error('fillContent method must be implemented by subclass');
  }

  /**
   * 应用发布设置
   * @param {Object} settings - 发布设置
   * @returns {Promise<Object>} 应用结果
   */
  async applySettings(settings) {
    throw new Error('applySettings method must be implemented by subclass');
  }

  /**
   * 获取平台特定的配置选项
   * @returns {Object} 配置选项
   */
  getConfigOptions() {
    return {};
  }

  /**
   * 验证发布设置
   * @param {Object} settings - 发布设置
   * @returns {Object} 验证结果
   */
  validateSettings(settings) {
    return { valid: true, errors: [] };
  }

  /**
   * 处理内容转换（如Markdown到HTML）
   * @param {string} content - 原始内容
   * @param {Object} options - 转换选项
   * @returns {string} 转换后的内容
   */
  transformContent(content, options = {}) {
    return content;
  }

  /**
   * 获取平台支持的内容格式
   * @returns {Array} 支持的格式列表
   */
  getSupportedFormats() {
    return ['html', 'markdown'];
  }

  /**
   * 处理引流文章占位符
   * @param {string} content - 内容
   * @returns {Promise<string>} 处理后的内容
   */
  async processReferralArticles(content) {
    // 默认实现，子类可以重写
    return content;
  }
}

// 导出基础平台类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BasePlatform;
} else if (typeof window !== 'undefined') {
  window.BasePlatform = BasePlatform;
}
