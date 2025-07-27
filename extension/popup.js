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

  // 状态变量
  let currentTab = null;
  let articles = [];
  let filteredArticles = [];
  let currentFilter = 'all';
  let searchQuery = '';

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

  // 隐藏所有视图
  function hideAllViews() {
    loginCheck.style.display = 'none';
    notLoggedIn.style.display = 'none';
    notWechat.style.display = 'none';
    articleList.style.display = 'none';
    fillSuccess.style.display = 'none';
    errorDiv.style.display = 'none';
  }

  // 检查登录状态
  async function checkLoginStatus() {
    try {
      const response = await fetch('http://localhost:3000/api/articles?limit=1', {
        credentials: 'include'
      });

      if (response.status === 401) {
        return false;
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return false;
    }
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
      showError(error.message);
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

      // 发送消息到content script填充内容
      chrome.tabs.sendMessage(tab.id, {
        action: 'fillContent',
        data: {
          title: article.title,
          content: article.content
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          showError('填充内容失败: ' + chrome.runtime.lastError.message);
        } else if (response && response.success) {
          showSuccess();
        } else {
          showError(response?.error || '填充内容失败');
        }
      });

    } catch (error) {
      console.error('选择文章失败:', error);
      showError(error.message);
    }
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

  // 启动初始化
  init();
});
