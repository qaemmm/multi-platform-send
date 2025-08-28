// 字流助手 - API调用模块
(function() {
  'use strict';

  window.ZiliuAPI = {
    // 通用API请求方法
    async makeRequest(endpoint, options = {}) {
      return new Promise((resolve, reject) => {
        // 检查extension context是否有效
        if (!chrome.runtime?.id) {
          reject(new Error('Extension context invalidated. Please refresh the page.'));
          return;
        }

        chrome.runtime.sendMessage({
          action: 'apiRequest',
          data: {
            endpoint,
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError.message;
            if (error.includes('Extension context invalidated')) {
              reject(new Error('Extension context invalidated. Please refresh the page.'));
            } else {
              reject(new Error(error));
            }
            return;
          }

          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Unknown API error'));
          }
        });
      });
    },

    // 检查登录状态
    async checkLoginStatus() {
      try {
        const data = await this.makeRequest('/api/articles?limit=1');
        console.log('登录状态检查结果:', data);
        return data.success;
      } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
          console.warn('⚠️ 插件上下文已失效，请刷新页面');
          ZiliuUtils.showNotification('插件需要刷新页面才能正常工作', 'warning');
          return false;
        }
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          console.log('用户未登录 (401)');
          return false;
        }
        console.error('检查登录状态失败:', error);
        return false;
      }
    },

    // 获取预设列表
    async fetchPresets() {
      try {
        const data = await this.makeRequest('/api/presets');
        if (data.success) {
          console.log('✅ 预设加载完成:', data.data.length, '个预设');
          return data.data;
        } else {
          throw new Error(data.error || '获取预设列表失败');
        }
      } catch (error) {
        console.error('获取预设列表失败:', error);
        return [];
      }
    },

    // 获取文章列表
    async fetchArticles(limit = 50) {
      try {
        const data = await this.makeRequest(`/api/articles?limit=${limit}`);
        if (data.success) {
          console.log('✅ 文章列表加载完成:', data.data.articles.length, '篇文章');
          return data.data.articles;
        } else {
          throw new Error(data.error || '获取文章列表失败');
        }
      } catch (error) {
        console.error('获取文章列表失败:', error);
        throw error;
      }
    },

    // 获取文章详情
    async fetchArticleDetail(articleId) {
      try {
        const data = await this.makeRequest(`/api/articles/${articleId}?format=inline`);
        if (!data.success) {
          throw new Error(data.error || '获取文章内容失败');
        }
        return data.data;
      } catch (error) {
        console.error('获取文章详情失败:', error);
        throw error;
      }
    },

    // 转换文章格式
    async convertArticleFormat(content, platform = 'wechat', style = 'default') {
      try {
        const data = await this.makeRequest('/api/convert', {
          method: 'POST',
          body: {
            content: content || '',
            platform: platform,
            style: style
          }
        });

        if (data?.success && data.data?.inlineHtml) {
          console.log('✅ 使用 convert API 生成内联样式 HTML');
          return data.data.inlineHtml;
        } else {
          throw new Error('转换结果异常');
        }
      } catch (error) {
        console.warn('⚠️ 调用 convert API 失败，使用原始内容:', error);
        return content;
      }
    }
  };

  console.log('✅ 字流API模块已加载');
})();
