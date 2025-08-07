// 字流助手 - 弹窗脚本

document.addEventListener('DOMContentLoaded', function() {
  // DOM 元素
  const loginCheck = document.getElementById('login-check');
  const notLoggedIn = document.getElementById('not-logged-in');
  const notWechat = document.getElementById('not-wechat');
  const articleList = document.getElementById('article-list');
  const articlesContainer = document.getElementById('articles-container');
  const loadingArticles = document.getElementById('loading-articles');
  const noArticles = document.getElementById('no-articles');
  const fillSuccess = document.getElementById('fill-success');
  const errorDiv = document.getElementById('error');
  const errorMessage = document.getElementById('error-message');
  const openZiliuBtn = document.getElementById('open-ziliu');
  const refreshLoginBtn = document.getElementById('refresh-login');
  const refreshBtn = document.getElementById('refresh-articles');
  const searchInput = document.getElementById('search-input');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const fillProgress = document.getElementById('fill-progress');
  const progressTitle = document.getElementById('progress-title');
  const progressMessage = document.getElementById('progress-message');

  // 状态变量
  let currentTab = null;
  let articles = [];
  let filteredArticles = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let presets = [];
  let selectedPreset = null;

  // 显示错误消息
  function showError(message) {
    errorMessage.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }

  // 显示成功消息
  function showSuccess() {
    fillSuccess.style.display = 'block';
    setTimeout(() => {
      fillSuccess.style.display = 'none';
    }, 3000);
  }

  // 显示进度消息
  function showProgress(title, message) {
    progressTitle.textContent = title;
    progressMessage.textContent = message;
    fillProgress.style.display = 'block';
  }

  // 隐藏进度消息
  function hideProgress() {
    fillProgress.style.display = 'none';
  }

  // 更新进度消息
  function updateProgress(message) {
    progressMessage.textContent = message;
  }

  // 显示认证错误
  function showAuthError() {
    errorMessage.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>需要登录字流账户</strong>
      </div>
      <div style="margin-bottom: 10px; font-size: 12px; color: #666;">
        请先在字流网站登录，然后刷新此插件
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="open-ziliu-login" style="flex: 1; padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
          打开字流登录
        </button>
        <button id="refresh-auth" style="flex: 1; padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
          重新检查
        </button>
      </div>
    `;
    errorDiv.style.display = 'block';

    // 添加按钮事件监听器
    document.getElementById('open-ziliu-login').addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000/auth/signin' });
    });

    document.getElementById('refresh-auth').addEventListener('click', () => {
      errorDiv.style.display = 'none';
      init(); // 重新初始化
    });
  }

  // 隐藏所有视图
  function hideAllViews() {
    loginCheck.style.display = 'none';
    notLoggedIn.style.display = 'none';
    notWechat.style.display = 'none';
    articleList.style.display = 'none';
    fillSuccess.style.display = 'none';
    errorDiv.style.display = 'none';
    fillProgress.style.display = 'none';
  }

  // 检查登录状态
  async function checkLoginStatus() {
    try {
      // 首先检查是否有相关的cookie
      const cookies = await chrome.cookies.getAll({
        url: 'http://localhost:3000'
      });
      console.log('找到的cookies:', cookies.map(c => c.name));

      const response = await fetch('http://localhost:3000/api/articles?limit=1', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('API响应状态:', response.status);

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
        // 选择默认预设
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
    const presetSelector = document.getElementById('preset-selector');
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
      loadingArticles.style.display = 'block';
      noArticles.style.display = 'none';

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

      // 检查是否是认证错误
      if (error.message.includes('401') || error.message.includes('请先登录')) {
        showAuthError();
      } else {
        showError(error.message);
      }
      noArticles.style.display = 'block';
    } finally {
      loadingArticles.style.display = 'none';
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
    articlesContainer.innerHTML = '';

    if (filteredArticles.length === 0) {
      noArticles.style.display = 'block';
      return;
    }

    noArticles.style.display = 'none';

    filteredArticles.forEach(article => {
      const articleElement = createArticleElement(article);
      articlesContainer.appendChild(articleElement);
    });
  }

  // 创建文章元素
  function createArticleElement(article) {
    const div = document.createElement('div');
    div.className = 'article-item';
    div.dataset.articleId = article.id;

    const date = new Date(article.updatedAt).toLocaleDateString('zh-CN');
    const statusText = article.status === 'published' ? '已发布' : '草稿';
    const statusClass = article.status;

    div.innerHTML = `
      <div class="article-title">${article.title}</div>
      <div class="article-meta">
        <span>${date} · ${article.wordCount}字</span>
        <span class="article-status ${statusClass}">${statusText}</span>
      </div>
    `;

    div.addEventListener('click', () => selectArticle(article.id));

    return div;
  }

  // 选择文章并填充到编辑器
  async function selectArticle(articleId) {
    try {
      // 检查是否在公众号编辑器页面
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url.includes('mp.weixin.qq.com')) {
        showError('请在微信公众号编辑器页面使用此功能');
        return;
      }

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

      // 首先检查content script是否已加载
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script未加载，尝试注入
          console.log('Content script未加载，尝试注入...');
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }, () => {
            if (chrome.runtime.lastError) {
              showError('无法注入脚本: ' + chrome.runtime.lastError.message);
              return;
            }

            // 等待脚本加载完成后再发送消息
            setTimeout(() => {
              sendFillMessage(tab.id, article);
            }, 500);
          });
        } else {
          // Content script已加载，直接发送消息
          sendFillMessage(tab.id, article);
        }
      });

    } catch (error) {
      console.error('选择文章失败:', error);
      showError(error.message);
    }
  }

  // 发送填充消息的辅助函数
  function sendFillMessage(tabId, article) {
    // 显示loading状态
    showProgress('正在处理内容...', '正在准备文章内容');

    chrome.tabs.sendMessage(tabId, {
      action: 'fillContent',
      data: {
        title: article.title,
        content: article.content,
        preset: selectedPreset // 包含预设信息
      }
    }, (response) => {
      // 隐藏loading状态
      hideProgress();

      if (chrome.runtime.lastError) {
        showError('填充内容失败: ' + chrome.runtime.lastError.message);
      } else if (response && response.success) {
        showSuccess();
      } else {
        showError(response?.error || '填充内容失败');
      }
    });
  }

  // 检查当前页面
  function checkCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        currentTab = tabs[0];

        if (currentTab.url.includes('mp.weixin.qq.com')) {
          // 在公众号编辑器页面，显示文章列表
          hideAllViews();
          articleList.style.display = 'block';
          fetchPresets(); // 获取预设
          fetchArticles();
        } else {
          // 不在公众号编辑器页面
          hideAllViews();
          notWechat.style.display = 'block';
        }
      }
    });
  }

  // 初始化
  async function init() {
    hideAllViews();
    loginCheck.style.display = 'block';

    // 检查登录状态
    const isLoggedIn = await checkLoginStatus();

    if (!isLoggedIn) {
      hideAllViews();
      notLoggedIn.style.display = 'block';
      return;
    }

    // 已登录，检查当前页面
    checkCurrentPage();
  }

  // 监听来自content script的进度更新
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateProgress') {
      updateProgress(message.message);
    }
  });

  // 事件监听器
  openZiliuBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  refreshLoginBtn.addEventListener('click', () => {
    init(); // 重新检查登录状态
  });

  refreshBtn.addEventListener('click', fetchArticles);

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    filterAndDisplayArticles();
  });

  filterTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      // 更新活动标签
      filterTabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');

      // 更新过滤器
      currentFilter = e.target.dataset.status;
      filterAndDisplayArticles();
    });
  });

  // 预设选择器事件监听
  const presetSelector = document.getElementById('preset-selector');
  if (presetSelector) {
    presetSelector.addEventListener('change', (e) => {
      const presetId = e.target.value;
      selectedPreset = presets.find(p => p.id === presetId) || null;
    });
  }

  // 启动初始化
  init();
});
