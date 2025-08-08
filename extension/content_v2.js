// 微信公众号内容填充插件 - 简化版本
// 基于 Playwright 测试结果重写，使用最简单有效的方法

console.log('🚀 Ziliu 微信公众号插件 v2.0 已加载');

// 查找微信编辑器元素
function findWeChatEditorElements() {
  const titleInput = document.querySelector('input[placeholder*="标题"], input[name*="title"]');
  const authorInput = document.querySelector('input[placeholder*="作者"], input[name*="author"]');
  const summaryInput = document.querySelector('textarea[placeholder*="摘要"], textarea[placeholder*="选填"]');
  const contentEditor = document.querySelector('.ProseMirror');

  return {
    titleInput,
    authorInput,
    summaryInput,
    contentEditor,
    isWeChatEditor: !!(titleInput && contentEditor)
  };
}

// 上传图片到微信服务器
async function uploadImageToWeChat(imageUrl) {
  try {
    console.log(`🔄 开始转换图片: ${imageUrl}`);
    
    const response = await fetch('https://mp.weixin.qq.com/cgi-bin/uploadimg2cdn?action=upload_img&f=json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `url=${encodeURIComponent(imageUrl)}`,
      credentials: 'include'
    });

    const data = await response.json();
    if (data && data.url) {
      console.log(`✅ 图片转换成功: ${imageUrl} -> ${data.url}`);
      return data.url;
    } else {
      console.warn(`⚠️ 图片转换失败: ${imageUrl}`, data);
      return imageUrl;
    }
  } catch (error) {
    console.error(`❌ 图片转换出错: ${imageUrl}`, error);
    return imageUrl;
  }
}

// 转换内容中的所有图片
async function convertImagesInContent(content) {
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

  // 并发上传所有图片
  const uploadPromises = images.map(async (img) => {
    const wxUrl = await uploadImageToWeChat(img.url);
    return {
      original: img.fullMatch,
      newTag: img.fullMatch.replace(img.url, wxUrl)
    };
  });

  const results = await Promise.all(uploadPromises);

  // 替换内容中的图片URL
  let processedContent = content;
  results.forEach(result => {
    processedContent = processedContent.replace(result.original, result.newTag);
  });

  return processedContent;
}

// 填充内容到编辑器 - 简化版本
async function fillContent(elements, data) {
  try {
    console.log('🔧 开始填充内容...');

    // 1. 填充标题
    if (elements.titleInput && data.title) {
      elements.titleInput.value = data.title;
      elements.titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ 标题填充完成');
    }

    // 2. 填充作者
    if (elements.authorInput && data.author) {
      elements.authorInput.value = data.author;
      elements.authorInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ 作者填充完成');
    }

    // 3. 填充摘要
    if (elements.summaryInput && data.summary) {
      elements.summaryInput.value = data.summary;
      elements.summaryInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ 摘要填充完成');
    }

    // 4. 处理图片并填充正文
    if (elements.contentEditor && data.content) {
      console.log('🔄 开始处理图片...');
      const processedContent = await convertImagesInContent(data.content);
      
      console.log('🔧 开始填充正文...');
      
      // 直接设置 innerHTML - 这是最简单有效的方法
      elements.contentEditor.innerHTML = processedContent;
      
      // 触发必要的事件让编辑器知道内容已更改
      const events = ['input', 'keyup', 'change'];
      events.forEach(type => {
        elements.contentEditor.dispatchEvent(new Event(type, { bubbles: true }));
      });
      
      console.log('✅ 正文填充完成');
    }

    return true;
  } catch (error) {
    console.error('❌ 填充失败:', error);
    return false;
  }
}

// 监听来自插件的消息
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('📨 收到消息:', request.action);

  if (request.action === 'ping') {
    sendResponse({ success: true, message: 'pong' });
    return;
  }

  if (request.action === 'fillContent') {
    const elements = findWeChatEditorElements();
    
    if (!elements.isWeChatEditor) {
      sendResponse({ success: false, error: '当前页面不是微信公众号编辑器' });
      return;
    }

    try {
      const success = await fillContent(elements, request.data);
      sendResponse({ success, message: success ? '内容填充完成' : '内容填充失败' });
    } catch (error) {
      console.error('处理填充请求时出错:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
});

// 页面加载完成后的初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 页面加载完成，插件已就绪');
  });
} else {
  console.log('📄 页面已加载，插件已就绪');
}
