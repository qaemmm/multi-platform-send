// 字流助手 - 多平台编辑器操作模块
(function() {
  'use strict';

  window.ZiliuEditor = {
    // 检测当前平台并获取对应的编辑器元素
    detectPlatformAndElements() {
      try {
        // 检查平台管理器是否可用
        if (typeof platformManager === 'undefined') {
          console.warn('平台管理器未加载，使用传统检测方法');
          return {
            platform: 'unknown',
            platformInstance: null,
            isEditor: false
          };
        }

        const url = window.location.href;
        console.log('🔍 开始平台检测，URL:', url);

        const platform = platformManager.detectPlatform(url);
        console.log('🔍 检测到的平台:', platform);

        if (platform) {
          console.log('🔍 开始查找编辑器元素...');
          const elements = platform.findEditorElements();
          console.log('🔍 编辑器元素查找结果:', elements);

          return {
            platform: platform.name,
            platformInstance: platform,
            ...elements
          };
        }

        console.log('⚠️ 未检测到支持的平台');
        return {
          platform: 'unknown',
          platformInstance: null,
          isEditor: false
        };
      } catch (error) {
        console.error('平台检测失败:', error);
        return {
          platform: 'unknown',
          platformInstance: null,
          isEditor: false
        };
      }
    },

    // 查找微信编辑器元素（保持向后兼容）
    findWeChatEditorElements() {
      const elements = {
        isWeChatEditor: false,
        titleInput: null,
        authorInput: null,
        contentEditor: null,
        summaryInput: null
      };

      // 检查是否在微信公众号编辑器页面
      if (!ZiliuUtils.isWeChatEditorPage()) {
        console.log('⚠️ 不在微信公众号编辑器页面');
        return elements;
      }

      // 查找标题输入框（使用正确的选择器）
      elements.titleInput = document.querySelector('#title') ||
                           document.querySelector('textarea[placeholder="请在这里输入标题"]') ||
                           document.querySelector('.js_title');

      // 查找作者输入框
      elements.authorInput = document.querySelector('#author') ||
                            document.querySelector('input[placeholder="请输入作者"]') ||
                            document.querySelector('.js_author');

      // 查找内容编辑器（ProseMirror编辑器）
      elements.contentEditor = document.querySelector('.ProseMirror') ||
                              document.querySelector('.rich_media_content .ProseMirror') ||
                              document.querySelector('[contenteditable="true"]:not(.editor_content_placeholder)');

      // 查找摘要输入框
      elements.summaryInput = document.querySelector('#js_description') ||
                             document.querySelector('textarea[placeholder*="选填"]') ||
                             document.querySelector('textarea[name="digest"]');

      // 判断是否找到了关键元素
      elements.isWeChatEditor = !!(elements.titleInput || elements.contentEditor);

      console.log('🔍 微信编辑器元素查找结果:', {
        isWeChatEditor: elements.isWeChatEditor,
        titleInput: !!elements.titleInput,
        authorInput: !!elements.authorInput,
        contentEditor: !!elements.contentEditor,
        summaryInput: !!elements.summaryInput
      });

      return elements;
    },

    // 填充内容到编辑器
    async fillContent(elements, data) {
      try {
        console.log('🚀 开始填充内容到微信编辑器');

        if (!elements.isWeChatEditor) {
          throw new Error('未找到微信编辑器元素');
        }

        let success = true;

        // 填充标题
        if (elements.titleInput && data.title) {
          console.log('📝 填充标题:', data.title);
          const titleSuccess = ZiliuUtils.simulateInput(elements.titleInput, data.title);
          if (!titleSuccess) {
            console.warn('⚠️ 标题填充失败');
            success = false;
          }
          await ZiliuUtils.delay(500);
        }

        // 填充作者
        if (elements.authorInput && data.author) {
          console.log('👤 填充作者:', data.author);
          const authorSuccess = ZiliuUtils.simulateInput(elements.authorInput, data.author);
          if (!authorSuccess) {
            console.warn('⚠️ 作者填充失败');
          }
          await ZiliuUtils.delay(500);
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
          const processedContent = await ZiliuUtils.processSpecialSyntax(fullContent);

          const cleanContent = ZiliuUtils.cleanHtmlContent(processedContent);
          const contentSuccess = await ZiliuUtils.setRichTextContent(elements.contentEditor, cleanContent);
          if (!contentSuccess) {
            console.warn('⚠️ 正文内容填充失败');
            success = false;
          }
          await ZiliuUtils.delay(500);
        }

        // 填充摘要
        if (elements.summaryInput && data.summary) {
          console.log('📋 填充摘要:', data.summary);
          const summarySuccess = ZiliuUtils.simulateInput(elements.summaryInput, data.summary);
          if (!summarySuccess) {
            console.warn('⚠️ 摘要填充失败');
          }
          await ZiliuUtils.delay(500);
        }

        if (success) {
          console.log('✅ 内容填充完成');
          ZiliuUtils.showNotification('内容已成功填充到编辑器！', 'success');
        } else {
          console.warn('⚠️ 部分内容填充失败');
          ZiliuUtils.showNotification('部分内容填充失败，请检查编辑器', 'error');
        }

        return success;

      } catch (error) {
        console.error('❌ 填充内容失败:', error);
        ZiliuUtils.showNotification('填充内容失败: ' + error.message, 'error');
        return false;
      }
    },

    // 获取编辑器当前内容
    getCurrentContent() {
      const elements = this.findWeChatEditorElements();
      
      if (!elements.isWeChatEditor) {
        return null;
      }

      return {
        title: elements.titleInput?.value || '',
        author: elements.authorInput?.value || '',
        content: elements.contentEditor?.innerHTML || '',
        summary: elements.summaryInput?.value || ''
      };
    },

    // 清空编辑器内容
    async clearContent() {
      const elements = this.findWeChatEditorElements();
      
      if (!elements.isWeChatEditor) {
        return false;
      }

      try {
        if (elements.titleInput) {
          ZiliuUtils.simulateInput(elements.titleInput, '');
        }
        if (elements.authorInput) {
          ZiliuUtils.simulateInput(elements.authorInput, '');
        }
        if (elements.contentEditor) {
          await ZiliuUtils.setRichTextContent(elements.contentEditor, '');
        }
        if (elements.summaryInput) {
          ZiliuUtils.simulateInput(elements.summaryInput, '');
        }

        ZiliuUtils.showNotification('编辑器内容已清空', 'info');
        return true;
      } catch (error) {
        console.error('清空内容失败:', error);
        ZiliuUtils.showNotification('清空内容失败', 'error');
        return false;
      }
    },

    // 将Markdown转换为HTML
    async convertMarkdownToHtml(markdown) {
      try {
        console.log('🔄 转换Markdown为HTML:', markdown.substring(0, 50) + '...');

        // 使用ZiliuAPI来调用转换接口，这样会自动使用配置的baseUrl
        const data = await ZiliuAPI.makeRequest('/api/convert', {
          method: 'POST',
          body: {
            content: markdown,
            platform: (window.ZiliuConstants?.DEFAULTS?.PLATFORM) || 'wechat',
            style: (window.ZiliuConstants?.DEFAULTS?.STYLE) || 'default'
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
    },

    // 简单的Markdown到HTML转换（降级方案）
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
  };

  console.log('✅ 字流编辑器模块已加载');
})();
