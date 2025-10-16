/**
 * 小红书 平台插件
 * 基础版本：平台检测、标题填充、正文填充（contenteditable/ProseMirror/Quill）
 */
class XiaohongshuPlatformPlugin extends BasePlatformPlugin {
  constructor(config) {
    super(config);
  }

  static get metadata() {
    return {
      version: '1.0.0',
      description: '小红书 平台专用插件（基础版）'
    };
  }

  // 平台特有元素查找
  _findElements() {
    const elements = {
      isEditor: false,
      platform: this.id,
      elements: {}
    };

    // 标题
    elements.elements.title = this.findElementFromSelectors([
      'input[placeholder*="标题"]',
      'input[placeholder*="请输入标题"]'
    ]);

    // 正文（优先 contenteditable / ProseMirror / Quill）
    elements.elements.content = this.findElementFromSelectors([
      '[contenteditable="true"]:not([placeholder])',
      '.ProseMirror',
      '.ql-editor'
    ]);

    elements.isEditor = !!(elements.elements.title || elements.elements.content);

    console.log('🔍 小红书 编辑器检测结果:', {
      title: !!elements.elements.title,
      content: !!elements.elements.content,
      url: window.location.href
    });

    return elements;
  }

  async fillContentEditor(contentElement, content, data) {
    // 尝试判断类型
    const isProseMirror = contentElement.classList?.contains('ProseMirror');
    const isQuill = contentElement.classList?.contains('ql-editor');
    const isContentEditable = contentElement.getAttribute?.('contenteditable') === 'true';

    try {
      if (isProseMirror || isContentEditable) {
        // 基于 selection/execCommand 的通用填充（降级可用）
        contentElement.focus();
        await this.delay(50);
        // 清空现有内容
        try {
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
        } catch (e) {}
        // 插入HTML
        const html = typeof content === 'string' ? content : (content?.html || '');
        document.execCommand('insertHTML', false, html);
        await this.delay(300);
        return { success: true, value: html, type: 'contenteditable' };
      }

      if (isQuill) {
        // Quill 通常也支持直接粘贴 HTML
        contentElement.focus();
        await this.delay(50);
        try {
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
        } catch (e) {}
        const html = typeof content === 'string' ? content : (content?.html || '');
        document.execCommand('insertHTML', false, html);
        await this.delay(300);
        return { success: true, value: html, type: 'quill' };
      }

      // 兜底：走基类默认实现
      return await super.fillContentEditor(contentElement, content, data);
    } catch (error) {
      console.error('小红书 内容填充失败:', error);
      throw error;
    }
  }

  async postFillProcess(elements, data, results) {
    if (elements.content) {
      try { elements.content.focus(); } catch (_) {}
    }
  }
}

// 配置驱动的自动注册
if (window.ZiliuPlatformRegistry && window.ZiliuPluginConfig) {
  const cfg = window.ZiliuPluginConfig.platforms.find(p => p.id === 'xiaohongshu');
  if (cfg && cfg.enabled) {
    const shouldRegister = cfg.urlPatterns.some(pattern => {
      try {
        const escaped = pattern.replace(/[.+^${}()|[\]\\?]/g, '\\$&').replace(/\*/g, '.*');
        const regex = new RegExp('^' + escaped + '$', 'i');
        return regex.test(window.location.href);
      } catch (e) {
        return false;
      }
    });
    if (shouldRegister) {
      console.log('🔧 注册 小红书 专用插件（配置驱动）');
      const plugin = new XiaohongshuPlatformPlugin(cfg);
      ZiliuPlatformRegistry.register(plugin);
    }
  }
}

window.XiaohongshuPlatformPlugin = XiaohongshuPlatformPlugin;

