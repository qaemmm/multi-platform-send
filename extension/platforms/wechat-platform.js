/**
 * 微信公众号平台处理器
 */
class WeChatPlatform extends BasePlatform {
  constructor() {
    super({
      name: 'wechat',
      displayName: '微信公众号',
      urlPatterns: ['*://mp.weixin.qq.com/*'],
      editorUrl: 'https://mp.weixin.qq.com/'
    });
  }

  /**
   * 查找微信公众号编辑器元素
   */
  findEditorElements() {
    const titleInput = document.querySelector('#title');
    const authorInput = document.querySelector('#author');

    // 优先查找新版ProseMirror编辑器
    let contentEditor = document.querySelector('.ProseMirror') ||
                       document.querySelector('.rich_media_content .ProseMirror') ||
                       document.querySelector('[contenteditable="true"]:not(.editor_content_placeholder)');

    // 如果没找到ProseMirror，回退到旧版UEditor
    if (!contentEditor) {
      contentEditor = document.querySelector('#ueditor_0');
    }

    const digestTextarea = document.querySelector('textarea[name="digest"]') ||
                          document.querySelector('#js_description') ||
                          document.querySelector('textarea[placeholder*="选填"]');

    // 查找富文本编辑器的iframe（仅用于旧版UEditor）
    const editorIframe = document.querySelector('#ueditor_0 iframe');
    let editorBody = null;

    if (editorIframe) {
      try {
        editorBody = editorIframe.contentDocument?.body;
      } catch (e) {
        console.warn('无法访问编辑器iframe:', e);
      }
    }

    console.log('🔍 微信编辑器元素查找结果:', {
      titleInput: !!titleInput,
      authorInput: !!authorInput,
      contentEditor: !!contentEditor,
      contentEditorType: contentEditor?.className || contentEditor?.id || 'unknown',
      digestTextarea: !!digestTextarea,
      editorBody: !!editorBody
    });

    return {
      isWeChatEditor: !!(titleInput && contentEditor),
      isEditor: !!(titleInput && contentEditor), // 统一的编辑器标识
      titleInput,
      authorInput,
      contentEditor,
      editorBody,
      digestTextarea,
      platform: 'wechat'
    };
  }

  /**
   * 填充内容到微信编辑器
   */
  async fillContent(data) {
    try {
      const elements = this.findEditorElements();

      if (!elements.isWeChatEditor) {
        return { success: false, error: '当前页面不是微信公众号编辑器' };
      }

      console.log('🚀 开始填充微信公众号内容');
      let success = true;

      // 填充标题
      if (data.title && elements.titleInput) {
        console.log('📝 填充标题:', data.title);
        const titleSuccess = this.simulateInput(elements.titleInput, data.title);
        if (!titleSuccess) {
          console.warn('⚠️ 标题填充失败');
          success = false;
        }
        await this.delay(500);
      }

      // 填充作者
      if (elements.authorInput && data.author) {
        console.log('👤 填充作者:', data.author);
        const authorSuccess = this.simulateInput(elements.authorInput, data.author);
        if (!authorSuccess) {
          console.warn('⚠️ 作者填充失败');
        }
        await this.delay(500);
      }

      // 填充正文内容
      if (elements.contentEditor && data.content) {
        console.log('📄 填充正文内容');

        // 构建完整内容：开头 + 正文 + 结尾
        let fullContent = data.content;

        // 如果有预设，应用开头和结尾内容
        if (data.preset) {
          console.log('🔧 应用发布预设:', data.preset.name);

          // 转换开头内容的Markdown为HTML
          if (data.preset.headerContent) {
            const headerHtml = await this.convertMarkdownToHtml(data.preset.headerContent);
            fullContent = headerHtml + fullContent;
            console.log('✅ 开头内容已添加并转换为HTML');
          }

          // 转换结尾内容的Markdown为HTML
          if (data.preset.footerContent) {
            const footerHtml = await this.convertMarkdownToHtml(data.preset.footerContent);
            fullContent = fullContent + footerHtml;
            console.log('✅ 结尾内容已添加并转换为HTML');
          }
        }

        // 处理特殊语法（如 {{featured-articles:10}}）
        console.log('🔄 处理特殊语法...');
        const processedContent = await this.processSpecialSyntax(fullContent);

        // 转换外链图片
        console.log('🖼️ 转换外链图片...');
        const finalContent = await this.convertExternalImages(processedContent);

        const cleanContent = this.cleanHtmlContent(finalContent);
        const contentSuccess = await this.setRichTextContent(elements.contentEditor, cleanContent);
        if (!contentSuccess) {
          console.warn('⚠️ 正文内容填充失败');
          success = false;
        }
        await this.delay(500);
      }

      // 填充摘要
      if (elements.summaryInput && data.summary) {
        console.log('📋 填充摘要:', data.summary);
        const summarySuccess = this.simulateInput(elements.summaryInput, data.summary);
        if (!summarySuccess) {
          console.warn('⚠️ 摘要填充失败');
        }
        await this.delay(500);
      }

      if (success) {
        console.log('✅ 内容填充完成');
        this.showNotification('内容已成功填充到编辑器！', 'success');
      } else {
        console.warn('⚠️ 部分内容填充失败');
        this.showNotification('部分内容填充失败，请检查编辑器', 'error');
      }

      return { success, message: success ? '内容填充成功' : '部分内容填充失败' };
    } catch (error) {
      console.error('❌ 填充内容失败:', error);
      this.showNotification('填充内容失败: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * 填充编辑器内容
   */
  async fillEditorContent(elements, content) {
    if (elements.editorBody) {
      // 如果可以访问iframe内容（旧版UEditor）
      elements.editorBody.innerHTML = content;

      // 触发编辑器更新事件
      const event = new Event('input', { bubbles: true });
      elements.editorBody.dispatchEvent(event);
    } else if (elements.contentEditor) {
      // 检查是否是ProseMirror编辑器
      if (elements.contentEditor.classList.contains('ProseMirror') ||
          elements.contentEditor.hasAttribute('contenteditable')) {
        // ProseMirror编辑器处理
        console.log('📝 使用ProseMirror编辑器填充内容');

        // 先聚焦编辑器
        elements.contentEditor.focus();

        // 设置内容
        elements.contentEditor.innerHTML = content;

        // 触发输入事件以更新微信编辑器状态
        const inputEvent = new Event('input', { bubbles: true });
        elements.contentEditor.dispatchEvent(inputEvent);

        // 触发变化事件
        const changeEvent = new Event('change', { bubbles: true });
        elements.contentEditor.dispatchEvent(changeEvent);

        // 触发微信自动保存
        await this.delay(100);
        const keyupEvent = new KeyboardEvent('keyup', { bubbles: true });
        elements.contentEditor.dispatchEvent(keyupEvent);

      } else {
        // 尝试通过UEditor API填充（旧版编辑器）
        if (window.UE && window.UE.getEditor) {
          const editor = window.UE.getEditor('ueditor_0');
          if (editor) {
            editor.ready(() => {
              editor.setContent(content);
            });
          }
        }
      }
    }
  }

  /**
   * 应用微信发布设置
   */
  async applySettings(settings) {
    try {
      // 应用作者名称
      if (settings.authorName) {
        const authorInput = document.querySelector('#author');
        if (authorInput) {
          authorInput.value = settings.authorName;
          authorInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      return { success: true, message: '设置应用成功' };
    } catch (error) {
      console.error('应用设置失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取微信平台特定配置
   */
  getConfigOptions() {
    return {
      authorName: {
        type: 'text',
        label: '作者名称',
        placeholder: '输入作者名称',
        required: false
      },
      autoGenerateDigest: {
        type: 'boolean',
        label: '自动生成摘要',
        default: true
      }
    };
  }

  /**
   * 处理微信特有的引流文章
   */
  async processReferralArticles(content) {
    // 处理 {{历史文章:数量}} 占位符
    const featuredArticlesRegex = /\{\{历史文章:(\d+)\}\}/g;
    let processedContent = content;
    let match;

    while ((match = featuredArticlesRegex.exec(content)) !== null) {
      const count = parseInt(match[1]) || 5;
      const placeholder = match[0];
      
      try {
        // 获取历史文章
        const articles = await this.fetchWeChatArticles(count);
        
        // 生成文章链接列表
        const articleLinks = articles.map(article => {
          return `<p><a href="${article.url}" target="_blank">${article.title}</a></p>`;
        }).join('');
        
        // 替换占位符
        processedContent = processedContent.replace(placeholder, articleLinks);
      } catch (error) {
        console.error('获取历史文章失败:', error);
        processedContent = processedContent.replace(placeholder, `<!-- 获取历史文章失败: ${error.message} -->`);
      }
    }

    return processedContent;
  }

  /**
   * 获取微信历史文章
   */
  async fetchWeChatArticles(count = 5) {
    // 这里需要实现获取微信历史文章的逻辑
    // 可以从现有的 utils.js 中移植相关代码
    return [];
  }

  /**
   * 将Markdown转换为HTML
   */
  async convertMarkdownToHtml(markdown) {
    try {
      console.log('🔄 转换Markdown为HTML:', markdown.substring(0, 50) + '...');

      // 使用ZiliuAPI来调用转换接口
      const data = await window.ZiliuAPI.makeRequest('/api/convert', {
        method: 'POST',
        body: {
          content: markdown,
          platform: 'wechat',
          style: 'default'
        }
      });

      if (data.success && data.data.inlineHtml) {
        console.log('✅ Markdown转换成功');
        return data.data.inlineHtml;
      } else {
        console.warn('⚠️ Markdown转换失败，使用简单转换');
        return this.simpleMarkdownToHtml(markdown);
      }
    } catch (error) {
      console.warn('⚠️ 调用转换API失败，使用简单转换:', error);
      return this.simpleMarkdownToHtml(markdown);
    }
  }

  /**
   * 简单的Markdown到HTML转换（降级方案）
   */
  simpleMarkdownToHtml(markdown) {
    return markdown
      // 标题
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // 粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 引用
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // 分割线
      .replace(/^---$/gim, '<hr>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // 图片
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
      // 换行
      .replace(/\n/g, '<br>');
  }

  /**
   * 处理特殊语法
   */
  async processSpecialSyntax(content) {
    if (window.ZiliuUtils && window.ZiliuUtils.processSpecialSyntax) {
      return await window.ZiliuUtils.processSpecialSyntax(content);
    }
    return content;
  }

  /**
   * 转换外链图片
   */
  async convertExternalImages(content) {
    if (window.ZiliuUtils && window.ZiliuUtils.convertExternalImages) {
      return await window.ZiliuUtils.convertExternalImages(content);
    }
    return content;
  }

  /**
   * 清理HTML内容
   */
  cleanHtmlContent(content) {
    if (window.ZiliuUtils && window.ZiliuUtils.cleanHtmlContent) {
      return window.ZiliuUtils.cleanHtmlContent(content);
    }
    return content;
  }

  /**
   * 设置富文本编辑器内容
   */
  async setRichTextContent(editor, content) {
    if (window.ZiliuUtils && window.ZiliuUtils.setRichTextContent) {
      return await window.ZiliuUtils.setRichTextContent(editor, content);
    }

    // 降级方案
    try {
      editor.innerHTML = content;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    } catch (error) {
      console.error('设置编辑器内容失败:', error);
      return false;
    }
  }

  /**
   * 模拟用户输入
   */
  simulateInput(element, value) {
    if (window.ZiliuUtils && window.ZiliuUtils.simulateInput) {
      return window.ZiliuUtils.simulateInput(element, value);
    }

    // 降级方案
    try {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    } catch (error) {
      console.error('模拟输入失败:', error);
      return false;
    }
  }

  /**
   * 延迟函数
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 显示通知
   */
  showNotification(message, type = 'info') {
    if (window.ZiliuUtils && window.ZiliuUtils.showNotification) {
      window.ZiliuUtils.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

// 导出微信平台类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeChatPlatform;
} else if (typeof window !== 'undefined') {
  window.WeChatPlatform = WeChatPlatform;
}
