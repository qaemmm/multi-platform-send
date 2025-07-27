// 字流助手 - 公众号内容填充脚本

(function() {
  'use strict';

  // 检查是否在公众号编辑页面
  function isWechatEditor() {
    return window.location.hostname === 'mp.weixin.qq.com' &&
           (window.location.pathname.includes('/cgi-bin/appmsg') ||
            window.location.pathname.includes('/advanced/tmpl') ||
            window.location.pathname.includes('/cgi-bin/operate_appmsg') ||
            document.querySelector('.rich_media_editor') ||
            document.querySelector('.weui-desktop-editor'));
  }

  // 检测编辑器类型
  function detectEditorType() {
    // 新版编辑器
    if (document.querySelector('.weui-desktop-editor__wrp')) {
      return 'new';
    }
    // 旧版UEditor
    if (document.querySelector('#ueditor_0') || document.querySelector('.edui-editor')) {
      return 'ueditor';
    }
    // 富文本编辑器
    if (document.querySelector('.rich_media_editor')) {
      return 'rich_media';
    }
    return 'unknown';
  }

  // 显示通知
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      transform: translateX(100%);
    `;
    
    document.body.appendChild(notification);
    
    // 动画显示
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // 等待元素出现
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  // 填充标题
  async function fillTitle(title) {
    try {
      // 根据编辑器类型选择不同的选择器
      const editorType = detectEditorType();
      let titleSelectors = [];

      switch (editorType) {
        case 'new':
          titleSelectors = [
            '.weui-desktop-form__input[placeholder*="标题"]',
            '.weui-desktop-form__input[placeholder*="请输入标题"]',
            'input[data-testid="title"]',
            '.js_title input'
          ];
          break;
        case 'ueditor':
          titleSelectors = [
            '#title',
            'input[placeholder*="标题"]',
            '.title input'
          ];
          break;
        case 'rich_media':
          titleSelectors = [
            '.rich_media_title input',
            'input[name="title"]',
            '#js_title'
          ];
          break;
        default:
          titleSelectors = [
            '#title',
            'input[placeholder*="标题"]',
            'input[placeholder*="请输入标题"]',
            '.title input',
            '.weui-desktop-form__input[placeholder*="标题"]',
            '.rich_media_title input',
            'input[data-testid="title"]'
          ];
      }

      let titleInput = null;
      for (const selector of titleSelectors) {
        titleInput = document.querySelector(selector);
        if (titleInput && titleInput.offsetParent !== null) { // 确保元素可见
          break;
        }
      }

      if (!titleInput) {
        // 如果直接查找不到，等待页面加载
        for (const selector of titleSelectors) {
          try {
            titleInput = await waitForElement(selector, 2000);
            if (titleInput) break;
          } catch (e) {
            continue;
          }
        }
      }

      if (titleInput) {
        // 清空现有内容
        titleInput.value = '';
        titleInput.focus();

        // 模拟用户输入
        titleInput.value = title;

        // 触发各种事件确保编辑器识别
        titleInput.dispatchEvent(new Event('focus', { bubbles: true }));
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        titleInput.dispatchEvent(new Event('blur', { bubbles: true }));

        return true;
      }
    } catch (error) {
      console.error('填充标题失败:', error);
    }
    return false;
  }

  // 填充内容
  async function fillContent(content) {
    try {
      const editorType = detectEditorType();
      let editorSelectors = [];
      let success = false;

      switch (editorType) {
        case 'new':
          success = await fillNewEditor(content);
          break;
        case 'ueditor':
          success = await fillUEditor(content);
          break;
        case 'rich_media':
          success = await fillRichMediaEditor(content);
          break;
        default:
          // 尝试所有可能的方法
          success = await fillNewEditor(content) ||
                   await fillUEditor(content) ||
                   await fillRichMediaEditor(content);
      }

      return success;
    } catch (error) {
      console.error('填充内容失败:', error);
      return false;
    }
  }

  // 填充新版编辑器
  async function fillNewEditor(content) {
    try {
      const selectors = [
        '.weui-desktop-editor__wrp iframe',
        '.weui-desktop-editor__wrp .ql-editor',
        '[data-testid="editor"] iframe',
        '.js_editor iframe'
      ];

      for (const selector of selectors) {
        const editor = document.querySelector(selector);
        if (editor && editor.offsetParent !== null) {
          if (editor.tagName === 'IFRAME') {
            return await fillIframeEditor(editor, content);
          } else {
            return fillDirectEditor(editor, content);
          }
        }
      }
      return false;
    } catch (error) {
      console.error('新版编辑器填充失败:', error);
      return false;
    }
  }

  // 填充UEditor
  async function fillUEditor(content) {
    try {
      const selectors = [
        '#ueditor_0',
        '.edui-editor-body',
        '.edui-body-container',
        'iframe[id*="ueditor"]'
      ];

      for (const selector of selectors) {
        const editor = document.querySelector(selector);
        if (editor && editor.offsetParent !== null) {
          if (editor.tagName === 'IFRAME') {
            return await fillIframeEditor(editor, content);
          } else {
            return fillDirectEditor(editor, content);
          }
        }
      }
      return false;
    } catch (error) {
      console.error('UEditor填充失败:', error);
      return false;
    }
  }

  // 填充富文本编辑器
  async function fillRichMediaEditor(content) {
    try {
      const selectors = [
        '.rich_media_editor iframe',
        '.rich_media_content',
        '#js_content'
      ];

      for (const selector of selectors) {
        const editor = document.querySelector(selector);
        if (editor && editor.offsetParent !== null) {
          if (editor.tagName === 'IFRAME') {
            return await fillIframeEditor(editor, content);
          } else {
            return fillDirectEditor(editor, content);
          }
        }
      }
      return false;
    } catch (error) {
      console.error('富文本编辑器填充失败:', error);
      return false;
    }
  }

  // 填充iframe编辑器
  async function fillIframeEditor(iframe, content) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc) return false;

      const body = iframeDoc.body || iframeDoc.querySelector('[contenteditable]');
      if (body) {
        // 清空现有内容
        body.innerHTML = '';

        // 设置新内容
        body.innerHTML = content;

        // 触发各种事件
        body.dispatchEvent(new Event('input', { bubbles: true }));
        body.dispatchEvent(new Event('change', { bubbles: true }));

        // 尝试触发iframe外部的事件
        iframe.dispatchEvent(new Event('input', { bubbles: true }));

        return true;
      }
      return false;
    } catch (error) {
      console.error('iframe编辑器填充失败:', error);
      return false;
    }
  }

  // 填充直接编辑器
  function fillDirectEditor(editor, content) {
    try {
      // 清空现有内容
      editor.innerHTML = '';

      // 设置新内容
      editor.innerHTML = content;

      // 触发事件
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));

      return true;
    } catch (error) {
      console.error('直接编辑器填充失败:', error);
      return false;
    }
  }

  // 主要的填充函数
  async function fillWechatEditor(data, isAutoFill = false) {
    if (!isWechatEditor()) {
      showNotification('请在公众号编辑页面使用此功能', 'error');
      return { success: false, error: '不在公众号编辑页面' };
    }

    try {
      const editorType = detectEditorType();
      showNotification(`开始填充内容... (检测到${editorType}编辑器)`, 'info');

      let titleSuccess = false;
      let contentSuccess = false;
      let errors = [];

      // 等待页面完全加载
      if (isAutoFill) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 填充标题
      if (data.title) {
        titleSuccess = await fillTitle(data.title);
        if (!titleSuccess) {
          errors.push('标题填充失败');
        }
      }

      // 等待一下再填充内容
      await new Promise(resolve => setTimeout(resolve, 500));

      // 填充内容
      if (data.content) {
        contentSuccess = await fillContent(data.content);
        if (!contentSuccess) {
          errors.push('内容填充失败');
        }
      }

      // 显示结果
      if (titleSuccess && contentSuccess) {
        showNotification('内容填充成功！', 'success');
        return { success: true };
      } else if (titleSuccess || contentSuccess) {
        const message = `部分内容填充成功 (${errors.join(', ')})`;
        showNotification(message, 'info');
        return { success: true, partial: true, errors };
      } else {
        const message = `填充失败: ${errors.join(', ')}`;
        showNotification(message, 'error');
        return { success: false, errors };
      }

    } catch (error) {
      console.error('填充过程出错:', error);
      showNotification('填充失败，请重试', 'error');
      return { success: false, error: error.message };
    }
  }

  // 监听来自popup和background的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script收到消息:', message);

    if (message.action === 'fillContent') {
      fillWechatEditor(message.data, false)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // 保持消息通道开放
    }

    if (message.action === 'autoFillContent') {
      // 自动填充（来自一键发布）
      fillWechatEditor(message.data, true)
        .then(result => {
          if (result.success) {
            showNotification('一键发布成功！内容已自动填充', 'success');
          }
          sendResponse(result);
        })
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (message.action === 'contentUpdated') {
      // 通知有新内容可用
      showNotification('检测到新的字流内容，请打开插件填充', 'info');
    }
  });

  // 页面加载完成后的初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('字流助手已加载');
    });
  } else {
    console.log('字流助手已加载');
  }

})();
