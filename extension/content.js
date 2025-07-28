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
        // ProseMirror编辑器（微信新版编辑器）- 最高优先级
        '#ueditor_0 .ProseMirror',
        '.ProseMirror[contenteditable="true"]',
        '.rich_media_content .ProseMirror',
        // 其他编辑器
        '.weui-desktop-editor__wrp iframe',
        '.weui-desktop-editor__wrp .ql-editor',
        '.weui-desktop-editor__wrp [contenteditable]',
        '[data-testid="editor"] iframe',
        '[data-testid="editor"] [contenteditable]',
        '.js_editor iframe',
        '.js_editor [contenteditable]',
        // 添加更多可能的选择器
        '.rich_media_content [contenteditable]',
        '.rich_media_editor [contenteditable]',
        '#js_content',
        '.editable-div'
        // 移除通用的 [contenteditable="true"] 避免匹配到错误元素
      ];

      console.log('尝试填充新版编辑器...');

      for (const selector of selectors) {
        const editor = document.querySelector(selector);
        console.log(`🔍 检查选择器 ${selector}:`, editor);

        if (editor && editor.offsetParent !== null) {
          console.log(`✅ 找到可见编辑器: ${selector}`, editor);

          // 检查是否真的可编辑
          const isEditable = editor.contentEditable === 'true' ||
                           editor.tagName === 'IFRAME' ||
                           editor.tagName === 'TEXTAREA' ||
                           editor.tagName === 'INPUT';

          console.log(`📊 编辑器可编辑性: ${isEditable}`);

          if (isEditable) {
            if (editor.tagName === 'IFRAME') {
              console.log('🖼️ 使用iframe编辑器填充方法');
              const result = await fillIframeEditor(editor, content);
              if (result) return result;
            } else {
              // 特殊处理ProseMirror编辑器
              if (editor.classList.contains('ProseMirror') || selector.includes('ProseMirror')) {
                console.log('🎯 使用ProseMirror编辑器填充方法 - 这是正确的!');
                const result = await fillProseMirrorEditor(editor, content);
                if (result) return result;
              } else if (selector === '#ueditor_0' || editor.id === 'ueditor_0') {
                console.log('🔍 检查ueditor_0容器中的ProseMirror编辑器');
                // 如果找到的是ueditor_0容器，尝试找其中的ProseMirror编辑器
                const proseMirrorEditor = editor.querySelector('.ProseMirror');
                if (proseMirrorEditor) {
                  console.log('✅ 在ueditor_0容器中找到ProseMirror编辑器，使用ProseMirror方法:', proseMirrorEditor);
                  const result = await fillProseMirrorEditor(proseMirrorEditor, content);
                  if (result) return result;
                } else {
                  console.log('❌ 在ueditor_0容器中未找到ProseMirror，使用直接编辑器方法');
                  const result = await fillDirectEditor(editor, content);
                  if (result) return result;
                }
              } else {
                console.log('⚠️ 使用直接编辑器填充方法 - 这可能导致问题');
                const result = await fillDirectEditor(editor, content);
                if (result) return result;
              }
            }
          }
        }
      }

      console.log('新版编辑器填充失败，未找到合适的编辑器');
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
        console.log('找到iframe编辑器body:', body);

        // 聚焦到编辑器
        body.focus();

        // 等待聚焦完成
        await new Promise(resolve => setTimeout(resolve, 100));

        // 选中所有内容并删除
        const selection = iframeDoc.getSelection();
        const range = iframeDoc.createRange();
        range.selectNodeContents(body);
        selection.removeAllRanges();
        selection.addRange(range);

        // 使用execCommand删除现有内容
        iframeDoc.execCommand('delete', false, null);

        // 等待删除完成
        await new Promise(resolve => setTimeout(resolve, 100));

        // 使用execCommand插入HTML内容
        const success = iframeDoc.execCommand('insertHTML', false, content);
        console.log('execCommand insertHTML结果:', success);

        if (!success) {
          // 如果execCommand失败，尝试直接设置innerHTML
          body.innerHTML = content;
        }

        // 触发完整的事件序列
        await triggerEditorEvents(body, iframeDoc);

        // 触发iframe外部的事件
        iframe.dispatchEvent(new Event('input', { bubbles: true }));
        iframe.dispatchEvent(new Event('change', { bubbles: true }));

        // 尝试触发微信编辑器可能监听的自定义事件
        body.dispatchEvent(new CustomEvent('contentChanged', { bubbles: true }));
        iframe.dispatchEvent(new CustomEvent('contentChanged', { bubbles: true }));

        return true;
      }
      return false;
    } catch (error) {
      console.error('iframe编辑器填充失败:', error);
      return false;
    }
  }

  // 触发编辑器事件序列
  async function triggerEditorEvents(element, doc = document) {
    const events = [
      'focus',
      'beforeinput',
      'compositionstart',
      'input',
      'compositionend',
      'change',
      'blur'
    ];

    for (const eventType of events) {
      try {
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        element.dispatchEvent(event);
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.log(`触发${eventType}事件失败:`, e);
      }
    }

    // 触发键盘事件模拟用户输入
    const keyEvents = ['keydown', 'keypress', 'keyup'];
    for (const eventType of keyEvents) {
      try {
        const event = new KeyboardEvent(eventType, {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter'
        });
        element.dispatchEvent(event);
        await new Promise(resolve => setTimeout(resolve, 30));
      } catch (e) {
        console.log(`触发${eventType}事件失败:`, e);
      }
    }
  }

  // 填充直接编辑器
  async function fillDirectEditor(editor, content) {
    try {
      console.log('填充直接编辑器:', editor);

      // 聚焦到编辑器
      editor.focus();

      // 等待聚焦完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 选中所有内容
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);

      // 使用execCommand删除现有内容
      document.execCommand('delete', false, null);

      // 等待删除完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 使用execCommand插入HTML内容
      const success = document.execCommand('insertHTML', false, content);
      console.log('execCommand insertHTML结果:', success);

      if (!success) {
        // 如果execCommand失败，尝试直接设置innerHTML
        editor.innerHTML = content;
      }

      // 触发完整的事件序列
      await triggerEditorEvents(editor);

      // 尝试触发微信编辑器可能监听的自定义事件
      editor.dispatchEvent(new CustomEvent('contentChanged', { bubbles: true }));

      return true;
    } catch (error) {
      console.error('直接编辑器填充失败:', error);
      return false;
    }
  }

  // 填充ProseMirror编辑器（微信新版编辑器）
  async function fillProseMirrorEditor(editor, content) {
    try {
      console.log('填充ProseMirror编辑器:', editor);

      // 聚焦到编辑器
      editor.focus();

      // 等待聚焦完成
      await new Promise(resolve => setTimeout(resolve, 200));

      // 清空现有内容 - ProseMirror特殊处理
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);

      // 删除现有内容
      document.execCommand('delete', false, null);

      // 等待删除完成
      await new Promise(resolve => setTimeout(resolve, 200));

      // 尝试多种方法插入内容
      let success = false;

      // 方法1: 使用execCommand insertHTML
      success = document.execCommand('insertHTML', false, content);
      console.log('ProseMirror execCommand insertHTML结果:', success);

      if (!success) {
        // 方法2: 模拟粘贴操作
        try {
          const clipboardData = new DataTransfer();
          clipboardData.setData('text/html', content);
          clipboardData.setData('text/plain', content.replace(/<[^>]*>/g, ''));

          const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: clipboardData,
            bubbles: true,
            cancelable: true
          });

          editor.dispatchEvent(pasteEvent);
          success = true;
          console.log('ProseMirror 模拟粘贴成功');
        } catch (e) {
          console.log('ProseMirror 模拟粘贴失败:', e);
        }
      }

      if (!success) {
        // 方法3: 直接设置innerHTML（最后的备选方案）
        editor.innerHTML = content;
        console.log('ProseMirror 使用innerHTML设置内容');
      }

      // 触发ProseMirror特定的事件
      await triggerProseMirrorEvents(editor);

      // 检查内容是否成功插入
      const hasContent = editor.textContent.trim().length > 0 || editor.innerHTML.trim().length > 0;
      console.log('ProseMirror 内容插入检查:', hasContent, editor.textContent.length);

      return hasContent;
    } catch (error) {
      console.error('ProseMirror编辑器填充失败:', error);
      return false;
    }
  }

  // 触发ProseMirror特定的事件
  async function triggerProseMirrorEvents(editor) {
    const events = [
      'focus',
      'beforeinput',
      'compositionstart',
      'input',
      'compositionend',
      'change',
      'keydown',
      'keyup'
    ];

    for (const eventType of events) {
      try {
        let event;
        if (eventType.startsWith('key')) {
          event = new KeyboardEvent(eventType, {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter'
          });
        } else {
          event = new Event(eventType, { bubbles: true, cancelable: true });
        }

        editor.dispatchEvent(event);
        await new Promise(resolve => setTimeout(resolve, 30));
      } catch (e) {
        console.log(`触发ProseMirror ${eventType}事件失败:`, e);
      }
    }

    // 触发可能的自定义事件
    try {
      editor.dispatchEvent(new CustomEvent('contentChanged', { bubbles: true }));
      editor.dispatchEvent(new CustomEvent('prosemirror-update', { bubbles: true }));

      // 尝试触发父容器的事件
      const ueditor = document.querySelector('#ueditor_0');
      if (ueditor) {
        ueditor.dispatchEvent(new CustomEvent('contentChanged', { bubbles: true }));
      }
    } catch (e) {
      console.log('触发ProseMirror自定义事件失败:', e);
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

    if (message.action === 'ping') {
      // 响应ping消息，确认content script已加载
      sendResponse({ success: true, loaded: true });
      return true;
    }

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
      console.log('字流助手Content Script已加载 - DOMContentLoaded');
      console.log('当前页面URL:', window.location.href);
      console.log('是否为微信编辑器:', isWechatEditor());
    });
  } else {
    console.log('字流助手Content Script已加载 - Document Ready');
    console.log('当前页面URL:', window.location.href);
    console.log('是否为微信编辑器:', isWechatEditor());
  }

})();
