// 字流助手 - 工具函数模块
(function() {
  'use strict';

  // 全局常量
  window.ZiliuConstants = {
    API_BASE_URL: null, // 将在初始化时从存储中获取
    PANEL_ID: 'ziliu-assistant-panel',
    VERSION: '3.0',
    SELECTORS: {
      TITLE_INPUT: '#js_title',
      AUTHOR_INPUT: '#js_author',
      CONTENT_EDITOR: '#js_editor_insertimg',
      SUMMARY_INPUT: '#js_digest'
    }
  };

  // 初始化函数
  window.ZiliuInit = {
    // 初始化API基础URL
    async initApiBaseUrl() {
      try {
        const result = await chrome.storage.sync.get(['apiBaseUrl']);
        window.ZiliuConstants.API_BASE_URL = result.apiBaseUrl || 'http://localhost:3000';
        console.log('字流助手: API基础URL已设置为', window.ZiliuConstants.API_BASE_URL);
      } catch (error) {
        console.error('字流助手: 获取API基础URL失败，使用默认值', error);
        window.ZiliuConstants.API_BASE_URL = 'http://localhost:3000';
      }
    },

    // 设置API基础URL
    async setApiBaseUrl(url) {
      try {
        await chrome.storage.sync.set({ apiBaseUrl: url });
        window.ZiliuConstants.API_BASE_URL = url;
        console.log('字流助手: API基础URL已更新为', url);
      } catch (error) {
        console.error('字流助手: 设置API基础URL失败', error);
      }
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
    setRichTextContent: async (element, htmlContent) => {
      if (!element) return false;

      try {
        // 显示loading提示
        const loadingOverlay = ZiliuUtils.showLoadingOverlay(element);

        try {
          // 先预处理图片，转换外链为微信CDN
          console.log('🖼️ 开始预处理图片...');
          const processedContent = await ZiliuUtils.preProcessImages(htmlContent);

          // 先聚焦编辑器
          element.focus();
          element.innerHTML = processedContent;

          // 触发微信自动保存和字数更新
          ZiliuUtils.triggerWeChatAutoSave(element);

          return true;
        } finally {
          // 隐藏loading提示
          ZiliuUtils.hideLoadingOverlay(loadingOverlay);
        }
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

      // 处理有序列表 - 用div模拟，避免微信ol问题
      processedHtml = processedHtml.replace(
        /<ol[^>]*>([\s\S]*?)<\/ol>/g,
        (_, content) => {
          // 提取所有li内容
          const listItems = [];
          let itemMatch;
          const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/g;

          while ((itemMatch = liRegex.exec(content)) !== null) {
            listItems.push(itemMatch[1]);
          }

          // 生成带编号的div列表
          const numberedItems = listItems.map((item, index) => {
            return `<div style="margin: 8px 0; padding-left: 0; line-height: 1.5; font-size: 16px; display: flex; align-items: baseline;">
              <span style="color: #666; font-weight: bold; margin-right: 12px; min-width: 24px; flex-shrink: 0; text-align: right;">${index + 1}.</span>
              <span style="flex: 1; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.5;">${item}</span>
            </div>`;
          }).join('');

          return `<div style="margin: 16px 0; padding: 0;">${numberedItems}</div>`;
        }
      );

      // 处理无序列表 - 移动端优化
      processedHtml = processedHtml.replace(
        /<ul[^>]*>([\s\S]*?)<\/ul>/g,
        (_, content) => {
          return `<ul style="margin: 16px 0; padding-left: 20px; line-height: 1.8; font-size: 16px;">${content}</ul>`;
        }
      );

      // 处理无序列表项 - 移动端优化
      processedHtml = processedHtml.replace(
        /<li[^>]*>([\s\S]*?)<\/li>/g,
        (_, content) => {
          return `<li style="margin: 8px 0; padding-left: 8px; line-height: 1.8; word-wrap: break-word; overflow-wrap: break-word;">${content}</li>`;
        }
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

    // 显示loading覆盖层
    showLoadingOverlay: (targetElement) => {
      // 创建loading覆盖层
      const overlay = document.createElement('div');
      overlay.id = 'ziliu-loading-overlay';
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        border-radius: 6px;
        backdrop-filter: blur(2px);
      `;

      // 创建loading内容
      const loadingContent = document.createElement('div');
      loadingContent.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border: 1px solid #e1e5e9;
      `;

      // 创建spinner
      const spinner = document.createElement('div');
      spinner.style.cssText = `
        width: 24px;
        height: 24px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #1890ff;
        border-radius: 50%;
        animation: ziliu-spin 1s linear infinite;
      `;

      // 添加CSS动画
      if (!document.getElementById('ziliu-loading-styles')) {
        const style = document.createElement('style');
        style.id = 'ziliu-loading-styles';
        style.textContent = `
          @keyframes ziliu-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }

      // 创建文本
      const text = document.createElement('div');
      text.textContent = '正在处理图片，请稍候...';
      text.style.cssText = `
        color: #666;
        font-size: 14px;
        font-weight: 500;
      `;

      loadingContent.appendChild(spinner);
      loadingContent.appendChild(text);
      overlay.appendChild(loadingContent);

      // 找到合适的父容器
      const container = targetElement.closest('.ProseMirror') ||
                       targetElement.closest('[contenteditable]') ||
                       targetElement.parentElement;

      if (container) {
        // 确保容器有相对定位
        const originalPosition = container.style.position;
        if (!originalPosition || originalPosition === 'static') {
          container.style.position = 'relative';
        }

        container.appendChild(overlay);

        // 保存原始位置信息，用于恢复
        overlay._originalPosition = originalPosition;
      }

      return overlay;
    },

    // 隐藏loading覆盖层
    hideLoadingOverlay: (overlay) => {
      if (overlay && overlay.parentElement) {
        // 恢复原始位置
        if (overlay._originalPosition !== undefined) {
          overlay.parentElement.style.position = overlay._originalPosition;
        }
        overlay.parentElement.removeChild(overlay);
      }
    },

    // 触发微信自动保存和字数更新
    triggerWeChatAutoSave: (element) => {
      try {
        console.log('🔄 触发微信自动保存和字数更新...');

        // 触发各种可能的事件来让微信更新字数和自动保存
        const events = [
          'input',
          'change',
          'keyup',
          'paste',
          'blur',
          'focus'
        ];

        events.forEach(eventType => {
          try {
            const event = new Event(eventType, {
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(event);
          } catch (e) {
            console.warn(`触发${eventType}事件失败:`, e);
          }
        });

        // 特别触发input事件（微信最常用的字数更新触发器）
        try {
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: ' '
          });
          element.dispatchEvent(inputEvent);
        } catch (e) {
          console.warn('触发InputEvent失败:', e);
        }

        // 模拟键盘事件
        try {
          const keyboardEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: ' ',
            code: 'Space'
          });
          element.dispatchEvent(keyboardEvent);
        } catch (e) {
          console.warn('触发KeyboardEvent失败:', e);
        }

        // 延迟触发一次额外的input事件，确保微信检测到变化
        setTimeout(() => {
          try {
            const delayedEvent = new Event('input', {
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(delayedEvent);
            console.log('✅ 延迟触发事件完成');
          } catch (e) {
            console.warn('延迟触发事件失败:', e);
          }
        }, 100);

        console.log('✅ 微信自动保存触发完成');
      } catch (error) {
        console.error('❌ 触发微信自动保存失败:', error);
      }
    },

    // 预处理图片，将外链图片转换为微信CDN
    preProcessImages: async (htmlContent) => {
      if (!htmlContent) return htmlContent;

      console.log('🔍 开始分析HTML中的图片...');

      // 创建临时DOM来解析HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;

      // 查找所有外链图片
      const images = Array.from(tempDiv.querySelectorAll('img')).filter(img => {
        const src = img.src || img.getAttribute('src');
        return src && !src.includes('mmbiz.qpic.cn') && !src.startsWith('data:') && src.startsWith('http');
      });

      if (images.length === 0) {
        console.log('✅ 没有发现需要转换的外链图片');
        return htmlContent;
      }

      console.log(`🖼️ 发现 ${images.length} 个外链图片，开始转换...`);

      // 并行转换所有图片
      const conversionPromises = images.map(async (img, index) => {
        const originalSrc = img.src || img.getAttribute('src');
        console.log(`📤 转换图片 ${index + 1}/${images.length}: ${originalSrc}`);

        try {
          const cdnUrl = await ZiliuUtils.uploadImageToCDN(originalSrc);
          if (cdnUrl) {
            img.src = cdnUrl;
            img.setAttribute('src', cdnUrl);
            console.log(`✅ 图片 ${index + 1} 转换成功: ${cdnUrl}`);
            return true;
          } else {
            console.warn(`⚠️ 图片 ${index + 1} 转换失败，保留原链接`);
            return false;
          }
        } catch (error) {
          console.error(`❌ 图片 ${index + 1} 转换出错:`, error);
          return false;
        }
      });

      // 等待所有转换完成
      const results = await Promise.all(conversionPromises);
      const successCount = results.filter(Boolean).length;

      console.log(`🎉 图片转换完成: ${successCount}/${images.length} 成功`);

      return tempDiv.innerHTML;
    },

    // 上传图片到微信CDN
    uploadImageToCDN: async (imageUrl) => {
      try {
        console.log('📡 调用微信uploadimg2cdn接口:', imageUrl);

        // 获取当前页面的token
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          console.error('❌ 无法获取微信token');
          return null;
        }

        // 构造请求参数（模拟微信真实的调用方式）
        const params = new URLSearchParams();
        params.append('t', 'ajax-editor-upload-img');
        params.append('imgUrl', imageUrl);
        params.append('fingerprint', '51f8b9142b4e2f07f988b65243451047'); // 使用观察到的fingerprint
        params.append('token', token);
        params.append('lang', 'zh_CN');
        params.append('f', 'json');
        params.append('ajax', '1');

        // 使用XMLHttpRequest模拟微信的真实调用
        const response = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `/cgi-bin/uploadimg2cdn?lang=zh_CN&token=${token}&t=${Math.random()}`);
          xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
          xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                const result = JSON.parse(xhr.responseText);
                resolve(result);
              } catch (e) {
                reject(new Error('响应解析失败: ' + xhr.responseText));
              }
            } else {
              reject(new Error(`请求失败: ${xhr.status} ${xhr.statusText}`));
            }
          };

          xhr.onerror = () => reject(new Error('网络错误'));
          xhr.ontimeout = () => reject(new Error('请求超时'));
          xhr.timeout = 30000; // 30秒超时

          xhr.send(params.toString());
        });

        console.log('📥 上传响应:', response);

        if (response && response.errcode === 0 && response.url) {
          console.log('✅ 图片上传成功:', response.url);
          return response.url;
        } else {
          console.error('❌ 上传响应格式异常:', response);
          return null;
        }

      } catch (error) {
        console.error('❌ 上传图片到CDN失败:', error);
        return null;
      }
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
