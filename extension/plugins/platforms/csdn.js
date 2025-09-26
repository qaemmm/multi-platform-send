/**
 * CSDN 平台插件
 * 支持 CodeMirror/textarea 编辑器，填充标题与正文
 */
class CsdnPlatformPlugin extends BasePlatformPlugin {
  constructor(config) {
    super(config);
  }

  static get metadata() {
    return {
      version: '1.0.0',
      description: 'CSDN 平台专用插件，支持 Markdown 编辑器填充'
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
      'input[placeholder*="文章标题"]',
      '#articleTitle'
    ]);

    // 内容编辑器（优先 CodeMirror）
    elements.elements.content = this.findElementFromSelectors([
      '.CodeMirror',
      '.CodeMirror-code',
      '.editor-content textarea',
      'textarea',
      '[contenteditable="true"]'
    ]);

    elements.isEditor = !!(elements.elements.title || elements.elements.content);

    console.log('🔍 CSDN 编辑器检测结果:', {
      title: !!elements.elements.title,
      content: !!elements.elements.content,
      url: window.location.href
    });

    return elements;
  }

  getEditorType(contentElement) {
    if (!contentElement) return 'unknown';
    if (contentElement.classList?.contains('CodeMirror')) return 'CodeMirror';
    if (contentElement.tagName === 'TEXTAREA') return 'textarea';
    if (contentElement.isContentEditable || contentElement.contentEditable === 'true') return 'contentEditable';
    return 'unknown';
  }

  async fillContentEditor(contentElement, content, data) {
    const editorType = this.getEditorType(contentElement);
    try {
      switch (editorType) {
        case 'CodeMirror':
          return await this.fillCodeMirrorEditor(contentElement, content);
        case 'textarea':
          return await this.fillTextareaEditor(contentElement, content);
        default:
          return await super.fillContentEditor(contentElement, content, data);
      }
    } catch (error) {
      console.error(`CSDN 内容填充失败 [${editorType}]:`, error);
      throw error;
    }
  }

  async fillCodeMirrorEditor(element, content) {
    console.log('📝 填充 CSDN CodeMirror 编辑器');
    try {
      const cmInstance = element.CodeMirror || (element.closest('.CodeMirror')?.CodeMirror);
      if (cmInstance) {
        cmInstance.setValue(content);
        cmInstance.focus();
      } else {
        const textarea = element.querySelector?.('textarea') || document.querySelector('.CodeMirror textarea');
        if (textarea) {
          await this.setInputValue(textarea, content);
        } else {
          throw new Error('未找到 CodeMirror 的 textarea');
        }
      }
      await this.delay(400);
      return { success: true, value: content, type: 'CodeMirror' };
    } catch (error) {
      console.error('CSDN CodeMirror 填充失败:', error);
      throw error;
    }
  }

  async fillTextareaEditor(element, content) {
    console.log('📝 填充 CSDN textarea 编辑器');
    await this.setInputValue(element, content);
    await this.delay(300);
    return { success: true, value: content, type: 'textarea' };
  }

  async postFillProcess(elements, data, results) {
    // 将焦点放到内容区域，提升体验
    if (elements.content) {
      try {
        elements.content.focus();
      } catch (e) {}
    }
  }
}

// 配置驱动的自动注册
if (window.ZiliuPlatformRegistry && window.ZiliuPluginConfig) {
  const cfg = window.ZiliuPluginConfig.platforms.find(p => p.id === 'csdn');
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
      console.log('🔧 注册 CSDN 专用插件（配置驱动）');
      const plugin = new CsdnPlatformPlugin(cfg);
      ZiliuPlatformRegistry.register(plugin);
    }
  }
}

window.CsdnPlatformPlugin = CsdnPlatformPlugin;

