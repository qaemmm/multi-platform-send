// 字流助手 - UI组件模块
(function() {
  'use strict';

  window.ZiliuUI = {
    // 创建主面板 - 融入微信编辑器风格
    createMainPanel() {
      // 检查是否已经创建了面板
      if (document.getElementById(ZiliuConstants.PANEL_ID)) {
        return;
      }

      // 在左侧工具栏添加字流助手按钮
      this.addToolbarButton();

      // 创建右侧面板
      this.createSidePanel();

      console.log('✅ 字流助手面板已创建');
    },

    // 在左侧工具栏添加字流助手按钮
    addToolbarButton() {
      // 检测当前平台并使用相应的工具栏选择器
      let toolbar = null;
      let platform = 'unknown';

      // 微信公众号编辑器
      if (document.querySelector('.js_editor_toolbar')) {
        toolbar = document.querySelector('.js_editor_toolbar') ||
                 document.querySelector('.editor_toolbar') ||
                 document.querySelector('.js_toolbar');
        platform = 'wechat';
      }
      // 知乎编辑器 - 查找知乎特有的工具栏
      else if (window.location.href.includes('zhuanlan.zhihu.com')) {
        // 知乎可能没有传统的工具栏，直接使用悬浮按钮
        platform = 'zhihu';
        console.log('🔍 知乎平台，使用悬浮按钮方案');
        this.createFloatingButton();
        return;
      }

      if (!toolbar) {
        console.warn('未找到工具栏，使用备用方案');
        this.createFloatingButton();
        return;
      }

      console.log(`🔍 检测到平台: ${platform}，找到工具栏:`, toolbar);

      const ziliuButton = document.createElement('div');
      ziliuButton.id = 'ziliu-toolbar-btn';
      ziliuButton.className = 'toolbar_item';
      ziliuButton.innerHTML = `
        <div class="toolbar_item_bd">
          <span class="toolbar_item_icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </span>
          <span class="toolbar_item_text">字流</span>
        </div>
      `;

      // 添加样式使其融入工具栏
      ziliuButton.style.cssText = `
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 12px;
        color: #576b95;
        min-width: 60px;
      `;

      ziliuButton.addEventListener('mouseenter', () => {
        ziliuButton.style.backgroundColor = '#f2f2f2';
      });

      ziliuButton.addEventListener('mouseleave', () => {
        ziliuButton.style.backgroundColor = 'transparent';
      });

      ziliuButton.addEventListener('click', () => {
        this.toggleSidePanel();
      });

      // 插入到工具栏的合适位置
      const firstItem = toolbar.querySelector('.toolbar_item');
      if (firstItem) {
        toolbar.insertBefore(ziliuButton, firstItem);
      } else {
        toolbar.appendChild(ziliuButton);
      }
    },

    // 获取平台配置
    getPlatformConfig() {
      const platformConfigs = {
        'zhihu': {
          color: '#0084ff',
          name: '知乎'
        },
        'juejin': {
          color: '#1E80FF', 
          name: '掘金'
        },
        'wechat': {
          color: '#07c160',
          name: '微信公众号'
        },
        'zsxq': {
          color: '#07c160',
          name: '知识星球'
        },
        'default': {
          color: '#667eea',
          name: '字流'
        }
      };

      // 检测当前平台
      if (window.location.href.includes('zhuanlan.zhihu.com')) {
        return platformConfigs.zhihu;
      } else if (window.location.href.includes('juejin.cn')) {
        return platformConfigs.juejin;
      } else if (window.location.href.includes('mp.weixin.qq.com')) {
        return platformConfigs.wechat;
      } else if (window.location.href.includes('zsxq.com')) {
        return platformConfigs.zsxq;
      }
      
      return platformConfigs.default;
    },

    // 创建悬浮按钮（备用方案）
    createFloatingButton() {
      // 检查是否已经存在悬浮按钮
      if (document.getElementById('ziliu-floating-btn')) {
        return;
      }

      const floatingBtn = document.createElement('div');
      floatingBtn.id = 'ziliu-floating-btn';

      // 获取平台配置
      const platformConfig = this.getPlatformConfig();
      const { color: bgColor, name: platformName } = platformConfig;
      const iconText = '字流'; // 统一使用"字流"

      floatingBtn.innerHTML = `
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">${iconText}</div>
      `;

      floatingBtn.style.cssText = `
        position: fixed;
        top: 50%;
        right: 20px;
        width: 56px;
        height: 56px;
        background: ${bgColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        transition: all 0.3s ease;
        transform: translateY(-50%);
        user-select: none;
      `;

      floatingBtn.addEventListener('mouseenter', () => {
        floatingBtn.style.transform = 'translateY(-50%) scale(1.1)';
        floatingBtn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
      });

      floatingBtn.addEventListener('mouseleave', () => {
        floatingBtn.style.transform = 'translateY(-50%) scale(1)';
        floatingBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      });

      floatingBtn.addEventListener('click', () => {
        this.toggleSidePanel();
      });

      document.body.appendChild(floatingBtn);
      console.log(`✅ 已创建${platformName}平台悬浮按钮`);
    },

    // 创建右侧面板
    createSidePanel() {
      const panel = document.createElement('div');
      panel.id = ZiliuConstants.PANEL_ID;
      panel.style.cssText = `
        position: fixed;
        top: 0;
        right: -400px;
        width: 380px;
        height: 100vh;
        background: white;
        border-left: 1px solid #e6e6e6;
        z-index: 9999;
        transition: right 0.3s ease;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      `;

      panel.innerHTML = this.getSidePanelHTML();
      document.body.appendChild(panel);

      // 添加样式
      this.addPanelStyles();

      // 添加窗口大小变化监听器
      this.addResizeListener();
    },

    // 添加窗口大小变化监听器
    addResizeListener() {
      if (this.resizeListener) return; // 避免重复添加

      this.resizeListener = () => {
        const panel = document.getElementById(ZiliuConstants.PANEL_ID);
        if (panel && panel.style.right === '0px') {
          this.updateListHeight();
        }
      };

      window.addEventListener('resize', this.resizeListener);
    },

    // 切换侧边面板显示/隐藏
    toggleSidePanel() {
      const panel = document.getElementById(ZiliuConstants.PANEL_ID);
      if (!panel) return;

      const isVisible = panel.style.right === '0px';
      panel.style.right = isVisible ? '-400px' : '0px';

      // 更新按钮状态
      const toolbarBtn = document.getElementById('ziliu-toolbar-btn');
      if (toolbarBtn) {
        toolbarBtn.style.backgroundColor = isVisible ? 'transparent' : '#e6f7ff';
        toolbarBtn.style.color = isVisible ? '#576b95' : '#07c160';
      }

      // 如果面板变为可见，动态计算高度
      if (!isVisible) {
        setTimeout(() => this.updateListHeight(), 100); // 等待动画完成
      }
    },

    // 动态计算列表高度
    updateListHeight() {
      const panel = document.getElementById(ZiliuConstants.PANEL_ID);
      const header = document.getElementById('ziliu-panel-header');
      const controlSection = document.querySelector('.ziliu-control-section');
      const articlesWrapper = document.querySelector('.ziliu-articles-wrapper');
      const articlesContainer = document.getElementById('ziliu-articles-container');
      const pagination = document.getElementById('ziliu-pagination');

      if (panel && header && controlSection && articlesWrapper) {
        // 获取面板的实际高度
        const panelHeight = panel.offsetHeight;
        const headerHeight = header.offsetHeight;
        const controlHeight = controlSection.offsetHeight;

        // 计算分页高度（如果显示的话）
        let paginationHeight = 0;
        if (pagination && pagination.style.display !== 'none' && pagination.children.length > 0) {
          paginationHeight = 65; // 分页控件的固定高度
        }

        // 计算可用高度：面板高度 - 头部 - 控制区域 - 分页 - 内边距
        const availableHeight = panelHeight - headerHeight - controlHeight - paginationHeight - 40; // 40px for padding

        // 设置文章容器的高度
        if (articlesContainer) {
          articlesContainer.style.height = `${availableHeight}px`;
          articlesContainer.style.maxHeight = `${availableHeight}px`;
          articlesContainer.style.overflowY = 'auto';
        }

        // 确保wrapper不设置固定高度，让它自适应
        articlesWrapper.style.height = 'auto';
        articlesWrapper.style.maxHeight = 'none';
      }
    },

    // 获取侧边面板HTML结构
    getSidePanelHTML() {
      return `
        <div id="ziliu-panel-header">
          <div class="ziliu-brand">
            <div class="ziliu-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </div>
            <div class="ziliu-brand-text">
              <span class="ziliu-title">字流助手</span>
              <span class="ziliu-subtitle">AI驱动的内容发布工具</span>
            </div>
          </div>
          <button id="ziliu-close-btn" class="ziliu-close-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div id="ziliu-panel-content">
          <div id="ziliu-login-check" class="ziliu-state-card" style="display: none;">
            <div class="ziliu-state-content">
              <div class="ziliu-loading-indicator">
                <div class="ziliu-pulse"></div>
              </div>
              <div class="ziliu-state-text">
                <h4>正在检查登录状态</h4>
                <p>请稍候...</p>
              </div>
            </div>
          </div>

          <div id="ziliu-not-logged-in" class="ziliu-state-card" style="display: none;">
            <div class="ziliu-state-content">
              <div class="ziliu-state-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                </svg>
              </div>
              <div class="ziliu-state-text">
                <h4>需要登录字流账户</h4>
                <p>请先登录字流网站，然后回到这里选择文章发布</p>
              </div>
              <div class="ziliu-state-actions">
                <button id="ziliu-open-website" class="ziliu-btn ziliu-btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                  </svg>
                  打开字流网站
                </button>
                <button id="ziliu-refresh-login" class="ziliu-btn ziliu-btn-ghost">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
                  </svg>
                  重新检查
                </button>
              </div>
            </div>
          </div>
          
          <div id="ziliu-article-list" style="display: none;">
            <div class="ziliu-main-container">
              <!-- 搜索和控制区域 -->
              <div class="ziliu-control-section">
                <div class="ziliu-search-container">
                  <div class="ziliu-search-input-wrapper">
                    <svg class="ziliu-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                    <input type="text" id="ziliu-search-input" placeholder="搜索文章标题..." />
                  </div>
                  <button id="ziliu-refresh-articles" class="ziliu-refresh-btn" title="刷新文章列表">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
                    </svg>
                  </button>
                </div>




              </div>

              <!-- 文章列表区域 -->
              <div class="ziliu-articles-wrapper">
                <div id="ziliu-articles-container" class="ziliu-articles-container">
                  <!-- 文章列表将在这里动态生成 -->
                </div>
                <div id="ziliu-pagination" class="ziliu-pagination">
                  <!-- 分页控件将在这里动态生成 -->
                </div>
              </div>
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
    },

    // 添加面板样式
    addPanelStyles() {
      if (document.getElementById('ziliu-panel-styles')) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'ziliu-panel-styles';
      style.textContent = `
        #${ZiliuConstants.PANEL_ID} {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #1a1a1a;
          background: #ffffff;
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
        }

        /* 头部样式 */
        #ziliu-panel-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 24px 20px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        #ziliu-panel-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          pointer-events: none;
        }



        .ziliu-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .ziliu-logo {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          backdrop-filter: blur(10px);
        }

        .ziliu-brand-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ziliu-title {
          font-size: 18px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.5px;
        }

        .ziliu-subtitle {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 400;
        }

        .ziliu-close-btn {
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          position: relative;
          z-index: 1;
        }

        .ziliu-close-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.05);
        }

        /* 内容区域 */
        #ziliu-panel-content {
          height: calc(100vh - 88px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* 状态卡片 */
        .ziliu-state-card {
          margin: 24px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #f0f0f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }

        .ziliu-state-content {
          padding: 32px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .ziliu-loading-indicator {
          position: relative;
        }

        .ziliu-pulse {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          animation: ziliu-pulse 2s ease-in-out infinite;
        }

        @keyframes ziliu-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }

        .ziliu-state-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d63031;
        }

        .ziliu-state-text h4 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #2d3436;
        }

        .ziliu-state-text p {
          margin: 0;
          color: #636e72;
          line-height: 1.5;
        }

        .ziliu-state-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 280px;
        }

        /* 按钮样式 */
        .ziliu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          text-decoration: none;
          position: relative;
          overflow: hidden;
        }

        .ziliu-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .ziliu-btn:hover::before {
          left: 100%;
        }

        .ziliu-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .ziliu-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        .ziliu-btn-ghost {
          background: transparent;
          color: #636e72;
          border: 2px solid #ddd;
        }

        .ziliu-btn-ghost:hover {
          background: #f8f9fa;
          border-color: #667eea;
          color: #667eea;
          transform: translateY(-1px);
        }

        /* 主要内容区域 */
        .ziliu-main-container {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .ziliu-control-section {
          padding: 16px 20px;
          background: #fafbfc;
          border-bottom: 1px solid #e1e8ed;
          flex-shrink: 0;
        }

        /* 搜索区域 */
        .ziliu-search-container {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .ziliu-search-input-wrapper {
          flex: 1;
          position: relative;
        }

        .ziliu-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #8b95a1;
          pointer-events: none;
        }

        #ziliu-search-input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 2px solid #e1e8ed;
          border-radius: 12px;
          font-size: 14px;
          background: white;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        #ziliu-search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        #ziliu-search-input::placeholder {
          color: #8b95a1;
        }

        .ziliu-refresh-btn {
          width: 44px;
          height: 44px;
          background: white;
          border: 2px solid #e1e8ed;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #8b95a1;
          transition: all 0.3s ease;
        }

        .ziliu-refresh-btn:hover {
          border-color: #667eea;
          color: #667eea;
          transform: rotate(180deg);
        }





        /* 文章列表区域 */
        .ziliu-articles-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 8px 20px 20px;
          min-height: 0; /* 允许flex子元素收缩 */
        }

        .ziliu-articles-container {
          flex: 1;
          overflow-y: auto;
          min-height: 0; /* 允许flex子元素收缩 */
        }

        .ziliu-articles-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ziliu-article-item {
          background: white;
          border: 2px solid #f0f0f0;
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: visible;
        }

        .ziliu-article-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transform: scaleY(0);
          transition: transform 0.3s ease;
        }

        .ziliu-article-item:hover {
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
        }

        .ziliu-article-item:hover::before {
          transform: scaleY(1);
        }

        .ziliu-article-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 14px;
          gap: 16px;
          min-height: 32px;
        }

        .ziliu-article-title {
          font-size: 15px;
          font-weight: 600;
          color: #2d3436;
          margin: 0;
          line-height: 1.5;
          flex: 1;
          word-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
          min-height: 22px;
          max-height: none;
          overflow: visible;
        }

        .ziliu-article-actions {
          flex-shrink: 0;
          display: flex;
          gap: 6px;
        }

        .ziliu-fill-btn, .ziliu-copy-markdown-btn, .ziliu-edit-btn {
          height: 32px;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
          font-weight: 500;
        }

        .ziliu-fill-btn {
          background: #f6ffed;
          color: #52c41a;
          border-color: #b7eb8f;
          padding: 0 12px;
          min-width: 48px;
        }

        .ziliu-copy-markdown-btn {
          width: 32px;
          background: #e6f7ff;
          color: #1890ff;
          border-color: #91d5ff;
        }

        .ziliu-edit-btn {
          width: 32px;
          background: #f8f9fa;
          color: #8b95a1;
        }

        .ziliu-fill-btn:hover:not(:disabled) {
          background: #52c41a;
          border-color: #52c41a;
          color: white;
          transform: scale(1.05);
        }

        .ziliu-fill-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .ziliu-copy-markdown-btn:hover:not(:disabled) {
          background: #1890ff;
          border-color: #1890ff;
          color: white;
          transform: scale(1.05);
        }

        .ziliu-copy-markdown-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .ziliu-edit-btn {
          background: #f8f9fa;
          color: #8b95a1;
        }

        .ziliu-edit-btn:hover {
          background: #667eea;
          border-color: #667eea;
          color: white;
          transform: scale(1.05);
        }

        /* 加载动画 */
        .ziliu-loading-spin {
          animation: ziliu-spin 1s linear infinite;
        }

        @keyframes ziliu-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .ziliu-article-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f5f5f5;
        }

        .ziliu-article-info {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 13px;
          color: #8b95a1;
        }

        .ziliu-article-date {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ziliu-article-words {
          display: flex;
          align-items: center;
          gap: 4px;
        }



        /* 空状态 */
        .ziliu-empty-articles {
          text-align: center;
          padding: 60px 20px;
          color: #8b95a1;
        }

        .ziliu-empty-articles svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .ziliu-empty-articles h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .ziliu-empty-articles p {
          margin: 0;
          font-size: 14px;
        }

        /* 滚动条样式 */
        .ziliu-articles-container::-webkit-scrollbar {
          width: 6px;
        }

        .ziliu-articles-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .ziliu-articles-container::-webkit-scrollbar-thumb {
          background: #e1e8ed;
          border-radius: 3px;
        }

        .ziliu-articles-container::-webkit-scrollbar-thumb:hover {
          background: #8b95a1;
        }

        /* 分页样式 */
        .ziliu-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 16px 0;
          border-top: 1px solid #e1e8ed;
          margin-top: 12px;
        }

        .ziliu-page-btn {
          min-width: 32px;
          height: 32px;
          border: 1px solid #e1e8ed;
          background: white;
          color: #8b95a1;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .ziliu-page-btn:hover:not(:disabled) {
          border-color: #667eea;
          color: #667eea;
        }

        .ziliu-page-btn.active {
          background: #667eea;
          border-color: #667eea;
          color: white;
        }

        .ziliu-page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          height: calc(100vh - 88px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
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
          width: 100%;
          margin-bottom: 8px;
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
          width: auto;
          margin-bottom: 0;
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
        
        .ziliu-progress-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `;

      document.head.appendChild(style);
    },

    // 使面板可拖拽
    makeDraggable(panel) {
      const header = panel.querySelector('#ziliu-panel-header');
      let isDragging = false;
      let currentX, currentY, initialX, initialY;
      let xOffset = 0, yOffset = 0;

      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('#ziliu-panel-controls')) return;
        
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          e.preventDefault();
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
          xOffset = currentX;
          yOffset = currentY;
          panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
      });

      document.addEventListener('mouseup', () => {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
      });
    },

    // 显示/隐藏视图
    showView(viewId) {
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
        if (element) {
          element.style.display = id === viewId ? 'block' : 'none';
        }
      });
    },

    // 显示错误消息
    showError(message) {
      const errorElement = document.getElementById('ziliu-error');
      const errorMessage = document.getElementById('ziliu-error-message');
      if (errorElement && errorMessage) {
        errorMessage.textContent = message;
        this.showView('ziliu-error');
        setTimeout(() => {
          errorElement.style.display = 'none';
        }, 5000);
      }
    },

    // 显示成功消息
    showSuccess() {
      this.showView('ziliu-fill-success');
      setTimeout(() => {
        document.getElementById('ziliu-fill-success').style.display = 'none';
        this.showView('ziliu-article-list');
      }, 3000);
    },

    // 显示进度
    showProgress(title, message) {
      const progressTitle = document.getElementById('ziliu-progress-title');
      const progressMessage = document.getElementById('ziliu-progress-message');
      if (progressTitle && progressMessage) {
        progressTitle.textContent = title;
        progressMessage.textContent = message;
        this.showView('ziliu-fill-progress');
      }
    }
  };

  console.log('✅ 字流UI模块已加载');
})();
