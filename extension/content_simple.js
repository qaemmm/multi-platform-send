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

// 预处理内容，解决格式问题
function preprocessContent(content) {
  // 1. 清理多余的空格和换行
  let processedContent = content
    // 移除连续的空格（保留单个空格）
    .replace(/\s{3,}/g, ' ')
    // 清理段落间多余的换行
    .replace(/(<\/p>)\s*(<p[^>]*>)/g, '$1$2')
    // 清理标题间多余的换行
    .replace(/(<\/h[1-6]>)\s*(<[^>]+>)/g, '$1$2');

  // 2. 修复代码块格式，确保换行保持
  processedContent = processedContent.replace(
    /<code[^>]*>([\s\S]*?)<\/code>/g,
    (match, codeContent) => {
      // 保护代码块中的换行符
      const protectedCode = codeContent
        .replace(/\n/g, '<br>')
        .replace(/\s{2,}/g, (spaces) => '&nbsp;'.repeat(spaces.length));
      return match.replace(codeContent, protectedCode);
    }
  );

  // 3. 优化section标签结构
  processedContent = processedContent
    // 移除不必要的嵌套section
    .replace(/<section[^>]*>\s*<section[^>]*>/g, '<section>')
    .replace(/<\/section>\s*<\/section>/g, '</section>')
    // 简化section属性
    .replace(/<section[^>]*>/g, '<section>');

  return processedContent;
}

// 填充内容到编辑器
async function fillContent(editor, content) {
  try {
    console.log('🔧 开始填充内容...');

    // 0. 预处理内容
    const processedContent = preprocessContent(content);
    console.log('✨ 内容预处理完成');

    // 1. 聚焦编辑器
    editor.focus();
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. 清空现有内容
    editor.innerHTML = '';
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. 插入新内容
    editor.innerHTML = processedContent;
    await new Promise(resolve => setTimeout(resolve, 200));

    // 4. 特殊处理：确保代码块格式正确
    const codeElements = editor.querySelectorAll('code');
    codeElements.forEach(codeEl => {
      // 确保代码块有正确的样式
      if (!codeEl.style.whiteSpace) {
        codeEl.style.whiteSpace = 'pre-wrap';
      }
      if (!codeEl.style.fontFamily) {
        codeEl.style.fontFamily = 'Monaco, Consolas, "Lucida Console", monospace';
      }
    });

    // 5. 触发必要的事件（减少事件数量，避免过度触发）
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    // 6. 重新聚焦，确保编辑器状态正确
    editor.focus();
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
