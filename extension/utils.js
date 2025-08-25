// 字流助手 - 工具函数模块
(function() {
  'use strict';

  // 全局常量
  window.ZiliuConstants = {
    API_BASE_URL: 'http://localhost:3000',
    PANEL_ID: 'ziliu-assistant-panel',
    VERSION: '3.0',
    SELECTORS: {
      TITLE_INPUT: '#js_title',
      AUTHOR_INPUT: '#js_author',
      CONTENT_EDITOR: '#js_editor_insertimg',
      SUMMARY_INPUT: '#js_digest'
    }
  };

  // 工具函数
  window.ZiliuUtils = {
    // 延迟执行
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // 安全的元素查找
    findElement: (selector, timeout = 5000) => {
      return new Promise((resolve) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    },

    // 模拟用户输入（静默模式，不会导致页面跳变）
    simulateInput: (element, value) => {
      if (!element) return false;

      try {
        // 静默设置值，不触发focus
        element.value = value;
        if (element.textContent !== undefined) {
          element.textContent = value;
        }

        // 触发必要的事件
        ['input', 'change'].forEach(eventType => {
          const event = new Event(eventType, { bubbles: true });
          element.dispatchEvent(event);
        });

        return true;
      } catch (error) {
        console.warn('输入模拟失败:', error);
        return false;
      }
    },

    // 设置富文本编辑器内容（静默模式，不会导致页面跳变）
    setRichTextContent: (element, htmlContent) => {
      if (!element) return false;

      try {
        // 静默设置内容，不触发focus
        element.innerHTML = htmlContent;

        // 触发必要的事件
        ['input', 'change'].forEach(eventType => {
          const event = new Event(eventType, { bubbles: true });
          element.dispatchEvent(event);
        });

        return true;
      } catch (error) {
        console.error('设置富文本内容失败:', error);
        return false;
      }
    },

    // 处理HTML内容，清理不必要的标签和样式
    cleanHtmlContent: (html) => {
      if (!html) return '';

      // 处理块级代码块
      let processedHtml = html.replace(
        /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
        (match, codeContent) => {
          const cleanCode = codeContent
            .replace(/^\s+|\s+$/g, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
          
          return `<section style="margin: 16px 0; padding: 16px; background: #f6f8fa; border-radius: 6px; border-left: 4px solid #0969da; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 14px; line-height: 1.45; overflow-x: auto;"><pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${cleanCode}</pre></section>`;
        }
      );

      // 处理行内代码
      processedHtml = processedHtml.replace(
        /<code[^>]*>(.*?)<\/code>/g,
        '<code style="background: #f6f8fa; padding: 2px 4px; border-radius: 3px; font-family: \'SFMono-Regular\', Consolas, \'Liberation Mono\', Menlo, monospace; font-size: 0.9em;">$1</code>'
      );

      // 处理引用块
      processedHtml = processedHtml.replace(
        /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g,
        '<section style="margin: 16px 0; padding: 16px; background: #f6f8fa; border-left: 4px solid #d1d9e0; color: #656d76;">$1</section>'
      );

      return processedHtml;
    },

    // 显示通知
    showNotification: (message, type = 'info', duration = 3000) => {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        z-index: 10001;
        transition: all 0.3s ease;
        ${type === 'success' ? 'background: #28a745;' : ''}
        ${type === 'error' ? 'background: #dc3545;' : ''}
        ${type === 'info' ? 'background: #007bff;' : ''}
      `;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, duration);
    },

    // 格式化日期
    formatDate: (date) => {
      return new Date(date).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },

    // 防抖函数
    debounce: (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // 检查是否在微信公众号编辑器页面
    isWeChatEditorPage: () => {
      return window.location.href.includes('mp.weixin.qq.com') && 
             (window.location.href.includes('appmsg_edit') || 
              window.location.href.includes('editor'));
    },

    // 生成唯一ID
    generateId: () => {
      return 'ziliu_' + Math.random().toString(36).substr(2, 9);
    }
  };

  console.log('✅ 字流工具模块已加载');
})();
