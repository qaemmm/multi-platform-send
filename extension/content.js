// 字流助手 - 简化版 Content Script
console.log('🚀 字流助手已加载');

// 在页面上添加一个明显的标识
document.documentElement.setAttribute('data-ziliu-loaded', 'true');
window.ziLiuExtensionLoaded = true;

// 查找微信公众号编辑器元素（简化版本）
function findWeChatEditorElements() {
  const elements = {
    titleInput: null,
    authorInput: null,
    contentEditor: null,
    digestInput: null
  };

  // 查找标题输入框
  elements.titleInput = document.querySelector('input[placeholder="请在这里输入标题"]');

  // 查找作者输入框
  elements.authorInput = document.querySelector('input[placeholder="请输入作者"]');

  // 查找正文编辑器
  elements.contentEditor = document.querySelector('[contenteditable="true"]') ||
                          Array.from(document.querySelectorAll('*')).find(el =>
                            el.textContent && el.textContent.includes('从这里开始写正文'));

  // 查找摘要输入框
  elements.digestInput = document.querySelector('textarea[placeholder*="选填"]') ||
                        document.querySelector('textarea[placeholder*="摘要"]');

  console.log('🔍 微信编辑器元素查找结果:', {
    标题输入框: !!elements.titleInput,
    作者输入框: !!elements.authorInput,
    正文编辑器: !!elements.contentEditor,
    摘要输入框: !!elements.digestInput
  });

  return elements;
}

// 获取当前页面的token
function getWeChatToken() {
  // 从URL中获取token
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) return token;

  // 从cookie或其他地方获取token
  const match = document.cookie.match(/token=(\d+)/);
  return match ? match[1] : null;
}

// 上传图片到微信CDN
async function uploadImageToWeChat(imgUrl) {
  try {
    const token = getWeChatToken();
    if (!token) {
      console.error('未找到微信token');
      return imgUrl; // 返回原URL
    }

    // 构建FormData
    const formData = new FormData();
    formData.append('t', 'ajax-editor-upload-img');
    formData.append('imgUrl', imgUrl);
    formData.append('fingerprint', 'e0bafea54cd755e5947b9d1e8206bdff');
    formData.append('token', token);
    formData.append('lang', 'zh_CN');
    formData.append('f', 'json');
    formData.append('ajax', '1');

    // 发送请求
    const response = await fetch(`/cgi-bin/uploadimg2cdn?lang=zh_CN&token=${token}&t=${Date.now() / 1000}`, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });

    if (!response.ok) {
      console.error('图片上传失败:', response.status);
      return imgUrl;
    }

    const data = await response.json();

    // 解析响应
    if (data.base_resp && data.base_resp.ret === 0 && data.img_format === 'png') {
      const wxUrl = data.url;
      console.log('✅ 图片转换成功:', imgUrl, '->', wxUrl);
      return wxUrl;
    } else {
      console.error('图片上传返回错误:', data);
      return imgUrl;
    }
  } catch (error) {
    console.error('图片上传异常:', error);
    return imgUrl; // 出错时返回原URL
  }
}

// 转换内容中的所有图片URL
async function convertImagesInContent(content) {
  // 提取所有图片URL
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images = [];
  let match;

  while ((match = imgRegex.exec(content)) !== null) {
    images.push({
      fullMatch: match[0],
      url: match[1]
    });
  }

  if (images.length === 0) {
    return content;
  }

  console.log(`🔍 找到 ${images.length} 张图片需要转换`);

    // 发送进度更新
  chrome.runtime.sendMessage({
    action: 'updateProgress',
    message: `正在转换 ${images.length} 张图片...`
  });

  // 并发上传所有图片
  const uploadPromises = images.map(async (img) => {
    const wxUrl = await uploadImageToWeChat(img.url);
    return {
      original: img.fullMatch,
      newTag: img.fullMatch.replace(img.url, wxUrl)
    };
  });

  const results = await Promise.all(uploadPromises);

  // 发送进度更新
  chrome.runtime.sendMessage({
    action: 'updateProgress',
    message: '图片转换完成，正在填充内容...'
  });

  // 替换内容中的图片URL
  let processedContent = content;
  results.forEach(result => {
    processedContent = processedContent.replace(result.original, result.newTag);
  });

  return processedContent;
}

// 预处理内容，解决格式问题
async function preprocessContent(content) {
  // 1. 先转换图片
  let processedContent = await convertImagesInContent(content);
  console.log('✨ 图片转换完成');

  // 2. 清理多余的空格和换行
  processedContent = processedContent
    // 移除连续的空格（保留单个空格）
    .replace(/\s{3,}/g, ' ')
    // 清理段落间多余的换行
    .replace(/(<\/p>)\s*(<p[^>]*>)/g, '$1$2')
    // 清理标题间多余的换行
    .replace(/(<\/h[1-6]>)\s*(<[^>]+>)/g, '$1$2');

  // 3. 修复代码块格式，确保换行保持
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

  // 4. 优化section标签结构
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

    // 0. 预处理内容（包括图片转换）
    const processedContent = await preprocessContent(content);
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
    const elements = findWeChatEditorElements();

    if (elements.titleInput && title) {
      elements.titleInput.value = title;
      elements.titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      elements.titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ 标题填充完成:', title);
      return true;
    }

    console.log('⚠️ 未找到标题输入框或标题为空');
    return false;
  } catch (error) {
    console.error('❌ 标题填充失败:', error);
    return false;
  }
}

// 填充作者信息
async function fillAuthor(authorName) {
  try {
    // 查找作者输入框
    const authorElement = document.querySelector('input[placeholder*="作者"]') ||
                         document.querySelector('input[placeholder*="请输入作者"]') ||
                         document.querySelector('.js_author') ||
                         document.querySelector('#js_author');

    if (authorElement && authorName) {
      authorElement.value = authorName;
      authorElement.dispatchEvent(new Event('input', { bubbles: true }));
      authorElement.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ 作者信息填充完成:', authorName);
      return true;
    }

    console.log('⚠️ 未找到作者输入框或作者名为空');
    return false;
  } catch (error) {
    console.error('❌ 作者信息填充失败:', error);
    return false;
  }
}

// 填充摘要信息
async function fillDigest(digest) {
  try {
    const elements = findWeChatEditorElements();

    if (elements.digestInput && digest) {
      elements.digestInput.value = digest;
      elements.digestInput.dispatchEvent(new Event('input', { bubbles: true }));
      elements.digestInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ 摘要填充完成:', digest);
      return true;
    }

    console.log('⚠️ 未找到摘要输入框或摘要为空');
    return false;
  } catch (error) {
    console.error('❌ 摘要填充失败:', error);
    return false;
  }
}

// Markdown转HTML的简单实现
function markdownToHtml(markdown) {
  if (!markdown || !markdown.trim()) return '';

  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 8px 0;" />')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left: 4px solid #e5e7eb; padding-left: 16px; margin: 16px 0; color: #6b7280;">$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^1\. (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">')
    .replace(/\n/g, '<br>')
    // 处理精选文章占位符
    .replace(/{{featured-articles:(\d+)}}/g, function(match, count) {
      return `<div style="border: 2px dashed #3b82f6; padding: 16px; border-radius: 8px; background: #eff6ff; margin: 16px 0;">
        <h4 style="color: #1d4ed8; margin: 0 0 8px 0;">📚 精选文章推荐</h4>
        <p style="color: #1d4ed8; margin: 0; font-size: 14px;">插件将智能匹配 ${count} 篇相关文章并插入到此位置</p>
      </div>`;
    });
}

// 生成开头定制内容
function generateHeaderContent(headerContent) {
  if (!headerContent || !headerContent.trim()) return '';

  return markdownToHtml(headerContent) + '\n\n';
}

// 生成末尾定制内容
function generateFooterContent(footerContent) {
  if (!footerContent || !footerContent.trim()) return '';

  return '\n\n<hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">\n' + markdownToHtml(footerContent);
}

// 应用预设设置（简化版本）
async function applyPresetSettings(preset) {
  if (!preset) {
    console.log('⚠️ 没有预设信息，跳过预设应用');
    return;
  }

  console.log('🔧 开始应用预设设置:', preset.name);

  try {
    // 获取编辑器元素
    const elements = findWeChatEditorElements();

    // 1. 填充作者信息
    if (preset.authorName && elements.authorInput) {
      elements.authorInput.value = preset.authorName;
      elements.authorInput.dispatchEvent(new Event('input', { bubbles: true }));
      elements.authorInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ 作者信息填充完成:', preset.authorName);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('✅ 预设设置应用完成');
    console.log('📝 预设详情:', {
      作者: preset.authorName || '未设置',
      AI摘要: preset.autoGenerateDigest ? '启用' : '关闭',
      开头内容: preset.headerContent ? '已设置' : '未设置',
      末尾内容: preset.footerContent ? '已设置' : '未设置'
    });
  } catch (error) {
    console.error('❌ 预设设置应用失败:', error);
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
    const { title, content, preset } = request.data;

    // 使用Promise来处理异步操作
    (async () => {
      try {
        let success = false;
        let message = '';

        // 应用预设设置
        if (preset) {
          await applyPresetSettings(preset);
        }

        // 填充标题
        if (title) {
          const titleSuccess = await fillTitle(title);
          if (!titleSuccess) {
            console.log('⚠️ 标题填充失败，但继续处理其他内容');
          }
        }

        // 填充摘要（如果预设启用了自动摘要生成）
        if (preset && preset.autoGenerateDigest && content) {
          // 自动生成摘要（取正文前120个字符）
          const autoDigest = content.replace(/<[^>]*>/g, '').substring(0, 120) + '...';
          const digestSuccess = await fillDigest(autoDigest);
          if (!digestSuccess) {
            console.log('⚠️ 摘要填充失败，但继续处理其他内容');
          }
        }

        // 填充内容（包含预设增强内容）
        if (content) {
          const elements = findWeChatEditorElements();
          if (elements.contentEditor) {
            // 构建完整内容
            let fullContent = content;

            // 添加预设的定制内容
            if (preset) {
              // 添加开头定制内容
              if (preset.headerContent) {
                fullContent = generateHeaderContent(preset.headerContent) + fullContent;
              }

              // 添加末尾定制内容
              if (preset.footerContent) {
                fullContent += generateFooterContent(preset.footerContent);
              }
            }

            success = await fillContent(elements.contentEditor, fullContent);
            message = success ? '填充成功（包含预设增强内容）' : '填充失败';
          } else {
            console.log('❌ 未找到编辑器');
            message = '未找到编辑器';
          }
        }

        // 直接通过sendResponse返回结果
        sendResponse({
          success: success,
          error: success ? null : message
        });

      } catch (error) {
        console.error('❌ 处理失败:', error);
        sendResponse({
          success: false,
          error: '处理失败: ' + error.message
        });
      }
    })();

    // 返回true表示将异步发送响应
    return true;
  }

  return false;
});
