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

      // 添加标题
      if (article.title) {
        content += `# ${article.title}\n\n`;
      }

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

      // 添加标题
      if (article.title) {
        content += `# ${article.title}\n\n`;
      }

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
