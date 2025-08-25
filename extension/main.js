// 字流助手 - 主控制器模块
(function() {
  'use strict';

  console.log(`🚀 Ziliu 微信公众号插件 v${ZiliuConstants.VERSION} 已加载 - 模块化版本`);

  // 主控制器
  window.ZiliuController = {
    // 全局状态
    state: {
      articles: [],
      filteredArticles: [],
      searchQuery: '',
      presets: [],
      selectedPreset: null,
      isInitialized: false,
      currentPage: 1,
      pageSize: 8,
      totalPages: 1
    },

    // 初始化
    async init() {
      if (this.state.isInitialized) {
        console.log('⚠️ 字流助手已经初始化过了');
        return;
      }

      // 检查是否在微信公众号编辑器页面
      if (!ZiliuUtils.isWeChatEditorPage()) {
        console.log('⚠️ 不在微信公众号页面，跳过初始化');
        return;
      }

      console.log('🎯 开始初始化字流助手');

      // 等待页面完全加载
      await ZiliuUtils.delay(2000);

      // 创建UI面板
      ZiliuUI.createMainPanel();

      // 设置事件监听器
      this.setupEventListeners();

      // 检查登录状态并初始化
      await this.checkLoginAndInitialize();

      this.state.isInitialized = true;
      console.log('✅ 字流助手初始化完成');
    },

    // 设置事件监听器
    setupEventListeners() {
      // 关闭面板
      document.getElementById('ziliu-close-btn')?.addEventListener('click', () => {
        ZiliuUI.toggleSidePanel();
      });

      // 打开字流网站
      document.getElementById('ziliu-open-website')?.addEventListener('click', () => {
        window.open(`${ZiliuConstants.API_BASE_URL}`, '_blank');
      });

      // 重新检查登录状态
      document.getElementById('ziliu-refresh-login')?.addEventListener('click', () => {
        this.checkLoginAndInitialize();
      });

      // 刷新文章列表
      document.getElementById('ziliu-refresh-articles')?.addEventListener('click', () => {
        this.fetchArticles();
      });

      // 搜索文章
      document.getElementById('ziliu-search-input')?.addEventListener('input', 
        ZiliuUtils.debounce((e) => {
          this.state.searchQuery = e.target.value;
          this.filterAndDisplayArticles();
        }, 300)
      );



      // 预设选择器
      document.getElementById('ziliu-preset-selector')?.addEventListener('change', (e) => {
        const presetId = e.target.value;
        this.state.selectedPreset = this.state.presets.find(p => p.id === presetId) || null;
      });

      console.log('✅ 事件监听器设置完成');
    },

    // 检查登录状态并初始化
    async checkLoginAndInitialize() {
      ZiliuUI.showView('ziliu-login-check');

      const isLoggedIn = await ZiliuAPI.checkLoginStatus();
      
      if (!isLoggedIn) {
        ZiliuUI.showView('ziliu-not-logged-in');
        return;
      }

      // 已登录，显示文章列表
      ZiliuUI.showView('ziliu-article-list');
      await this.fetchPresets();
      await this.fetchArticles();
    },

    // 获取预设列表
    async fetchPresets() {
      try {
        this.state.presets = await ZiliuAPI.fetchPresets();
        this.state.selectedPreset = this.state.presets.find(p => p.isDefault) || this.state.presets[0] || null;
        this.updatePresetSelector();
      } catch (error) {
        console.error('获取预设列表失败:', error);
      }
    },

    // 更新预设选择器
    updatePresetSelector() {
      const presetSelector = document.getElementById('ziliu-preset-selector');
      if (!presetSelector) return;

      presetSelector.innerHTML = '';

      if (this.state.presets.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '暂无预设';
        presetSelector.appendChild(option);
        return;
      }

      this.state.presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        if (preset.id === this.state.selectedPreset?.id) {
          option.selected = true;
        }
        presetSelector.appendChild(option);
      });
    },

    // 获取文章列表
    async fetchArticles() {
      try {
        const loadingElement = document.getElementById('ziliu-loading-articles');
        const noArticlesElement = document.getElementById('ziliu-no-articles');
        
        if (loadingElement) loadingElement.style.display = 'block';
        if (noArticlesElement) noArticlesElement.style.display = 'none';

        this.state.articles = await ZiliuAPI.fetchArticles();
        this.filterAndDisplayArticles();
      } catch (error) {
        console.error('获取文章列表失败:', error);
        ZiliuUI.showError(error.message);
        const noArticlesElement = document.getElementById('ziliu-no-articles');
        if (noArticlesElement) noArticlesElement.style.display = 'block';
      } finally {
        const loadingElement = document.getElementById('ziliu-loading-articles');
        if (loadingElement) loadingElement.style.display = 'none';
      }
    },

    // 过滤和显示文章（只保留搜索功能）
    filterAndDisplayArticles() {
      // 重置到第一页
      this.state.currentPage = 1;

      // 按搜索关键词过滤
      if (this.state.searchQuery) {
        const query = this.state.searchQuery.toLowerCase();
        this.state.filteredArticles = this.state.articles.filter(article =>
          article.title.toLowerCase().includes(query)
        );
      } else {
        // 没有搜索关键词时显示所有文章
        this.state.filteredArticles = [...this.state.articles];
      }

      this.displayArticles();
    },

    // 显示文章列表
    displayArticles() {
      const articlesContainer = document.getElementById('ziliu-articles-container');
      const noArticlesElement = document.getElementById('ziliu-no-articles');

      if (!articlesContainer) return;

      articlesContainer.innerHTML = '';

      if (this.state.filteredArticles.length === 0) {
        if (noArticlesElement) noArticlesElement.style.display = 'block';
        this.updatePagination();
        return;
      }

      if (noArticlesElement) noArticlesElement.style.display = 'none';

      // 计算分页
      this.state.totalPages = Math.ceil(this.state.filteredArticles.length / this.state.pageSize);
      const startIndex = (this.state.currentPage - 1) * this.state.pageSize;
      const endIndex = startIndex + this.state.pageSize;
      const currentPageArticles = this.state.filteredArticles.slice(startIndex, endIndex);

      // 渲染当前页的文章
      currentPageArticles.forEach(article => {
        const articleElement = this.createArticleElement(article);
        articlesContainer.appendChild(articleElement);
      });

      // 更新分页控件
      this.updatePagination();
    },

    // 更新分页控件
    updatePagination() {
      const paginationContainer = document.getElementById('ziliu-pagination');
      if (!paginationContainer) return;

      // 只有在文章数量超过每页显示数量时才显示分页
      if (this.state.filteredArticles.length <= this.state.pageSize) {
        paginationContainer.style.display = 'none';
        return;
      }

      paginationContainer.style.display = 'flex';
      paginationContainer.innerHTML = '';

      // 上一页按钮
      const prevBtn = document.createElement('button');
      prevBtn.className = 'ziliu-page-btn';
      prevBtn.innerHTML = '‹';
      prevBtn.disabled = this.state.currentPage === 1;
      prevBtn.addEventListener('click', () => this.goToPage(this.state.currentPage - 1));
      paginationContainer.appendChild(prevBtn);

      // 页码按钮
      for (let i = 1; i <= this.state.totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `ziliu-page-btn ${i === this.state.currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => this.goToPage(i));
        paginationContainer.appendChild(pageBtn);
      }

      // 下一页按钮
      const nextBtn = document.createElement('button');
      nextBtn.className = 'ziliu-page-btn';
      nextBtn.innerHTML = '›';
      nextBtn.disabled = this.state.currentPage === this.state.totalPages;
      nextBtn.addEventListener('click', () => this.goToPage(this.state.currentPage + 1));
      paginationContainer.appendChild(nextBtn);
    },

    // 跳转到指定页
    goToPage(page) {
      if (page < 1 || page > this.state.totalPages) return;
      this.state.currentPage = page;
      this.displayArticles();
    },

    // 创建文章元素
    createArticleElement(article) {
      const div = document.createElement('div');
      div.className = 'ziliu-article-item';
      div.dataset.articleId = article.id;

      const date = ZiliuUtils.formatDate(article.updatedAt);

      div.innerHTML = `
        <div class="ziliu-article-header">
          <div class="ziliu-article-title">${article.title}</div>
          <div class="ziliu-article-actions">
            <button class="ziliu-fill-btn" data-article-id="${article.id}" title="填充到编辑器">
              填充
            </button>
            <button class="ziliu-edit-btn" data-article-id="${article.id}" title="编辑文章">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="ziliu-article-meta">
          <div class="ziliu-article-info">
            <div class="ziliu-article-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <span>${date}</span>
            </div>
            <div class="ziliu-article-words">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              <span>${article.wordCount || 0}字</span>
            </div>
          </div>
        </div>
      `;

      // 填充按钮事件
      const fillBtn = div.querySelector('.ziliu-fill-btn');
      fillBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止冒泡到文章项点击事件
        this.fillArticleToEditor(article);
      });

      // 编辑按钮事件
      const editBtn = div.querySelector('.ziliu-edit-btn');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止冒泡到文章项点击事件
        this.editArticle(article.id);
      });

      // 文章项点击事件（选择文章）
      div.addEventListener('click', () => this.selectArticle(article.id));

      return div;
    },

    // 统一的填充方法（静默模式，不会导致页面跳变）
    async fillArticleToEditor(article, options = {}) {
      const { showProgress = false, buttonElement = null } = options;

      let fillBtn = buttonElement || document.querySelector(`[data-article-id="${article.id}"] .ziliu-fill-btn`);
      let originalContent = '';

      if (fillBtn) {
        originalContent = fillBtn.innerHTML;
        fillBtn.innerHTML = '填充中...';
        fillBtn.disabled = true;
      }

      try {
        if (showProgress) {
          ZiliuUI.showProgress('正在处理内容...', '正在获取文章内容');
        }

        // 获取文章详情
        const articleDetail = await ZiliuAPI.fetchArticleDetail(article.id);

        if (showProgress) {
          ZiliuUI.showProgress('正在处理内容...', '正在转换文章格式');
        }

        // 转换文章格式
        let htmlToFill = await ZiliuAPI.convertArticleFormat(
          articleDetail.originalContent || articleDetail.content,
          'wechat',
          articleDetail.style || 'default'
        );

        if (showProgress) {
          ZiliuUI.showProgress('正在填充内容...', '正在定位编辑器元素');
        }

        // 查找编辑器元素
        const elements = ZiliuEditor.findWeChatEditorElements();

        if (!elements.isWeChatEditor) {
          throw new Error('当前页面不是微信公众号编辑器');
        }

        if (showProgress) {
          ZiliuUI.showProgress('正在填充内容...', '正在填充文章内容');
        }

        // 填充内容（静默模式）
        const fillData = {
          title: articleDetail.title,
          content: htmlToFill,
          author: this.state.selectedPreset?.author || '孟健',
          summary: articleDetail.summary || '',
          preset: this.state.selectedPreset
        };

        const success = await ZiliuEditor.fillContent(elements, fillData);

        if (!success) {
          throw new Error('内容填充失败');
        }

        // 显示成功状态
        if (fillBtn) {
          fillBtn.innerHTML = '已填充';
          setTimeout(() => {
            fillBtn.innerHTML = originalContent;
            fillBtn.disabled = false;
          }, 2000);
        }

        if (showProgress) {
          ZiliuUI.showSuccess();
        }

        console.log('✅ 文章填充成功');
        return true;

      } catch (error) {
        console.error('填充文章失败:', error);

        // 显示错误状态
        if (fillBtn) {
          fillBtn.innerHTML = '填充失败';
          setTimeout(() => {
            fillBtn.innerHTML = originalContent;
            fillBtn.disabled = false;
          }, 2000);
        }

        if (showProgress) {
          ZiliuUI.showError(error.message);
        } else {
          ZiliuUtils.showNotification(error.message, 'error');
        }

        return false;
      }
    },

    // 编辑文章
    editArticle(articleId) {
      const editUrl = `http://localhost:3000/editor/${articleId}`;
      window.open(editUrl, '_blank');
    },

    // 选择文章并填充到编辑器（静默模式，不显示进度条，不跳变）
    async selectArticle(articleId) {
      // 使用统一的填充方法，静默模式，和填充按钮保持一致
      const article = { id: articleId };
      await this.fillArticleToEditor(article, { showProgress: false });
    }
  };

  // 监听来自插件的消息（保持兼容性）
  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    console.log('📨 收到消息:', request.action);

    if (request.action === 'ping') {
      sendResponse({ success: true, message: 'pong' });
      return;
    }

    if (request.action === 'fillContent') {
      const elements = ZiliuEditor.findWeChatEditorElements();

      if (!elements.isWeChatEditor) {
        sendResponse({ success: false, error: '当前页面不是微信公众号编辑器' });
        return;
      }

      try {
        const success = await ZiliuEditor.fillContent(elements, request.data);
        sendResponse({ success, message: success ? '内容填充完成' : '内容填充失败' });
      } catch (error) {
        console.error('处理填充请求时出错:', error);
        sendResponse({ success: false, error: error.message });
      }
    }
  });

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('📄 页面加载完成，开始初始化字流助手');
      ZiliuController.init();
    });
  } else {
    console.log('📄 页面已加载，开始初始化字流助手');
    ZiliuController.init();
  }

  console.log('✅ 字流主控制器模块已加载');
})();
