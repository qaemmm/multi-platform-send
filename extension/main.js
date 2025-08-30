// 字流助手 - 主控制器模块
(function() {
  'use strict';

  // 初始化API基础URL
  if (window.ZiliuInit) {
    window.ZiliuInit.initApiBaseUrl();
  }

  // 监听配置更新消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'configUpdated') {
      console.log('字流助手: 配置已更新', message.config);
      if (window.ZiliuConstants && message.config.apiBaseUrl) {
        window.ZiliuConstants.API_BASE_URL = message.config.apiBaseUrl;
      }
    }
  });

  console.log(`🚀 Ziliu 多平台插件已加载 - 模块化版本`);

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
      totalPages: 1,
      currentPlatform: null
    },

    // 初始化
    async init() {
      if (this.state.isInitialized) {
        console.log('⚠️ 字流助手已经初始化过了');
        return;
      }

      // 检测当前平台
      const platformInfo = ZiliuEditor.detectPlatformAndElements();
      this.state.currentPlatform = platformInfo.platform;

      console.log('🔍 平台检测结果:', {
        platform: platformInfo.platform,
        isEditor: platformInfo.isEditor,
        isWeChatEditor: platformInfo.isWeChatEditor,
        isZhihuEditor: platformInfo.isZhihuEditor,
        platformInstance: !!platformInfo.platformInstance,
        url: window.location.href
      });

      // 向后兼容：如果新的平台检测失败，回退到原来的微信检测逻辑
      const isWeChatPage = ZiliuUtils.isWeChatEditorPage();
      const isSupportedEditor = platformInfo.isEditor || platformInfo.isWeChatEditor || platformInfo.isZhihuEditor || isWeChatPage;

      // 特殊处理：如果检测到知乎平台但编辑器元素未找到，继续初始化（可能是动态加载）
      const isZhihuPlatform = platformInfo.platform === 'zhihu';
      const shouldContinue = isSupportedEditor || isZhihuPlatform;

      console.log('🔍 编辑器检测结果:', {
        isWeChatPage,
        isSupportedEditor,
        isZhihuPlatform,
        shouldContinue,
        platformInfo: platformInfo
      });

      if (!shouldContinue) {
        console.log('⚠️ 不在支持的编辑器页面，跳过初始化');
        return;
      }

      console.log('🎯 开始初始化字流助手');

      // 如果是知乎页面，使用专门的等待机制
      if (platformInfo.platform === 'zhihu' && platformInfo.platformInstance) {
        console.log('🔍 知乎页面，使用智能等待机制...');

        // 使用知乎平台的等待方法
        const retryElements = await platformInfo.platformInstance.waitForEditor();
        if (retryElements.isEditor) {
          console.log('🎉 重试成功，找到知乎编辑器');
          // 更新平台信息
          platformInfo.isEditor = true;
          platformInfo.isZhihuEditor = true;
          Object.assign(platformInfo, retryElements);
        } else {
          console.log('⚠️ 重试后仍未找到知乎编辑器，但继续初始化');
        }
      } else {
        // 等待页面完全加载
        await ZiliuUtils.delay(2000);
      }

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
        window.open(`${window.ZiliuConstants?.API_BASE_URL || 'http://localhost:3000'}`, '_blank');
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

    // 获取平台配置
    getPlatformConfig(platform) {
      const configs = {
        'wechat': {
          showFillButton: true,
          showCopyButton: false,
          fillButtonText: '填充',
          copyButtonText: '复制'
        },
        'zhihu': {
          showFillButton: false,
          showCopyButton: true,
          fillButtonText: '填充标题',
          copyButtonText: '复制Markdown'
        },
        'juejin': {
          showFillButton: false,
          showCopyButton: true,
          fillButtonText: '填充',
          copyButtonText: '复制Markdown'
        },
        'zsxq': {
          showFillButton: false,
          showCopyButton: false,
          showOneClickPublish: true,
          fillButtonText: '填充',
          copyButtonText: '复制',
          oneClickPublishText: '选择发布'
        },
        'default': {
          showFillButton: true,
          showCopyButton: true,
          fillButtonText: '填充',
          copyButtonText: '复制'
        }
      };

      return configs[platform] || configs['default'];
    },

    // 根据平台配置生成按钮HTML
    generatePlatformButtons(articleId, config) {
      let buttonsHtml = '';

      // 填充按钮
      if (config.showFillButton) {
        buttonsHtml += `
          <button class="ziliu-fill-btn" data-article-id="${articleId}" title="填充到编辑器">
            ${config.fillButtonText}
          </button>
        `;
      }

      // 复制按钮
      if (config.showCopyButton) {
        buttonsHtml += `
          <button class="ziliu-copy-markdown-btn" data-article-id="${articleId}" title="复制Markdown">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
        `;
      }

      // 一键发布按钮（知识星球专用）
      if (config.showOneClickPublish) {
        buttonsHtml += `
          <button class="ziliu-one-click-publish-btn" data-article-id="${articleId}" title="选择知识星球进行发布">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            ${config.oneClickPublishText}
          </button>
        `;
      }

      return buttonsHtml;
    },

    // 根据平台生成复制内容
    generateCopyContent(platform, article, articleData) {
      switch (platform) {
        case 'zhihu':
          return this.generateZhihuCopyContent(article, articleData);
        case 'juejin':
          return this.generateJuejinCopyContent(article, articleData);
        case 'wechat':
        default:
          // 公众号和其他平台只复制原始内容
          return articleData.content || '暂无内容';
      }
    },

    // 生成知乎平台的复制内容
    generateZhihuCopyContent(article, articleData) {
      // 查找知乎平台的预设，增加容错处理
      let zhihuPreset = null;

      // 首先查找明确标记为知乎平台的预设
      zhihuPreset = this.state.presets.find(preset =>
        preset.platform === 'zhihu' && preset.isDefault
      ) || this.state.presets.find(preset => preset.platform === 'zhihu');

      // 如果没有找到知乎预设，尝试查找默认预设或任意预设
      if (!zhihuPreset) {
        console.log('🔍 未找到知乎专用预设，尝试使用默认预设');
        zhihuPreset = this.state.presets.find(preset => preset.isDefault) ||
                      this.state.presets[0] || null;
      }

      console.log('🔍 知乎平台复制，所有预设:', this.state.presets);
      console.log('🔍 知乎平台复制，最终选择的预设:', zhihuPreset);
      console.log('🔍 知乎平台复制，预设详情:', zhihuPreset ? {
        id: zhihuPreset.id,
        name: zhihuPreset.name,
        platform: zhihuPreset.platform,
        isDefault: zhihuPreset.isDefault,
        headerContent: zhihuPreset.headerContent,
        footerContent: zhihuPreset.footerContent
      } : '未找到任何可用预设');

      let content = '';

      // 添加开头内容
      if (zhihuPreset?.headerContent) {
        console.log('🔍 添加预设开头内容:', zhihuPreset.headerContent.substring(0, 50) + '...');
        content += zhihuPreset.headerContent + '\n\n';
      } else {
        console.log('🔍 没有预设开头内容');
      }

      // 添加文章内容
      content += articleData.content || '暂无内容';

      // 添加结尾内容
      if (zhihuPreset?.footerContent) {
        console.log('🔍 添加预设结尾内容:', zhihuPreset.footerContent.substring(0, 50) + '...');
        content += '\n\n' + zhihuPreset.footerContent;
      } else {
        console.log('🔍 没有预设结尾内容');
      }

      console.log('🔍 最终复制内容长度:', content.length);
      return content;
    },

    // 生成掘金平台的复制内容（和知乎平台保持一致）
    generateJuejinCopyContent(article, articleData) {
      // 查找掘金平台的预设，增加容错处理
      let juejinPreset = null;

      // 首先查找明确标记为掘金平台的预设
      juejinPreset = this.state.presets.find(preset =>
        preset.platform === 'juejin' && preset.isDefault
      ) || this.state.presets.find(preset => preset.platform === 'juejin');

      // 如果没有找到掘金预设，尝试查找默认预设或任意预设
      if (!juejinPreset) {
        console.log('🔍 未找到掘金专用预设，尝试使用默认预设');
        juejinPreset = this.state.presets.find(preset => preset.isDefault) ||
                       this.state.presets[0] || null;
      }

      console.log('🔍 掘金平台复制，所有预设:', this.state.presets);
      console.log('🔍 掘金平台复制，最终选择的预设:', juejinPreset);
      console.log('🔍 掘金平台复制，预设详情:', juejinPreset ? {
        id: juejinPreset.id,
        name: juejinPreset.name,
        platform: juejinPreset.platform,
        isDefault: juejinPreset.isDefault,
        headerContent: juejinPreset.headerContent,
        footerContent: juejinPreset.footerContent
      } : '未找到任何可用预设');

      let content = '';

      // 添加开头内容
      if (juejinPreset?.headerContent) {
        console.log('🔍 添加预设开头内容:', juejinPreset.headerContent.substring(0, 50) + '...');
        content += juejinPreset.headerContent + '\n\n';
      } else {
        console.log('🔍 没有预设开头内容');
      }

      // 添加文章内容
      content += articleData.content || '暂无内容';

      // 添加结尾内容
      if (juejinPreset?.footerContent) {
        console.log('🔍 添加预设结尾内容:', juejinPreset.footerContent.substring(0, 50) + '...');
        content += '\n\n' + juejinPreset.footerContent;
      } else {
        console.log('🔍 没有预设结尾内容');
      }

      console.log('🔍 最终复制内容长度:', content.length);
      return content;
    },

    // 获取复制成功消息
    getCopySuccessMessage(platform) {
      switch (platform) {
        case 'zhihu':
          const hasZhihuPreset = this.state.presets.some(preset => preset.platform === 'zhihu');
          return hasZhihuPreset
            ? 'Markdown内容（含知乎预设）已复制到剪贴板！'
            : 'Markdown内容已复制到剪贴板！';
        case 'juejin':
          const hasJuejinPreset = this.state.presets.some(preset => preset.platform === 'juejin');
          return hasJuejinPreset
            ? 'Markdown内容（含掘金预设）已复制到剪贴板！'
            : 'Markdown内容已复制到剪贴板！';
        case 'wechat':
        default:
          return 'Markdown内容已复制到剪贴板！';
      }
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

      // 检测当前平台，根据平台配置决定显示哪些按钮
      const platformInfo = ZiliuEditor.detectPlatformAndElements();
      const platformConfig = this.getPlatformConfig(platformInfo.platform);

      // 根据平台配置生成按钮HTML
      const buttonsHtml = this.generatePlatformButtons(article.id, platformConfig);

      div.innerHTML = `
        <div class="ziliu-article-header">
          <div class="ziliu-article-title">${article.title}</div>
          <div class="ziliu-article-actions">
            ${buttonsHtml}
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

      // 填充按钮事件（仅在按钮存在时绑定）
      const fillBtn = div.querySelector('.ziliu-fill-btn');
      if (fillBtn) {
        fillBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // 阻止冒泡到文章项点击事件
          this.fillArticleToEditor(article);
        });
      }

      // 复制Markdown按钮事件（仅在按钮存在时绑定）
      const copyMarkdownBtn = div.querySelector('.ziliu-copy-markdown-btn');
      if (copyMarkdownBtn) {
        copyMarkdownBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); // 阻止冒泡到文章项点击事件
          await this.copyArticleMarkdown(article, copyMarkdownBtn);
        });
      }

      // 一键发布按钮事件（仅在按钮存在时绑定）
      const oneClickPublishBtn = div.querySelector('.ziliu-one-click-publish-btn');
      if (oneClickPublishBtn) {
        oneClickPublishBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); // 阻止冒泡到文章项点击事件
          await this.oneClickPublishArticle(article, oneClickPublishBtn);
        });
      }

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
      // 注意：知乎平台可能没有填充按钮
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

        // 检测当前平台
        const platformInfo = ZiliuEditor.detectPlatformAndElements();
        console.log('🔍 填充时检测到的平台:', platformInfo);

        if (!platformInfo.platformInstance) {
          throw new Error('当前页面不是支持的编辑器平台');
        }

        // 根据平台转换文章格式
        const targetFormat = platformInfo.platform === 'zhihu' ? 'zhihu' : 'wechat';
        let htmlToFill = await ZiliuAPI.convertArticleFormat(
          articleDetail.originalContent || articleDetail.content,
          targetFormat,
          articleDetail.style || 'default'
        );

        if (showProgress) {
          ZiliuUI.showProgress('正在填充内容...', '正在定位编辑器元素');
        }

        // 如果是知乎平台且编辑器元素未找到，尝试等待
        if (platformInfo.platform === 'zhihu' && !platformInfo.isEditor) {
          console.log('🔍 知乎平台编辑器未就绪，等待加载...');
          const retryElements = await platformInfo.platformInstance.waitForEditor();
          if (!retryElements.isEditor) {
            throw new Error('知乎编辑器加载失败，请刷新页面重试');
          }
          // 更新平台信息
          Object.assign(platformInfo, retryElements);
        }

        if (showProgress) {
          ZiliuUI.showProgress('正在填充内容...', '正在填充文章内容');
        }

        // 获取原始Markdown内容（用于知乎文档导入）
        let originalMarkdown = '';
        try {
          const markdownData = await ZiliuAPI.fetchArticleMarkdown(article.id);
          originalMarkdown = markdownData.content || '';
        } catch (error) {
          console.warn('获取原始Markdown失败，将使用HTML内容:', error);
        }

        // 填充内容（使用平台特定的方法）
        const fillData = {
          title: articleDetail.title,
          content: htmlToFill,
          originalMarkdown: originalMarkdown, // 添加原始Markdown内容
          author: this.state.selectedPreset?.authorName || '孟健',
          summary: articleDetail.summary || '',
          preset: this.state.selectedPreset
        };

        const result = await platformInfo.platformInstance.fillContent(fillData);

        if (!result.success) {
          // 如果平台建议显示复制选项，则提供复制功能
          if (result.showCopyOption) {
            console.log('🔍 平台不支持填充，提供复制选项');

            // 显示复制选项
            if (fillBtn) {
              fillBtn.innerHTML = '复制内容';
              fillBtn.disabled = false;

              // 临时改变按钮行为为复制
              const copyHandler = async () => {
                fillBtn.innerHTML = '复制中...';
                fillBtn.disabled = true;

                try {
                  const copyResult = await platformInfo.platformInstance.copyContent(fillData);
                  if (copyResult.success) {
                    fillBtn.innerHTML = '已复制';
                    ZiliuUtils.showNotification(copyResult.message || '内容已复制到剪贴板', 'success');
                  } else {
                    throw new Error(copyResult.error || '复制失败');
                  }
                } catch (copyError) {
                  fillBtn.innerHTML = '复制失败';
                  ZiliuUtils.showNotification(copyError.message, 'error');
                }

                setTimeout(() => {
                  fillBtn.innerHTML = originalContent;
                  fillBtn.disabled = false;
                  fillBtn.removeEventListener('click', copyHandler);
                }, 2000);
              };

              fillBtn.addEventListener('click', copyHandler);
            }

            if (showProgress) {
              ZiliuUI.showError(result.error + '\n\n点击"复制内容"按钮将内容复制到剪贴板');
            } else {
              ZiliuUtils.showNotification(result.error + '，请点击"复制内容"按钮', 'warning');
            }

            return false; // 表示没有自动填充，但提供了复制选项
          }

          throw new Error(result.error || '内容填充失败');
        }

        console.log('✅ 平台填充结果:', result);

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
      const editUrl = `${window.ZiliuConstants?.API_BASE_URL || 'http://localhost:3000'}/editor/${articleId}`;
      window.open(editUrl, '_blank');
    },

    // 打开知识星球选择器
    async oneClickPublishArticle(article, buttonElement) {
      const originalContent = buttonElement.innerHTML;
      
      try {
        buttonElement.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="ziliu-loading-spin"><circle cx="12" cy="12" r="3"/></svg>加载中...';
        buttonElement.disabled = true;

        // 获取知识星球平台实例
        const platformInfo = ZiliuEditor.detectPlatformAndElements();
        if (platformInfo.platform !== 'zsxq') {
          throw new Error('发布功能仅在知识星球页面可用');
        }

        // 创建知识星球平台实例并获取星球列表
        const zsxqPlatform = new window.ZsxqPlatform();
        const groups = await zsxqPlatform.fetchUserGroups(true);

        if (groups.length === 0) {
          throw new Error('未找到任何知识星球，请确保已登录');
        }

        // 恢复按钮状态
        buttonElement.innerHTML = originalContent;
        buttonElement.disabled = false;

        // 调试：检查groups数据
        console.log('🔍 传递给UI的groups数据:', groups.map(g => ({
          groupId: g.groupId,
          name: g.name,
          lastSelected: g.lastSelected
        })));

        // 打开星球选择器弹窗
        this.showGroupSelector(article, groups, zsxqPlatform);

      } catch (error) {
        console.error('❌ 获取星球列表失败:', error);
        
        buttonElement.innerHTML = '❌ 加载失败';
        buttonElement.style.background = '#fff2f0';
        buttonElement.style.color = '#ff4d4f';
        buttonElement.style.borderColor = '#ffb3b3';
        
        ZiliuUtils.showNotification('获取星球列表失败: ' + error.message, 'error');
        
        // 3秒后恢复按钮状态
        setTimeout(() => {
          buttonElement.innerHTML = originalContent;
          buttonElement.disabled = false;
          buttonElement.style.background = '';
          buttonElement.style.color = '';
          buttonElement.style.borderColor = '';
        }, 3000);
      }
    },

    // 复制文章Markdown
    async copyArticleMarkdown(article, buttonElement) {
      const originalContent = buttonElement.innerHTML;

      try {
        buttonElement.innerHTML = '复制中...';
        buttonElement.disabled = true;

        // 获取文章原始Markdown内容
        const articleData = await ZiliuAPI.fetchArticleMarkdown(article.id);

        let markdownContent = '';

        // 检测当前平台
        const platformInfo = ZiliuEditor.detectPlatformAndElements();

        // 根据平台处理复制内容
        markdownContent = this.generateCopyContent(platformInfo.platform, article, articleData);

        // 复制到剪贴板
        await navigator.clipboard.writeText(markdownContent);

        // 显示成功状态
        buttonElement.innerHTML = '已复制!';
        buttonElement.style.background = '#52c41a';
        buttonElement.style.borderColor = '#52c41a';
        buttonElement.style.color = 'white';

        // 显示通知
        const message = this.getCopySuccessMessage(platformInfo.platform);
        ZiliuUtils.showNotification(message, 'success');

        setTimeout(() => {
          buttonElement.innerHTML = originalContent;
          buttonElement.disabled = false;
          buttonElement.style.background = '';
          buttonElement.style.borderColor = '';
          buttonElement.style.color = '';
        }, 2000);

      } catch (error) {
        console.error('复制Markdown失败:', error);

        buttonElement.innerHTML = '复制失败';
        buttonElement.style.background = '#ff4d4f';
        buttonElement.style.borderColor = '#ff4d4f';
        buttonElement.style.color = 'white';

        ZiliuUtils.showNotification(error.message || '复制失败', 'error');

        setTimeout(() => {
          buttonElement.innerHTML = originalContent;
          buttonElement.disabled = false;
          buttonElement.style.background = '';
          buttonElement.style.borderColor = '';
          buttonElement.style.color = '';
        }, 2000);
      }
    },

    // 选择文章并填充到编辑器（静默模式，不显示进度条，不跳变）
    async selectArticle(articleId) {
      // 检测当前平台
      const platformInfo = ZiliuEditor.detectPlatformAndElements();

      // 如果是知乎或掘金平台，只填充标题
      if (platformInfo.platform === 'zhihu' || platformInfo.platform === 'juejin') {
        try {
          console.log(`🔍 ${platformInfo.platform}平台：点击列表项，只填充标题`);

          // 获取文章详情
          const articleDetail = await ZiliuAPI.fetchArticleDetail(articleId);

          // 查找编辑器元素
          const elements = platformInfo.platformInstance.findEditorElements();

          if (elements.isEditor && elements.titleInput && articleDetail.title) {
            // 只填充标题
            elements.titleInput.value = articleDetail.title;

            // 触发输入事件
            const inputEvent = new Event('input', { bubbles: true });
            elements.titleInput.dispatchEvent(inputEvent);

            // 触发变化事件
            const changeEvent = new Event('change', { bubbles: true });
            elements.titleInput.dispatchEvent(changeEvent);

            console.log(`✅ ${platformInfo.platform}标题填充完成:`, articleDetail.title);
            ZiliuUtils.showNotification('标题已填充，请使用复制按钮获取内容', 'success');
          } else {
            console.warn(`⚠️ ${platformInfo.platform}编辑器未找到或标题为空`);
            ZiliuUtils.showNotification(`${platformInfo.platform}编辑器未找到，请确保在编辑页面`, 'warning');
          }
        } catch (error) {
          console.error(`❌ ${platformInfo.platform}标题填充失败:`, error);
          ZiliuUtils.showNotification('标题填充失败: ' + error.message, 'error');
        }
        return;
      }

      // 其他平台使用统一的填充方法，静默模式，和填充按钮保持一致
      const article = { id: articleId };
      await this.fillArticleToEditor(article, { showProgress: false });
    },

    // 显示星球选择器
    showGroupSelector(article, groups, zsxqPlatform) {
      // 创建遮罩层
      const overlay = document.createElement('div');
      overlay.id = 'ziliu-group-selector-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // 创建弹窗
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        width: 600px;
        max-width: 90vw;
        max-height: 80vh;
        overflow: hidden;
        position: relative;
      `;

      // 弹窗HTML
      modal.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e1e8ed;
        ">
          <h3 style="
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #2d3436;
          ">选择知识星球</h3>
          <button id="ziliu-close-selector" style="
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #8b95a1;
            padding: 4px;
            line-height: 1;
          ">×</button>
        </div>
        
        <div style="padding: 16px 0;">
          <div style="
            padding: 0 24px 16px;
            color: #636e72;
            font-size: 14px;
          ">发布文章：<strong>${article.title}</strong></div>
          
          <div style="
            padding: 0 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
          ">
            <div style="color: #2d3436; font-weight: 500;">
              共找到 ${groups.length} 个星球
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="ziliu-select-all" style="
                background: #e6f7ff;
                color: #1890ff;
                border: 1px solid #91d5ff;
                border-radius: 6px;
                padding: 4px 12px;
                font-size: 12px;
                cursor: pointer;
              ">全选</button>
              <button id="ziliu-select-none" style="
                background: #f5f5f5;
                color: #8b95a1;
                border: 1px solid #d9d9d9;
                border-radius: 6px;
                padding: 4px 12px;
                font-size: 12px;
                cursor: pointer;
              ">取消全选</button>
            </div>
          </div>
          
          <div id="ziliu-groups-list" style="
            max-height: 400px;
            overflow-y: auto;
            padding: 0 24px;
          ">
            ${groups.map(group => {
              // 检查是否是上次选择的星球
              const isLastSelected = group.lastSelected || false;
              const lastSelectedStyle = isLastSelected ? `
                border-color: #52c41a !important;
                background: #f6ffed !important;
                box-shadow: 0 2px 8px rgba(82, 196, 26, 0.2) !important;
              ` : '';
              
              return `
              <label style="
                display: flex;
                align-items: center;
                padding: 12px;
                margin-bottom: 8px;
                border: 2px solid #f0f0f0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: white;
                ${lastSelectedStyle}
                position: relative;
              " class="group-item" data-group-id="${group.groupId}" data-last-selected="${isLastSelected}" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='${isLastSelected ? '0 2px 8px rgba(82, 196, 26, 0.2)' : 'none'}'">
                ${isLastSelected ? `
                  <div style="
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #52c41a;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    border: 2px solid white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  ">★</div>
                ` : ''}
                <input type="checkbox" value="${group.groupId}" style="
                  margin-right: 12px;
                  transform: scale(1.2);
                " class="group-checkbox" ${isLastSelected ? 'checked' : ''}>
                <div style="flex: 1;">
                  <div style="
                    font-weight: 500;
                    color: #2d3436;
                    margin-bottom: 4px;
                  ">${group.name}${isLastSelected ? ' 🏆' : ''}</div>
                  <div style="
                    font-size: 12px;
                    color: #8b95a1;
                  ">${group.memberCount || 0} 个成员${isLastSelected ? ' • 上次发布成功' : ''}</div>
                </div>
              </label>
              `;
            }).join('')}
          </div>
        </div>
        
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-top: 1px solid #e1e8ed;
          background: #f8f9fa;
        ">
          <div style="color: #636e72; font-size: 14px;">
            已选择 <span id="ziliu-selected-count">0</span> 个星球
          </div>
          <div style="display: flex; gap: 12px;">
            <button id="ziliu-cancel-publish" style="
              background: #f5f5f5;
              color: #8b95a1;
              border: 1px solid #d9d9d9;
              border-radius: 6px;
              padding: 8px 16px;
              cursor: pointer;
            ">取消</button>
            <button id="ziliu-confirm-publish" style="
              background: #ff4d4f;
              color: white;
              border: 1px solid #ff4d4f;
              border-radius: 6px;
              padding: 8px 16px;
              cursor: pointer;
              font-weight: 500;
            " disabled>发布到选中星球</button>
          </div>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // 绑定事件
      this.bindGroupSelectorEvents(overlay, article, groups, zsxqPlatform);
    },

    // 绑定星球选择器事件
    bindGroupSelectorEvents(overlay, article, groups, zsxqPlatform) {
      const selectedCount = overlay.querySelector('#ziliu-selected-count');
      const confirmBtn = overlay.querySelector('#ziliu-confirm-publish');
      const checkboxes = overlay.querySelectorAll('.group-checkbox');

      // 更新选中数量
      const updateSelectedCount = () => {
        const checkedCount = overlay.querySelectorAll('.group-checkbox:checked').length;
        selectedCount.textContent = checkedCount;
        confirmBtn.disabled = checkedCount === 0;
        if (checkedCount > 0) {
          confirmBtn.style.background = '#ff4d4f';
          confirmBtn.style.opacity = '1';
        } else {
          confirmBtn.style.background = '#ccc';
          confirmBtn.style.opacity = '0.6';
        }
      };

      // 复选框变化事件
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          updateSelectedCount();
          
          // 更新对应项目的样式
          const groupItem = checkbox.closest('.group-item');
          if (checkbox.checked) {
            groupItem.style.borderColor = '#ff4d4f';
            groupItem.style.background = '#fff1f0';
          } else {
            groupItem.style.borderColor = '#f0f0f0';
            groupItem.style.background = 'white';
          }
        });
      });

      // 全选按钮
      overlay.querySelector('#ziliu-select-all').addEventListener('click', () => {
        checkboxes.forEach(checkbox => {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change'));
        });
      });

      // 取消全选按钮
      overlay.querySelector('#ziliu-select-none').addEventListener('click', () => {
        checkboxes.forEach(checkbox => {
          checkbox.checked = false;
          checkbox.dispatchEvent(new Event('change'));
        });
      });

      // 关闭按钮
      overlay.querySelector('#ziliu-close-selector').addEventListener('click', () => {
        overlay.remove();
      });

      // 取消按钮
      overlay.querySelector('#ziliu-cancel-publish').addEventListener('click', () => {
        overlay.remove();
      });

      // 键盘支持
      document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
          overlay.remove();
          document.removeEventListener('keydown', escapeHandler);
        }
      });

      // 点击遮罩层关闭
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
        }
      });

      // 确认发布按钮
      overlay.querySelector('#ziliu-confirm-publish').addEventListener('click', async () => {
        const selectedGroupIds = Array.from(overlay.querySelectorAll('.group-checkbox:checked'))
          .map(checkbox => checkbox.value);
        
        if (selectedGroupIds.length === 0) {
          ZiliuUtils.showNotification('请选择要发布的星球', 'warning');
          return;
        }

        // 立即保存用户选择（不等待发布成功）
        zsxqPlatform.saveLastSelectedGroups(selectedGroupIds);
        console.log('💾 已保存用户选择的星球:', selectedGroupIds);

        // 关闭选择弹窗
        overlay.remove();

        // 显示进度界面
        this.showBatchPublishProgress(selectedGroupIds, groups);

        // 执行发布
        await this.publishToSelectedGroups(article, selectedGroupIds, groups, zsxqPlatform);
      });

      // 初始化计数更新（上次选择的星球默认已选中）
      updateSelectedCount();
    },

    // 显示批量发布进度界面
    showBatchPublishProgress(selectedGroupIds, groups) {
      // 创建进度遮罩层
      const progressOverlay = document.createElement('div');
      progressOverlay.id = 'ziliu-batch-progress-overlay';
      progressOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // 创建进度弹窗
      const progressModal = document.createElement('div');
      progressModal.style.cssText = `
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        width: 600px;
        max-width: 90vw;
        max-height: 80vh;
        overflow: hidden;
        position: relative;
      `;

      // 获取选中的星球信息
      const selectedGroups = selectedGroupIds.map(id => 
        groups.find(g => g.groupId === id) || { groupId: id, name: `星球-${id}` }
      );

      // 进度弹窗HTML
      progressModal.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 24px;
          color: white;
        ">
          <h3 style="margin: 0; font-size: 20px; font-weight: 600;">
            批量发布进度
          </h3>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">
            正在发布到 ${selectedGroupIds.length} 个知识星球...
          </p>
        </div>
        
        <div style="padding: 24px;">
          <!-- 整体进度条 -->
          <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 500; color: #2d3436;">总进度</span>
              <span id="batch-overall-progress" style="font-weight: 500; color: #667eea;">0/${selectedGroupIds.length}</span>
            </div>
            <div style="
              width: 100%;
              height: 8px;
              background: #f1f3f4;
              border-radius: 4px;
              overflow: hidden;
            ">
              <div id="batch-progress-bar" style="
                width: 0%;
                height: 100%;
                background: linear-gradient(90deg, #667eea, #764ba2);
                transition: width 0.3s ease;
              "></div>
            </div>
          </div>

          <!-- 统计信息 -->
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
            text-align: center;
          ">
            <div style="
              background: #f6ffed;
              border: 1px solid #b7eb8f;
              border-radius: 8px;
              padding: 12px;
            ">
              <div id="batch-success-count" style="
                font-size: 24px;
                font-weight: bold;
                color: #52c41a;
              ">0</div>
              <div style="font-size: 12px; color: #52c41a; margin-top: 4px;">成功</div>
            </div>
            <div style="
              background: #fff2f0;
              border: 1px solid #ffb3b3;
              border-radius: 8px;
              padding: 12px;
            ">
              <div id="batch-error-count" style="
                font-size: 24px;
                font-weight: bold;
                color: #ff4d4f;
              ">0</div>
              <div style="font-size: 12px; color: #ff4d4f; margin-top: 4px;">失败</div>
            </div>
            <div style="
              background: #f0f5ff;
              border: 1px solid #adc6ff;
              border-radius: 8px;
              padding: 12px;
            ">
              <div id="batch-pending-count" style="
                font-size: 24px;
                font-weight: bold;
                color: #1890ff;
              ">${selectedGroupIds.length}</div>
              <div style="font-size: 12px; color: #1890ff; margin-top: 4px;">等待</div>
            </div>
          </div>

          <!-- 当前发布状态 -->
          <div id="batch-current-status" style="
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
          ">
            <div class="batch-loading-spinner" style="
              width: 20px;
              height: 20px;
              border: 2px solid #e3e3e3;
              border-top: 2px solid #667eea;
              border-radius: 50%;
              animation: batch-spin 1s linear infinite;
            "></div>
            <span id="batch-status-text" style="color: #495057;">准备开始发布...</span>
          </div>

          <!-- 星球列表 -->
          <div style="
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            background: #fafafa;
          ">
            <div style="
              padding: 12px 16px;
              background: #f1f3f4;
              border-bottom: 1px solid #dee2e6;
              font-weight: 500;
              font-size: 14px;
              color: #495057;
            ">
              发布列表 (${selectedGroupIds.length} 个星球)
            </div>
            <div id="batch-groups-list">
              ${selectedGroups.map(group => `
                <div id="batch-group-${group.groupId}" style="
                  padding: 12px 16px;
                  border-bottom: 1px solid #f1f3f4;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  background: white;
                ">
                  <span style="font-size: 14px; color: #495057;">${group.name}</span>
                  <span class="batch-group-status" style="
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    background: #e9ecef;
                    color: #6c757d;
                  ">等待中</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <style>
          @keyframes batch-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;

      progressOverlay.appendChild(progressModal);
      document.body.appendChild(progressOverlay);

      // 存储进度界面的引用，供更新使用
      this.batchProgressOverlay = progressOverlay;
    },

    // 更新批量发布进度
    updateBatchProgress({ current, total, currentGroup, successCount, failCount, status }) {
      if (!this.batchProgressOverlay) return;

      // 更新进度条
      const progressPercent = (current / total) * 100;
      const progressBar = this.batchProgressOverlay.querySelector('#batch-progress-bar');
      if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
      }

      // 更新整体进度文字
      const overallProgress = this.batchProgressOverlay.querySelector('#batch-overall-progress');
      if (overallProgress) {
        overallProgress.textContent = `${current}/${total}`;
      }

      // 更新统计数字
      const successCountEl = this.batchProgressOverlay.querySelector('#batch-success-count');
      const errorCountEl = this.batchProgressOverlay.querySelector('#batch-error-count');
      const pendingCountEl = this.batchProgressOverlay.querySelector('#batch-pending-count');
      
      if (successCountEl) successCountEl.textContent = successCount;
      if (errorCountEl) errorCountEl.textContent = failCount;
      if (pendingCountEl) pendingCountEl.textContent = total - current;

      // 更新当前状态文字
      const statusText = this.batchProgressOverlay.querySelector('#batch-status-text');
      if (statusText) {
        if (status === 'publishing') {
          statusText.textContent = `正在发布到：${currentGroup}`;
        } else if (status === 'waiting') {
          statusText.textContent = `等待发布下一个星球...`;
        } else if (status === 'completed') {
          statusText.textContent = `发布完成！成功 ${successCount} 个，失败 ${failCount} 个`;
        }
      }

      // 如果完成，隐藏加载动画
      if (status === 'completed') {
        const spinner = this.batchProgressOverlay.querySelector('.batch-loading-spinner');
        if (spinner) {
          spinner.style.display = 'none';
        }
      }
    },

    // 更新单个星球的状态
    updateGroupStatus(groupId, status, message) {
      if (!this.batchProgressOverlay) return;

      const groupElement = this.batchProgressOverlay.querySelector(`#batch-group-${groupId}`);
      if (!groupElement) return;

      const statusElement = groupElement.querySelector('.batch-group-status');
      if (!statusElement) return;

      // 根据状态设置样式和文字
      switch (status) {
        case 'publishing':
          statusElement.style.background = '#e6f7ff';
          statusElement.style.color = '#1890ff';
          statusElement.textContent = message || '发布中...';
          break;
        case 'retrying':
          statusElement.style.background = '#fff7e6';
          statusElement.style.color = '#fa8c16';
          statusElement.textContent = message || '重试中...';
          break;
        case 'success':
          statusElement.style.background = '#f6ffed';
          statusElement.style.color = '#52c41a';
          statusElement.textContent = message || '成功';
          break;
        case 'error':
          statusElement.style.background = '#fff2f0';
          statusElement.style.color = '#ff4d4f';
          statusElement.textContent = message || '失败';
          statusElement.title = message; // 鼠标悬停显示详细错误
          break;
        default:
          statusElement.style.background = '#e9ecef';
          statusElement.style.color = '#6c757d';
          statusElement.textContent = message || '等待中';
      }
    },

    // 显示批量发布完成界面
    showBatchPublishCompleted(successCount, failCount, results) {
      if (!this.batchProgressOverlay) return;

      // 更新状态文字
      const statusElement = this.batchProgressOverlay.querySelector('#batch-status-text');
      if (statusElement) {
        statusElement.textContent = `发布完成！成功 ${successCount} 个，失败 ${failCount} 个`;
      }

      // 隐藏加载动画
      const spinner = this.batchProgressOverlay.querySelector('.batch-loading-spinner');
      if (spinner) {
        spinner.style.display = 'none';
      }

      // 为失败的星球添加重试按钮
      const failedResults = results.filter(r => !r.success && r.canRetry);
      failedResults.forEach(result => {
        const groupElement = this.batchProgressOverlay.querySelector(`#batch-group-${result.groupId}`);
        if (groupElement) {
          // 检查是否已有重试按钮
          if (groupElement.querySelector('.retry-btn')) return;
          
          const retryButton = document.createElement('button');
          retryButton.className = 'retry-btn';
          retryButton.style.cssText = `
            background: #fa8c16;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
            margin-left: 8px;
          `;
          retryButton.textContent = '重试';
          
          retryButton.addEventListener('click', () => {
            this.retryPublishToGroup(result.groupId, result.groupName, results);
          });
          
          groupElement.appendChild(retryButton);
        }
      });

      // 添加底部按钮容器
      const modal = this.batchProgressOverlay.querySelector('div div:last-child');
      if (modal) {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #dee2e6;
          background: #f8f9fa;
        `;

        const hasFailedItems = failedResults.length > 0;
        
        buttonContainer.innerHTML = `
          ${hasFailedItems ? `
            <button id="batch-retry-all-btn" style="
              background: #fa8c16;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 8px 16px;
              cursor: pointer;
              font-size: 14px;
            ">重试全部失败</button>
          ` : ''}
          <button id="batch-close-btn" style="
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
          ">关闭</button>
          <button id="batch-view-details-btn" style="
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
          ">查看详情</button>
        `;

        modal.appendChild(buttonContainer);

        // 绑定关闭事件
        buttonContainer.querySelector('#batch-close-btn').addEventListener('click', () => {
          this.batchProgressOverlay.remove();
          this.batchProgressOverlay = null;
        });

        // 绑定查看详情事件
        buttonContainer.querySelector('#batch-view-details-btn').addEventListener('click', () => {
          console.table(results);
          alert(`发布详情已输出到控制台\n\n成功: ${successCount} 个\n失败: ${failCount} 个`);
        });

        // 绑定重试全部失败事件
        if (hasFailedItems) {
          buttonContainer.querySelector('#batch-retry-all-btn').addEventListener('click', () => {
            this.retryAllFailedGroups(results);
          });
        }
      }

      // 只在全部成功时自动关闭
      if (failCount === 0) {
        setTimeout(() => {
          if (this.batchProgressOverlay) {
            this.batchProgressOverlay.remove();
            this.batchProgressOverlay = null;
          }
        }, 3000);
      }
    },

    // 重试单个星球发布
    async retryPublishToGroup(groupId, groupName, results) {
      console.log(`🔄 手动重试发布到星球: ${groupName}`);
      
      // 更新状态为重试中
      this.updateGroupStatus(groupId, 'retrying', '重试中...');
      
      // 禁用重试按钮
      const groupElement = this.batchProgressOverlay.querySelector(`#batch-group-${groupId}`);
      const retryBtn = groupElement?.querySelector('.retry-btn');
      if (retryBtn) {
        retryBtn.disabled = true;
        retryBtn.textContent = '重试中...';
      }

      try {
        // 获取当前文章数据 (从缓存或重新获取)
        let articleData = this.currentArticleData;
        if (!articleData) {
          // 如果没有缓存，重新获取文章
          const article = this.selectedArticle;
          if (!article) {
            throw new Error('无法获取文章信息');
          }
          articleData = await ZiliuAPI.fetchArticleDetail(article.id);
          this.currentArticleData = articleData;
        }

        const publishData = {
          title: articleData.title,
          content: articleData.inlineHtml || articleData.content,
          originalMarkdown: articleData.markdown || articleData.originalMarkdown
        };

        const zsxqPlatform = this.currentZsxqPlatform;
        if (!zsxqPlatform) {
          throw new Error('知识星球平台未初始化');
        }

        const result = await zsxqPlatform.publishToGroup(publishData, { groupId: groupId, name: groupName });
        
        if (result && result.success) {
          // 重试成功
          console.log(`✅ 重试成功: ${groupName}`);
          this.updateGroupStatus(groupId, 'success', '发布成功');
          
          // 更新结果数组
          const resultIndex = results.findIndex(r => r.groupId === groupId);
          if (resultIndex !== -1) {
            results[resultIndex] = { groupId, groupName, success: true, url: result.url };
          }
          
          // 移除重试按钮
          if (retryBtn) {
            retryBtn.remove();
          }
          
          // 更新统计
          this.updateCompletionStats(results);
        } else {
          // 重试仍然失败
          const errorMsg = result?.error || '重试失败';
          console.log(`❌ 重试失败: ${groupName} - ${errorMsg}`);
          this.updateGroupStatus(groupId, 'error', errorMsg);
          
          // 恢复重试按钮
          if (retryBtn) {
            retryBtn.disabled = false;
            retryBtn.textContent = '重试';
          }
        }
      } catch (error) {
        console.error(`❌ 重试 ${groupName} 发生错误:`, error);
        this.updateGroupStatus(groupId, 'error', error.message);
        
        // 恢复重试按钮
        if (retryBtn) {
          retryBtn.disabled = false;
          retryBtn.textContent = '重试';
        }
      }
    },

    // 重试所有失败的星球
    async retryAllFailedGroups(results) {
      const failedResults = results.filter(r => !r.success && r.canRetry);
      console.log(`🔄 开始重试所有失败的星球，共 ${failedResults.length} 个`);

      // 禁用重试全部按钮
      const retryAllBtn = this.batchProgressOverlay?.querySelector('#batch-retry-all-btn');
      if (retryAllBtn) {
        retryAllBtn.disabled = true;
        retryAllBtn.textContent = '重试中...';
      }

      for (const result of failedResults) {
        await this.retryPublishToGroup(result.groupId, result.groupName, results);
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // 重试完成后重新启用按钮
      if (retryAllBtn) {
        const stillFailedCount = results.filter(r => !r.success && r.canRetry).length;
        if (stillFailedCount > 0) {
          retryAllBtn.disabled = false;
          retryAllBtn.textContent = '重试全部失败';
        } else {
          retryAllBtn.style.display = 'none';
        }
      }

      console.log(`✅ 重试完成`);
    },

    // 更新完成界面的统计信息
    updateCompletionStats(results) {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      // 更新成功失败计数
      const successElement = this.batchProgressOverlay?.querySelector('#batch-success-count');
      const failElement = this.batchProgressOverlay?.querySelector('#batch-fail-count');
      
      if (successElement) successElement.textContent = successCount;
      if (failElement) failElement.textContent = failCount;
      
      // 更新状态文字
      const statusElement = this.batchProgressOverlay?.querySelector('#batch-status-text');
      if (statusElement) {
        statusElement.textContent = `发布完成！成功 ${successCount} 个，失败 ${failCount} 个`;
      }
    },

    // 发布到选中的星球
    async publishToSelectedGroups(article, selectedGroupIds, groups, zsxqPlatform) {
      console.log('🚀 开始发布到选中的星球:', selectedGroupIds);
      
      try {
        // 获取文章详情
        const articleData = await ZiliuAPI.fetchArticleDetail(article.id);
        const content = articleData.inlineHtml || articleData.content;
        const title = articleData.title;

        if (!content) {
          throw new Error('文章内容为空，无法发布');
        }

        // 缓存数据供重试功能使用
        this.currentArticleData = articleData;
        this.selectedArticle = article;
        this.currentZsxqPlatform = zsxqPlatform;

        let successCount = 0;
        let failCount = 0;
        const results = [];

        // 逐个发布到选中的星球
        for (let i = 0; i < selectedGroupIds.length; i++) {
          const groupId = selectedGroupIds[i];
          const group = groups.find(g => g.groupId === groupId);
          const groupName = group ? group.name : `星球-${groupId}`;
          
          // 更新当前发布状态
          this.updateBatchProgress({
            current: i + 1,
            total: selectedGroupIds.length,
            currentGroup: groupName,
            successCount,
            failCount,
            status: 'publishing'
          });

          // 自动重试机制
          let publishResult = null;
          let lastError = null;
          const maxRetries = 2; // 最多重试2次（加上第一次总共3次尝试）
          
          for (let retry = 0; retry <= maxRetries; retry++) {
            try {
              if (retry === 0) {
                console.log(`📤 发布到星球: ${groupName} (${groupId})`);
                this.updateGroupStatus(groupId, 'publishing', '发布中...');
              } else {
                console.log(`🔄 重试发布到星球: ${groupName} (${groupId}) - 第${retry}次重试`);
                this.updateGroupStatus(groupId, 'retrying', `第${retry}次重试...`);
                // 重试前等待更长时间
                await new Promise(resolve => setTimeout(resolve, 2000));
              }

              // 调用知识星球平台的发布方法
              const publishData = {
                title: title,
                content: content,
                originalMarkdown: articleData.markdown || articleData.originalMarkdown
              };
              const result = await zsxqPlatform.publishToGroup(publishData, { groupId: groupId, name: groupName });
              
              if (result && result.success) {
                publishResult = { success: true, url: result.url };
                break; // 成功则跳出重试循环
              } else {
                lastError = result?.error || '发布失败';
                if (retry === maxRetries) {
                  publishResult = { success: false, error: lastError };
                }
              }
            } catch (error) {
              lastError = error.message;
              if (retry === maxRetries) {
                publishResult = { success: false, error: error.message };
              }
              console.error(`❌ 发布到 ${groupName} 失败 (尝试${retry + 1}/${maxRetries + 1}):`, error);
            }
          }

          // 处理最终结果
          if (publishResult && publishResult.success) {
            successCount++;
            results.push({ groupId, groupName, success: true, url: publishResult.url });
            console.log(`✅ 成功发布到: ${groupName}`);
            this.updateGroupStatus(groupId, 'success', '发布成功');
          } else {
            failCount++;
            const errorMsg = lastError || '发布失败';
            results.push({ groupId, groupName, success: false, error: errorMsg, canRetry: true });
            console.log(`❌ 发布失败: ${groupName} - ${errorMsg}`);
            this.updateGroupStatus(groupId, 'error', errorMsg);
          }

          // 更新整体进度
          this.updateBatchProgress({
            current: i + 1,
            total: selectedGroupIds.length,
            currentGroup: i < selectedGroupIds.length - 1 ? '准备下一个...' : '完成',
            successCount,
            failCount,
            status: i < selectedGroupIds.length - 1 ? 'waiting' : 'completed'
          });

          // 添加延迟避免请求过快
          if (i < selectedGroupIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // 显示完成状态
        this.showBatchPublishCompleted(successCount, failCount, results);

        // 详细结果输出到控制台
        console.log('📊 发布结果汇总:');
        results.forEach(result => {
          const status = result.success ? '✅ 成功' : '❌ 失败';
          const errorMsg = result.error ? ` (${result.error})` : '';
          console.log(`  ${status}: ${result.groupName}${errorMsg}`);
        });

      } catch (error) {
        console.error('❌ 批量发布失败:', error);
        ZiliuUtils.showNotification('批量发布失败: ' + error.message, 'error');
      }
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
      try {
        // 首先尝试新的平台检测方法
        const platformInfo = ZiliuEditor.detectPlatformAndElements();

        if (platformInfo.platformInstance) {
          // 使用平台特定的填充方法
          const result = await platformInfo.platformInstance.fillContent(request.data);
          sendResponse(result);
          return;
        }

        // 回退到原来的微信公众号逻辑（保持向后兼容）
        const elements = ZiliuEditor.findWeChatEditorElements();

        if (!elements.isWeChatEditor) {
          sendResponse({ success: false, error: '当前页面不是支持的编辑器' });
          return;
        }

        // 使用原来的微信填充方法
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
      initializeWithDelay();
    });
  } else {
    console.log('📄 页面已加载，开始初始化字流助手');
    initializeWithDelay();
  }

  // 带延迟的初始化函数，特别为掘金等动态加载的编辑器
  function initializeWithDelay() {
    ZiliuController.init();

    // 如果是掘金平台，则延迟重试检测（因为掘金编辑器是动态加载的）
    if (window.location.href.includes('juejin.cn/editor')) {
      setTimeout(() => {
        // 重新检测掘金编辑器
        const platformInfo = ZiliuEditor.detectPlatformAndElements();
        if (!platformInfo.isEditor) {
          console.log('🔄 掘金平台延迟重试检测...');
          ZiliuController.init();
        } else {
          console.log('✅ 掘金平台延迟检测成功');
        }
      }, 2000); // 2秒后重试
    }
  }

  console.log('✅ 字流主控制器模块已加载');
})();
