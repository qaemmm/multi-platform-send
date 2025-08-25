// 微信公众号内容填充插件 - 嵌入式版本
// 直接在微信公众号编辑页面中嵌入字流助手功能

console.log('🚀 Ziliu 微信公众号插件 v3.0 已加载 - 嵌入式版本');

// 简单测试：立即创建一个测试元素
const testDiv = document.createElement('div');
testDiv.id = 'ziliu-test';
testDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: red; color: white; padding: 10px; z-index: 9999;';
testDiv.textContent = '字流插件已加载';
document.body.appendChild(testDiv);

console.log('✅ 测试元素已添加');

// 查找微信编辑器元素
function findWeChatEditorElements() {
  // 更全面的标题输入框选择器 - 注意：微信公众号的标题输入框是 textarea！
  const titleSelectors = [
    'textarea[placeholder="请在这里输入标题"]',
    '#title',
    'textarea.js_title',
    'textarea[name="title"]',
    'input[placeholder*="标题"]',
    'input[name*="title"]',
    '.title-input input',
    '.article-title input'
  ];

  // 更全面的作者输入框选择器
  const authorSelectors = [
    'input[placeholder="请输入作者"]',
    '#author',
    'input.js_author',
    'input[name="author"]',
    'input[placeholder*="作者"]',
    '.author-input input',
    '.article-author input'
  ];

  // 更全面的摘要输入框选择器
  const summarySelectors = [
    'textarea[placeholder*="选填"]',
    '#js_description',
    'textarea.js_desc',
    'textarea[name="digest"]',
    'textarea[placeholder*="摘要"]',
    '.summary-input textarea',
    '.article-summary textarea'
  ];

  // 更全面的内容编辑器选择器
  const contentSelectors = [
    '.ProseMirror',
    '.ql-editor',
    '.editor-content',
    '.article-content',
    '[contenteditable="true"]',
    '.rich-text-editor'
  ];

  // 查找元素的辅助函数
  function findElement(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`✅ 找到元素: ${selector}`);
        return element;
      }
    }
    console.warn(`⚠️ 未找到元素，尝试的选择器:`, selectors);
    return null;
  }

  const titleInput = findElement(titleSelectors);
  const authorInput = findElement(authorSelectors);
  const summaryInput = findElement(summarySelectors);
  const contentEditor = findElement(contentSelectors);

  console.log('🔍 元素查找结果:', {
    titleInput: !!titleInput,
    authorInput: !!authorInput,
    summaryInput: !!summaryInput,
    contentEditor: !!contentEditor
  });

  return {
    titleInput,
    authorInput,
    summaryInput,
    contentEditor,
    isWeChatEditor: !!(titleInput && contentEditor)
  };
}



// 处理代码块格式，使其适配微信公众号编辑器
function processCodeBlocks(html) {
  // 处理块级代码块 <pre><code>...</code></pre>
  let processedHtml = html.replace(
    /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    (match, codeContent) => {
      // 清理代码内容
      const cleanCode = codeContent
        .replace(/^\s+|\s+$/g, '') // 去除首尾空白
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/<br[^>]*>/g, '\n'); // 将br标签转换为换行符

      // 按行分割代码，每行用单独的div包装
      const lines = cleanCode.split('\n').filter(line => line.trim() !== '');
      const codeLines = lines.map(line =>
        `<div style="margin: 0; padding: 0; line-height: 1.5;">${line.replace(/  /g, '&nbsp;&nbsp;')}</div>`
      ).join('');

      // 使用div包装整个代码块，确保微信编辑器正确处理
      return `<div style="background-color: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 16px; margin: 16px 0; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 14px; overflow-x: auto;">${codeLines}</div>`;
    }
  );

  // 处理行内代码块 <code>...</code>
  processedHtml = processedHtml.replace(
    /<code(?![^>]*style=)[^>]*>(.*?)<\/code>/g,
    '<code style="background-color: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-family: monospace;">$1</code>'
  );

  return processedHtml;
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

    // 4. 填充正文（图片由公众号自动处理）
    if (elements.contentEditor && data.content) {
      console.log('🔧 开始填充正文...');

      // 处理代码块格式
      const processedContent = processCodeBlocks(data.content);
      console.log('🔄 代码块格式处理完成');

      // 设置处理后的内容
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

// 设置面板事件监听器
function setupPanelEventListeners() {
  // 切换面板展开/收起
  document.getElementById('ziliu-toggle-btn').addEventListener('click', () => {
    const panel = document.getElementById('ziliu-assistant-panel');
    const btn = document.getElementById('ziliu-toggle-btn');
    panel.classList.toggle('collapsed');
    btn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
  });

  // 关闭面板
  document.getElementById('ziliu-close-btn').addEventListener('click', () => {
    document.getElementById('ziliu-assistant-panel').style.display = 'none';
  });

  // 打开字流网站
  document.getElementById('ziliu-open-website').addEventListener('click', () => {
    window.open('http://localhost:3000', '_blank');
  });

  // 重新检查登录状态
  document.getElementById('ziliu-refresh-login').addEventListener('click', () => {
    checkLoginAndInitialize();
  });

  // 刷新文章列表
  document.getElementById('ziliu-refresh-articles').addEventListener('click', () => {
    fetchArticles();
  });

  // 搜索文章
  document.getElementById('ziliu-search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    filterAndDisplayArticles();
  });

  // 过滤标签
  document.querySelectorAll('.ziliu-filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.ziliu-filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.status;
      filterAndDisplayArticles();
    });
  });

  // 预设选择器
  document.getElementById('ziliu-preset-selector').addEventListener('change', (e) => {
    const presetId = e.target.value;
    selectedPreset = presets.find(p => p.id === presetId) || null;
  });
}

// 全局变量
let articles = [];
let filteredArticles = [];
let currentFilter = 'all';
let searchQuery = '';
let presets = [];
let selectedPreset = null;

// 初始化字流助手
function initializeZiliuAssistant() {
  // 检查是否在微信公众号编辑器页面
  if (!window.location.href.includes('mp.weixin.qq.com')) {
    console.log('⚠️ 不在微信公众号页面，跳过初始化');
    return;
  }

  // 等待页面完全加载后再创建面板
  setTimeout(() => {
    createZiliuPanel();
    checkLoginAndInitialize();
  }, 2000);
}

// 检查登录状态并初始化
async function checkLoginAndInitialize() {
  hideAllViews();
  showView('ziliu-login-check');

  const isLoggedIn = await checkLoginStatus();

  if (!isLoggedIn) {
    hideAllViews();
    showView('ziliu-not-logged-in');
    return;
  }

  // 已登录，显示文章列表
  hideAllViews();
  showView('ziliu-article-list');
  fetchPresets();
  fetchArticles();
}

// 显示/隐藏视图的辅助函数
function hideAllViews() {
  const views = [
    'ziliu-login-check',
    'ziliu-not-logged-in',
    'ziliu-article-list',
    'ziliu-fill-progress',
    'ziliu-fill-success',
    'ziliu-error'
  ];

  views.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = 'none';
  });
}

function showView(viewId) {
  const element = document.getElementById(viewId);
  if (element) element.style.display = 'block';
}

// 显示错误消息
function showError(message) {
  const errorElement = document.getElementById('ziliu-error');
  const errorMessage = document.getElementById('ziliu-error-message');
  if (errorElement && errorMessage) {
    errorMessage.textContent = message;
    hideAllViews();
    showView('ziliu-error');
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }
}

// 显示成功消息
function showSuccess() {
  hideAllViews();
  showView('ziliu-fill-success');
  setTimeout(() => {
    document.getElementById('ziliu-fill-success').style.display = 'none';
    showView('ziliu-article-list');
  }, 3000);
}

// 显示进度
function showProgress(title, message) {
  const progressTitle = document.getElementById('ziliu-progress-title');
  const progressMessage = document.getElementById('ziliu-progress-message');
  if (progressTitle && progressMessage) {
    progressTitle.textContent = title;
    progressMessage.textContent = message;
    hideAllViews();
    showView('ziliu-fill-progress');
  }
}

// 监听来自插件的消息（保持兼容性）
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

// 检查登录状态
async function checkLoginStatus() {
  try {
    const response = await fetch('http://localhost:3000/api/articles?limit=1', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.status === 401) {
      console.log('用户未登录 (401)');
      return false;
    }

    if (!response.ok) {
      console.log('请求失败:', response.status, response.statusText);
      return false;
    }

    const data = await response.json();
    console.log('登录状态检查结果:', data);
    return data.success;
  } catch (error) {
    console.error('检查登录状态失败:', error);
    return false;
  }
}

// 获取预设列表
async function fetchPresets() {
  try {
    const response = await fetch('http://localhost:3000/api/presets', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('获取预设列表失败');
    }

    const data = await response.json();
    if (data.success) {
      presets = data.data;
      selectedPreset = presets.find(p => p.isDefault) || presets[0] || null;
      updatePresetSelector();
      console.log('✅ 预设加载完成:', presets.length, '个预设');
    }
  } catch (error) {
    console.error('获取预设列表失败:', error);
  }
}

// 更新预设选择器
function updatePresetSelector() {
  const presetSelector = document.getElementById('ziliu-preset-selector');
  if (!presetSelector) return;

  presetSelector.innerHTML = '';

  if (presets.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '暂无预设';
    presetSelector.appendChild(option);
    return;
  }

  presets.forEach(preset => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name;
    if (preset.id === selectedPreset?.id) {
      option.selected = true;
    }
    presetSelector.appendChild(option);
  });
}

// 获取文章列表
async function fetchArticles() {
  try {
    const loadingElement = document.getElementById('ziliu-loading-articles');
    const noArticlesElement = document.getElementById('ziliu-no-articles');

    if (loadingElement) loadingElement.style.display = 'block';
    if (noArticlesElement) noArticlesElement.style.display = 'none';

    const response = await fetch('http://localhost:3000/api/articles?limit=50', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('获取文章列表失败');
    }

    const data = await response.json();
    if (data.success) {
      articles = data.data.articles;
      filterAndDisplayArticles();
    } else {
      throw new Error(data.error || '获取文章列表失败');
    }
  } catch (error) {
    console.error('获取文章列表失败:', error);
    showError(error.message);
    const noArticlesElement = document.getElementById('ziliu-no-articles');
    if (noArticlesElement) noArticlesElement.style.display = 'block';
  } finally {
    const loadingElement = document.getElementById('ziliu-loading-articles');
    if (loadingElement) loadingElement.style.display = 'none';
  }
}

// 过滤和显示文章
function filterAndDisplayArticles() {
  // 按状态过滤
  filteredArticles = articles.filter(article => {
    if (currentFilter === 'all') return true;
    return article.status === currentFilter;
  });

  // 按搜索关键词过滤
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredArticles = filteredArticles.filter(article =>
      article.title.toLowerCase().includes(query)
    );
  }

  displayArticles();
}

// 显示文章列表
function displayArticles() {
  const articlesContainer = document.getElementById('ziliu-articles-container');
  const noArticlesElement = document.getElementById('ziliu-no-articles');

  if (!articlesContainer) return;

  articlesContainer.innerHTML = '';

  if (filteredArticles.length === 0) {
    if (noArticlesElement) noArticlesElement.style.display = 'block';
    return;
  }

  if (noArticlesElement) noArticlesElement.style.display = 'none';

  filteredArticles.forEach(article => {
    const articleElement = createArticleElement(article);
    articlesContainer.appendChild(articleElement);
  });
}

// 创建文章元素
function createArticleElement(article) {
  const div = document.createElement('div');
  div.className = 'ziliu-article-item';
  div.dataset.articleId = article.id;

  const date = new Date(article.updatedAt).toLocaleDateString('zh-CN');
  const statusText = article.status === 'published' ? '已发布' : '草稿';
  const statusClass = article.status;

  div.innerHTML = `
    <div class="ziliu-article-title">${article.title}</div>
    <div class="ziliu-article-meta">
      <span>${date} · ${article.wordCount}字</span>
      <span class="ziliu-article-status ${statusClass}">${statusText}</span>
    </div>
  `;

  div.addEventListener('click', () => selectArticle(article.id));

  return div;
}

// 选择文章并填充到编辑器
async function selectArticle(articleId) {
  try {
    showProgress('正在处理内容...', '正在获取文章内容');

    // 获取文章详情
    const response = await fetch(`http://localhost:3000/api/articles/${articleId}?format=inline`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('获取文章内容失败');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '获取文章内容失败');
    }

    const article = data.data;

    // 统一与站点"复制到公众号"逻辑：再走一次 convert-inline，保证风格与预览一致
    let htmlToFill = article.content;
    try {
      showProgress('正在处理内容...', '正在转换文章格式');
      const convResp = await fetch('http://localhost:3000/api/convert-inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: article.originalContent || '',
          platform: 'wechat',
          style: article.style || 'default'
        })
      });
      const convData = await convResp.json();
      if (convData?.success && convData.data?.inlineHtml) {
        htmlToFill = convData.data.inlineHtml;
        console.log('✅ 使用 convert-inline 生成内联 HTML');
      } else {
        console.warn('⚠️ convert-inline 返回异常，回退使用接口内联内容');
      }
    } catch (e) {
      console.warn('⚠️ 调用 convert-inline 失败，回退使用接口内联内容:', e);
    }

    // 查找编辑器元素
    showProgress('正在填充内容...', '正在定位编辑器元素');
    const elements = findWeChatEditorElements();

    if (!elements.isWeChatEditor) {
      throw new Error('当前页面不是微信公众号编辑器');
    }

    // 填充内容
    showProgress('正在填充内容...', '正在填充文章内容');
    const fillData = {
      title: article.title,
      content: htmlToFill,
      author: selectedPreset?.author || '孟健',
      summary: article.summary || '',
      preset: selectedPreset
    };

    const success = await fillContent(elements, fillData);

    if (success) {
      showSuccess();
      console.log('✅ 文章填充成功');
    } else {
      throw new Error('内容填充失败');
    }

  } catch (error) {
    console.error('选择文章失败:', error);
    showError(error.message);
  }
}

// 创建嵌入式字流助手面板
function createZiliuPanel() {
  // 检查是否已经创建了面板
  if (document.getElementById('ziliu-assistant-panel')) {
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'ziliu-assistant-panel';
  panel.innerHTML = `
    <div id="ziliu-panel-header">
      <div id="ziliu-panel-title">
        <span>字流助手</span>
        <span id="ziliu-panel-subtitle">让文字如流水般顺畅发布</span>
      </div>
      <div id="ziliu-panel-controls">
        <button id="ziliu-toggle-btn" title="展开/收起">−</button>
        <button id="ziliu-close-btn" title="关闭">×</button>
      </div>
    </div>
    <div id="ziliu-panel-content">
      <div id="ziliu-login-check" class="ziliu-message ziliu-info">
        <p>正在检查登录状态...</p>
      </div>

      <div id="ziliu-not-logged-in" style="display: none;">
        <div class="ziliu-login-prompt">
          <h3>需要登录字流账户</h3>
          <p>请先登录字流网站，然后回到这里选择文章发布</p>
          <div class="ziliu-login-actions">
            <button id="ziliu-open-website" class="ziliu-btn">打开字流网站</button>
            <button id="ziliu-refresh-login" class="ziliu-btn ziliu-btn-secondary">重新检查</button>
          </div>
        </div>
      </div>

      <div id="ziliu-article-list" style="display: none;">
        <div class="ziliu-list-header">
          <h3>选择要发布的文章</h3>
          <button id="ziliu-refresh-articles" class="ziliu-btn ziliu-btn-small">刷新</button>
        </div>

        <div class="ziliu-search-box">
          <input type="text" id="ziliu-search-input" placeholder="搜索文章标题..." />
        </div>

        <div class="ziliu-preset-selector">
          <label for="ziliu-preset-selector">发布预设</label>
          <select id="ziliu-preset-selector">
            <option value="">加载中...</option>
          </select>
        </div>

        <div class="ziliu-filter-tabs">
          <button class="ziliu-filter-tab active" data-status="all">全部</button>
          <button class="ziliu-filter-tab" data-status="draft">草稿</button>
          <button class="ziliu-filter-tab" data-status="published">已发布</button>
        </div>

        <div id="ziliu-articles-container" class="ziliu-articles-container">
          <!-- 文章列表将在这里动态生成 -->
        </div>

        <div id="ziliu-loading-articles" class="ziliu-message ziliu-info" style="display: none;">
          <p>正在加载文章列表...</p>
        </div>

        <div id="ziliu-no-articles" class="ziliu-message ziliu-info" style="display: none;">
          <p>📝 暂无文章</p>
          <p>请先在字流网站创建文章</p>
        </div>
      </div>

      <div id="ziliu-fill-progress" class="ziliu-message ziliu-info" style="display: none;">
        <div class="ziliu-progress-content">
          <div class="ziliu-loading"></div>
          <div>
            <p id="ziliu-progress-title">正在处理内容...</p>
            <p id="ziliu-progress-message">正在准备文章内容</p>
          </div>
        </div>
      </div>

      <div id="ziliu-fill-success" class="ziliu-message ziliu-success" style="display: none;">
        <p>🎉 内容已成功填充到编辑器！</p>
        <p>您可以在编辑器中查看和编辑内容</p>
      </div>

      <div id="ziliu-error" class="ziliu-message ziliu-error" style="display: none;">
        <p>❌ 操作失败</p>
        <p id="ziliu-error-message"></p>
      </div>
    </div>
  `;

  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    #ziliu-assistant-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      border: 1px solid #e2e8f0;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-height: 80vh;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    #ziliu-assistant-panel.collapsed #ziliu-panel-content {
      display: none;
    }

    #ziliu-panel-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
    }

    #ziliu-panel-title span:first-child {
      font-size: 16px;
      font-weight: 600;
      display: block;
    }

    #ziliu-panel-subtitle {
      font-size: 12px;
      opacity: 0.9;
      display: block;
      margin-top: 2px;
    }

    #ziliu-panel-controls {
      display: flex;
      gap: 8px;
    }

    #ziliu-panel-controls button {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      line-height: 1;
    }

    #ziliu-panel-controls button:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    #ziliu-panel-content {
      padding: 20px;
      max-height: 60vh;
      overflow-y: auto;
    }

    .ziliu-message {
      padding: 12px;
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 16px;
    }

    .ziliu-message.ziliu-success {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .ziliu-message.ziliu-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .ziliu-message.ziliu-info {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }

    .ziliu-login-prompt {
      text-align: center;
    }

    .ziliu-login-prompt h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .ziliu-login-prompt p {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }

    .ziliu-login-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ziliu-btn {
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .ziliu-btn:hover {
      background: #5a67d8;
      transform: translateY(-1px);
    }

    .ziliu-btn-secondary {
      background: white;
      color: #667eea;
      border: 1px solid #667eea;
    }

    .ziliu-btn-secondary:hover {
      background: #f8fafc;
    }

    .ziliu-btn-small {
      font-size: 12px;
      padding: 6px 12px;
    }

    .ziliu-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .ziliu-list-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }

    .ziliu-search-box {
      margin-bottom: 12px;
    }

    .ziliu-search-box input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
    }

    .ziliu-search-box input:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
    }

    .ziliu-preset-selector {
      margin-bottom: 12px;
    }

    .ziliu-preset-selector label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }

    .ziliu-preset-selector select {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 13px;
      background: white;
      box-sizing: border-box;
    }

    .ziliu-filter-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
    }

    .ziliu-filter-tab {
      flex: 1;
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      background: white;
      color: #6b7280;
      font-size: 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .ziliu-filter-tab:hover {
      background: #f9fafb;
    }

    .ziliu-filter-tab.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .ziliu-articles-container {
      max-height: 300px;
      overflow-y: auto;
    }

    .ziliu-article-item {
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
      background: white;
    }

    .ziliu-article-item:hover {
      border-color: #667eea;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .ziliu-article-title {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ziliu-article-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #6b7280;
    }

    .ziliu-article-status {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
    }

    .ziliu-article-status.draft {
      background: #fef3c7;
      color: #92400e;
    }

    .ziliu-article-status.published {
      background: #d1fae5;
      color: #065f46;
    }

    .ziliu-progress-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .ziliu-loading {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: ziliu-spin 1s linear infinite;
    }

    @keyframes ziliu-spin {
      to {
        transform: rotate(360deg);
      }
    }

    #ziliu-progress-title {
      font-weight: 600;
      margin-bottom: 4px;
    }

    #ziliu-progress-message {
      font-size: 12px;
      color: #6b7280;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(panel);

  // 添加拖拽功能
  makeDraggable(panel);

  // 添加事件监听器
  setupPanelEventListeners();

  console.log('✅ 字流助手面板已创建');
}

// 使面板可拖拽
function makeDraggable(panel) {
  const header = panel.querySelector('#ziliu-panel-header');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target.closest('#ziliu-panel-controls')) return;

    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === header || header.contains(e.target)) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      xOffset = currentX;
      yOffset = currentY;

      panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }
  }

  function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }
}

// 页面加载完成后的初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 页面加载完成，插件已就绪');
    initializeZiliuAssistant();
  });
} else {
  console.log('📄 页面已加载，插件已就绪');
  initializeZiliuAssistant();
}