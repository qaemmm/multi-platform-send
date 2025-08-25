// 字流助手 - 工具函数模块
(function() {
  'use strict';

  // 全局常量
  window.ZiliuConstants = {
    API_BASE_URL: 'http://localhost:3000',
    PANEL_ID: 'ziliu-assistant-panel',
    VERSION: '3.0',
    SELECTORS: {
      TITLE_INPUT: '#js_title',
      AUTHOR_INPUT: '#js_author',
      CONTENT_EDITOR: '#js_editor_insertimg',
      SUMMARY_INPUT: '#js_digest'
    }
  };

  // 工具函数
  window.ZiliuUtils = {
    // 延迟执行
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // 安全的元素查找
    findElement: (selector, timeout = 5000) => {
      return new Promise((resolve) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    },

    // 模拟用户输入（静默模式，不会导致页面跳变）
    simulateInput: (element, value) => {
      if (!element) return false;

      try {
        // 静默设置值，不触发focus
        element.value = value;
        if (element.textContent !== undefined) {
          element.textContent = value;
        }

        // 触发必要的事件
        ['input', 'change'].forEach(eventType => {
          const event = new Event(eventType, { bubbles: true });
          element.dispatchEvent(event);
        });

        return true;
      } catch (error) {
        console.warn('输入模拟失败:', error);
        return false;
      }
    },

    // 设置富文本编辑器内容（静默模式，支持ProseMirror）
    setRichTextContent: (element, htmlContent) => {
      if (!element) return false;

      try {
        // 检查是否是ProseMirror编辑器
        if (element.classList.contains('ProseMirror')) {
          // 对于ProseMirror编辑器，需要特殊处理
          // 先清空现有内容
          element.innerHTML = '';

          // 创建临时容器解析HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;

          // 将解析后的内容逐个添加到编辑器
          Array.from(tempDiv.childNodes).forEach(node => {
            element.appendChild(node.cloneNode(true));
          });
        } else {
          // 传统富文本编辑器
          element.innerHTML = htmlContent;
        }

        // 触发必要的事件
        ['input', 'change', 'keyup'].forEach(eventType => {
          const event = new Event(eventType, { bubbles: true });
          element.dispatchEvent(event);
        });

        // 对于ProseMirror，还需要触发特殊事件
        if (element.classList.contains('ProseMirror')) {
          // 触发ProseMirror的更新事件
          const proseMirrorEvent = new Event('prosemirror-update', { bubbles: true });
          element.dispatchEvent(proseMirrorEvent);
        }

        return true;
      } catch (error) {
        console.error('设置富文本内容失败:', error);
        return false;
      }
    },

    // 处理HTML内容，清理不必要的标签和样式
    cleanHtmlContent: (html) => {
      if (!html) return '';

      // 处理块级代码块
      let processedHtml = html.replace(
        /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
        (match, codeContent) => {
          const cleanCode = codeContent
            .replace(/^\s+|\s+$/g, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
          
          return `<section style="margin: 16px 0; padding: 16px; background: #f6f8fa; border-radius: 6px; border-left: 4px solid #0969da; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 14px; line-height: 1.45; overflow-x: auto;"><pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${cleanCode}</pre></section>`;
        }
      );

      // 处理行内代码
      processedHtml = processedHtml.replace(
        /<code[^>]*>(.*?)<\/code>/g,
        '<code style="background: #f6f8fa; padding: 2px 4px; border-radius: 3px; font-family: \'SFMono-Regular\', Consolas, \'Liberation Mono\', Menlo, monospace; font-size: 0.9em;">$1</code>'
      );

      // 处理引用块
      processedHtml = processedHtml.replace(
        /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g,
        '<section style="margin: 16px 0; padding: 16px; background: #f6f8fa; border-left: 4px solid #d1d9e0; color: #656d76;">$1</section>'
      );

      return processedHtml;
    },

    // 显示通知
    showNotification: (message, type = 'info', duration = 3000) => {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        z-index: 10001;
        transition: all 0.3s ease;
        ${type === 'success' ? 'background: #28a745;' : ''}
        ${type === 'error' ? 'background: #dc3545;' : ''}
        ${type === 'info' ? 'background: #007bff;' : ''}
      `;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, duration);
    },

    // 格式化日期
    formatDate: (date) => {
      return new Date(date).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },

    // 防抖函数
    debounce: (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // 检查是否在微信公众号编辑器页面
    isWeChatEditorPage: () => {
      return window.location.href.includes('mp.weixin.qq.com') && 
             (window.location.href.includes('appmsg_edit') || 
              window.location.href.includes('editor'));
    },

    // 生成唯一ID
    generateId: () => {
      return 'ziliu_' + Math.random().toString(36).substr(2, 9);
    },

    // 处理特殊语法（如 {{featured-articles:10}}）
    processSpecialSyntax: async (content) => {
      // 处理 {{featured-articles:数量}} 语法
      const featuredArticlesRegex = /\{\{featured-articles:(\d+)\}\}/g;

      let processedContent = content;
      let match;

      while ((match = featuredArticlesRegex.exec(content)) !== null) {
        const count = parseInt(match[1]) || 5;
        const placeholder = match[0];

        try {
          // 获取历史文章
          const articles = await ZiliuUtils.fetchWeChatArticles(count);

          // 生成文章链接列表（使用p标签但不添加换行）
          const articleLinks = articles.map(article => {
            return `<p><a href="${article.url}" target="_blank">${article.title}</a></p>`;
          }).join('');

          // 替换占位符
          processedContent = processedContent.replace(placeholder, articleLinks);

          console.log(`✅ 已替换 ${placeholder} 为 ${articles.length} 篇历史文章`);
        } catch (error) {
          console.error('获取历史文章失败:', error);
          // 如果失败，保留原始占位符
          processedContent = processedContent.replace(placeholder, `<!-- 获取历史文章失败: ${error.message} -->`);
        }
      }

      return processedContent;
    },

    // 获取微信公众号历史文章
    fetchWeChatArticles: async (count = 5) => {
      try {
        // 获取token
        const token = ZiliuUtils.getWeChatToken();
        if (!token) {
          throw new Error('未找到微信token');
        }

        // 构建请求URL
        const url = `https://mp.weixin.qq.com/cgi-bin/appmsgpublish?sub=list&search_field=null&begin=0&count=${count}&query=&fakeid=&type=101_1&free_publish_type=1&sub_action=list_ex&fingerprint=${ZiliuUtils.getFingerprint()}&token=${token}&lang=zh_CN&f=json&ajax=1`;

        console.log('🔍 API请求URL:', url);

        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        console.log('📡 API响应状态:', response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📄 API响应数据:', data);

        if (data.base_resp && data.base_resp.ret !== 0) {
          throw new Error(`API错误: ${data.base_resp.err_msg || '未知错误'}`);
        }

        // 解析文章列表
        const articles = [];

        if (data.publish_page) {
          console.log('📄 publish_page 类型:', Array.isArray(data.publish_page) ? '数组' : typeof data.publish_page);

          let publishPageData = data.publish_page;

          // 如果 publish_page 是字符串，先解析成对象
          if (typeof data.publish_page === 'string') {
            try {
              publishPageData = JSON.parse(data.publish_page);
              console.log('✅ publish_page 字符串解析成功');
            } catch (parseError) {
              console.error('❌ publish_page 字符串解析失败:', parseError);
              throw new Error('无法解析publish_page数据');
            }
          }

          let publishList = null;

          // 如果解析后是对象，查找 publish_list
          if (publishPageData && typeof publishPageData === 'object' && !Array.isArray(publishPageData)) {
            if (publishPageData.publish_list && Array.isArray(publishPageData.publish_list)) {
              publishList = publishPageData.publish_list;
              console.log('✅ 找到 publish_list，包含', publishList.length, '项');
            } else {
              console.log('📋 publishPageData 结构:', Object.keys(publishPageData));
            }
          }
          // 如果是数组，直接使用
          else if (Array.isArray(publishPageData)) {
            publishList = publishPageData;
            console.log('✅ publish_page 是数组，包含', publishList.length, '项');
          }

          if (publishList && publishList.length > 0) {
            publishList.forEach((item, index) => {
              console.log(`📖 处理第${index + 1}项:`, Object.keys(item || {}));

              if (!item) return;

              // 尝试不同的文章数据结构
              let articleList = null;

              // 如果有 publish_info，先解析它（可能是JSON字符串）
              if (item.publish_info) {
                let publishInfo = item.publish_info;

                // 如果 publish_info 是字符串，解析成对象
                if (typeof item.publish_info === 'string') {
                  try {
                    publishInfo = JSON.parse(item.publish_info);
                    console.log('✅ publish_info 字符串解析成功');
                  } catch (parseError) {
                    console.error('❌ publish_info 字符串解析失败:', parseError);
                    publishInfo = null;
                  }
                }

                // 从解析后的 publish_info 中获取文章列表
                if (publishInfo && publishInfo.appmsgex && Array.isArray(publishInfo.appmsgex)) {
                  articleList = publishInfo.appmsgex;
                  console.log('📚 从 publish_info.appmsgex 找到文章组:', articleList.length, '篇');
                }
              }
              // 其他可能的数据结构
              else if (item.appmsgex) {
                articleList = item.appmsgex;
                console.log('📚 从 appmsgex 找到文章组:', articleList.length, '篇');
              } else if (item.articles) {
                articleList = item.articles;
                console.log('📚 从 articles 找到文章组:', articleList.length, '篇');
              } else if (Array.isArray(item)) {
                articleList = item;
                console.log('📚 item 本身是文章数组:', articleList.length, '篇');
              } else if (item.title) {
                // 如果 item 本身就是一篇文章
                articleList = [item];
                console.log('📚 item 本身是一篇文章');
              }

              if (articleList && Array.isArray(articleList)) {
                articleList.forEach(article => {
                  if (article && article.title) {
                    articles.push({
                      title: article.title || '无标题',
                      url: article.link || article.url || '#',
                      digest: article.digest || article.summary || '',
                      create_time: article.create_time || article.update_time || 0
                    });
                  }
                });
              }
            });
          } else {
            console.log('⚠️ 未找到有效的发布列表数据');
            if (typeof data.publish_page === 'object' && !Array.isArray(data.publish_page)) {
              console.log('📋 可用的 publish_page 字段:', Object.keys(data.publish_page));
            }
          }
        } else {
          console.log('❌ 未找到 publish_page 数据');
        }

        console.log(`✅ 获取到 ${articles.length} 篇历史文章`);
        return articles.slice(0, count);
      } catch (error) {
        console.error('❌ 获取微信历史文章失败:', error);
        throw error;
      }
    },

    // 获取微信token
    getWeChatToken: () => {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('token');
    },

    // 获取fingerprint
    getFingerprint: () => {
      // 尝试从页面中获取fingerprint
      const scripts = document.querySelectorAll('script');
      for (let script of scripts) {
        const content = script.textContent || script.innerText;
        const match = content.match(/fingerprint['"]\s*:\s*['"]([^'"]+)['"]/);
        if (match) {
          return match[1];
        }
      }

      // 如果找不到，生成一个简单的fingerprint
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
  };

  console.log('✅ 字流工具模块已加载');
})();
