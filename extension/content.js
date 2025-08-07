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

// 设置原创状态
async function setOriginalStatus(isOriginal) {
  try {
    // 查找原创复选框
    const originalCheckbox = document.querySelector('input[type="checkbox"]#original') ||
                            document.querySelector('input[type="checkbox"][name*="original"]') ||
                            document.querySelector('.js_original input[type="checkbox"]');

    if (originalCheckbox) {
      if (originalCheckbox.checked !== isOriginal) {
        originalCheckbox.click();
        console.log('✅ 原创状态设置完成:', isOriginal ? '原创' : '非原创');
      }
      return true;
    }

    console.log('⚠️ 未找到原创复选框');
    return false;
  } catch (error) {
    console.error('❌ 原创状态设置失败:', error);
    return false;
  }
}

// 生成精选文章占位符（由公众号编辑器智能匹配）
function generateFeaturedArticlesPlaceholder() {
  return '\n\n<hr>\n<p>📚 <strong>[精选文章推荐]</strong> - 插件将智能匹配相关文章</p>\n';
}

// 生成定制内容HTML
function generateCustomContentHTML(content) {
  if (!content || !content.trim()) return '';

  return '\n\n<hr>\n' + content + '\n';
}

// 生成公众号推荐HTML
function generateWechatRecommendationHTML(accountName) {
  if (!accountName || !accountName.trim()) return '';

  return `\n\n<hr>\n<p>📱 <strong>推荐关注：${accountName}</strong> - 插件将自动插入公众号卡片</p>\n`;
}

// 应用预设设置
async function applyPresetSettings(preset) {
  if (!preset) {
    console.log('⚠️ 没有预设信息，跳过预设应用');
    return;
  }

  console.log('🔧 开始应用预设设置:', preset.name);

  try {
    // 填充作者信息
    if (preset.authorName) {
      await fillAuthor(preset.authorName);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 设置原创状态
    await setOriginalStatus(preset.isOriginal);
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('✅ 预设设置应用完成');
    console.log('📝 预设详情:', {
      作者: preset.authorName,
      原创: preset.isOriginal ? '是' : '否',
      赞赏: preset.enableReward ? '开启' : '关闭',
      自动封面: preset.autoSelectCover ? '是' : '否',
      自动摘要: preset.autoGenerateDigest ? '是' : '否',
      精选文章: preset.enableFeaturedArticles ? '启用' : '关闭',
      定制内容: preset.customContent ? '已设置' : '未设置',
      推荐公众号: preset.recommendedAccount || '未设置'
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
          await fillTitle(title);
        }

        // 填充内容（包含预设增强内容）
        if (content) {
          const editor = findWeChatEditor();
          if (editor) {
            // 构建完整内容
            let fullContent = content;

            // 添加预设的增强内容
            if (preset) {
              // 添加精选文章占位符
              if (preset.enableFeaturedArticles) {
                fullContent += generateFeaturedArticlesPlaceholder();
              }

              // 添加定制内容
              if (preset.customContent) {
                fullContent += generateCustomContentHTML(preset.customContent);
              }

              // 添加公众号推荐
              if (preset.recommendedAccount) {
                fullContent += generateWechatRecommendationHTML(preset.recommendedAccount);
              }
            }

            success = await fillContent(editor, fullContent);
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
