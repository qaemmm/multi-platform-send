// 字流助手 - 公众号内容填充脚本

(function() {
  'use strict';

  // 检查是否在公众号编辑页面
  function isWechatEditor() {
    return window.location.hostname === 'mp.weixin.qq.com' && 
           (window.location.pathname.includes('/cgi-bin/appmsg') || 
            window.location.pathname.includes('/advanced/tmpl'));
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
      // 尝试多种可能的标题输入框选择器
      const titleSelectors = [
        '#title',
        'input[placeholder*="标题"]',
        'input[placeholder*="请输入标题"]',
        '.title input',
        '.weui-desktop-form__input[placeholder*="标题"]'
      ];

      let titleInput = null;
      for (const selector of titleSelectors) {
        titleInput = document.querySelector(selector);
        if (titleInput) break;
      }

      if (!titleInput) {
        // 如果直接查找不到，等待页面加载
        titleInput = await waitForElement(titleSelectors[0], 5000);
      }

      if (titleInput) {
        titleInput.focus();
        titleInput.value = title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
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
      // 尝试多种可能的编辑器选择器
      const editorSelectors = [
        '#ueditor_0',
        '.edui-editor-body',
        '.edui-body-container',
        'iframe[id*="ueditor"]',
        '.weui-desktop-editor__wrp iframe'
      ];

      let editor = null;
      for (const selector of editorSelectors) {
        editor = document.querySelector(selector);
        if (editor) break;
      }

      if (!editor) {
        editor = await waitForElement(editorSelectors[0], 5000);
      }

      if (editor) {
        // 如果是iframe，需要访问其内容
        if (editor.tagName === 'IFRAME') {
          try {
            const iframeDoc = editor.contentDocument || editor.contentWindow.document;
            const body = iframeDoc.body;
            if (body) {
              body.innerHTML = content;
              // 触发编辑器更新事件
              body.dispatchEvent(new Event('input', { bubbles: true }));
              return true;
            }
          } catch (e) {
            console.error('无法访问iframe内容:', e);
          }
        } else {
          // 直接设置内容
          editor.innerHTML = content;
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
      }
    } catch (error) {
      console.error('填充内容失败:', error);
    }
    return false;
  }

  // 主要的填充函数
  async function fillWechatEditor(data) {
    if (!isWechatEditor()) {
      showNotification('请在公众号编辑页面使用此功能', 'error');
      return;
    }

    try {
      showNotification('开始填充内容...', 'info');

      let titleSuccess = false;
      let contentSuccess = false;

      // 填充标题
      if (data.title) {
        titleSuccess = await fillTitle(data.title);
      }

      // 填充内容
      if (data.content) {
        contentSuccess = await fillContent(data.content);
      }

      // 显示结果
      if (titleSuccess && contentSuccess) {
        showNotification('内容填充成功！', 'success');
      } else if (titleSuccess || contentSuccess) {
        showNotification('部分内容填充成功', 'info');
      } else {
        showNotification('填充失败，请手动复制粘贴', 'error');
      }

    } catch (error) {
      console.error('填充过程出错:', error);
      showNotification('填充失败，请重试', 'error');
    }
  }

  // 监听来自popup的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fillContent') {
      fillWechatEditor(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // 保持消息通道开放
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
