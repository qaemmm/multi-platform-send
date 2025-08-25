// 字流助手 - 微信编辑器操作模块
(function() {
  'use strict';

  window.ZiliuEditor = {
    // 查找微信编辑器元素
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

      // 查找内容编辑器
      elements.contentEditor = document.querySelector('#js_editor_insertimg') ||
                              document.querySelector('.rich_media_content') ||
                              document.querySelector('[contenteditable="true"]');

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
          const cleanContent = ZiliuUtils.cleanHtmlContent(data.content);
          const contentSuccess = ZiliuUtils.setRichTextContent(elements.contentEditor, cleanContent);
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
    clearContent() {
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
          ZiliuUtils.setRichTextContent(elements.contentEditor, '');
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
    }
  };

  console.log('✅ 字流编辑器模块已加载');
})();
