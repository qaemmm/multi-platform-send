// 字流助手 - 简化版 Content Script
console.log('🚀 字流助手已加载');

// 在页面上添加一个明显的标识
document.documentElement.setAttribute('data-ziliu-loaded', 'true');
window.ziLiuExtensionLoaded = true;

// 查找微信公众号编辑器
function findWeChatEditor() {
  // 只关注ProseMirror编辑器（微信当前使用的编辑器）
  const proseMirror = document.querySelector('#ueditor_0 .ProseMirror');
  if (proseMirror && proseMirror.contentEditable === 'true') {
    console.log('✅ 找到微信ProseMirror编辑器');
    return proseMirror;
  }
  
  console.log('❌ 未找到微信编辑器');
  return null;
}

// 填充内容到编辑器
async function fillContent(editor, content) {
  try {
    console.log('🔧 开始填充内容...');
    
    // 1. 聚焦编辑器
    editor.focus();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 2. 清空现有内容
    editor.innerHTML = '';
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 3. 插入新内容
    editor.innerHTML = content;
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 4. 触发必要的事件
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    
    // 5. 重新聚焦
    editor.focus();
    
    console.log('✅ 内容填充完成');
    return true;
  } catch (error) {
    console.error('❌ 填充失败:', error);
    return false;
  }
}

// 填充标题
async function fillTitle(title) {
  try {
    const titleElement = document.querySelector('.js_title') || 
                        document.querySelector('#js_title') ||
                        document.querySelector('[placeholder*="标题"]');
    
    if (titleElement) {
      if (titleElement.tagName === 'INPUT' || titleElement.tagName === 'TEXTAREA') {
        titleElement.value = title;
      } else {
        titleElement.textContent = title;
      }
      titleElement.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ 标题填充完成');
      return true;
    }
    
    console.log('⚠️ 未找到标题元素');
    return false;
  } catch (error) {
    console.error('❌ 标题填充失败:', error);
    return false;
  }
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 收到消息:', request.action);

  if (request.action === 'ping') {
    sendResponse({ status: 'ok', message: '插件运行正常' });
    return true;
  }

  if (request.action === 'fillContent') {
    const { title, content } = request.data;
    
    (async () => {
      try {
        let success = false;
        
        // 填充标题
        if (title) {
          await fillTitle(title);
        }
        
        // 填充内容
        if (content) {
          const editor = findWeChatEditor();
          if (editor) {
            success = await fillContent(editor, content);
          } else {
            console.log('❌ 未找到编辑器');
          }
        }
        
        // 发送结果
        chrome.runtime.sendMessage({
          action: 'fillResult',
          success: success,
          message: success ? '填充成功' : '填充失败'
        });
        
      } catch (error) {
        console.error('❌ 处理失败:', error);
        chrome.runtime.sendMessage({
          action: 'fillResult',
          success: false,
          message: '处理失败: ' + error.message
        });
      }
    })();

    sendResponse({ status: 'processing' });
    return true;
  }

  return false;
});
