/**
 * CSDN 平台插件
 * 支持 CodeMirror/textarea 编辑器，填充标题与正文
 * 新增：集成微信图片处理逻辑，支持外链图片转换
 */
class CsdnPlatformPlugin extends BasePlatformPlugin {
  constructor(config) {
    super(config);

    // 图片上传状态管理（复制微信的逻辑）
    this.uploadState = {
      activeUploads: 0,
      uploadQueue: [],
      lastRequestTime: 0,
      totalUploads: 0,
      successUploads: 0,
      failedUploads: 0,
      retryAttempts: new Map(),
      uploadHistory: new Map()
    };
  }

  static get metadata() {
    return {
      version: '1.2.0',
      description: 'CSDN 平台专用插件，支持 Markdown 编辑器填充和七牛云图片上传'
    };
  }

  // 平台特有元素查找
  _findElements() {
    console.log('🔍 开始查找CSDN编辑器元素...');
    console.log('🌍 当前页面URL:', window.location.href);
    console.log('🔧 CSDN插件配置:', {
      urlPatterns: this.urlPatterns,
      enabled: this.config.enabled
    });

    const elements = {
      isEditor: false,
      platform: this.id,
      elements: {}
    };

    // 标题
    console.log('📝 查找标题元素...');
    elements.elements.title = this.findElementFromSelectors([
      'input[placeholder*="标题"]',
      'input[placeholder*="文章标题"]',
      '#articleTitle'
    ]);

    // 内容编辑器（优先 CodeMirror）
    console.log('📝 查找内容编辑器...');
    elements.elements.content = this.findElementFromSelectors([
      '.CodeMirror',
      '.CodeMirror-code',
      '.editor-content textarea',
      'textarea',
      '[contenteditable="true"]'
    ]);

    elements.isEditor = !!(elements.elements.title || elements.elements.content);

    console.log('🔍 CSDN 编辑器检测结果:', {
      title: !!elements.elements.title,
      content: !!elements.elements.content,
      titleInfo: elements.elements.title ? {
        tagName: elements.elements.title.tagName,
        className: elements.elements.title.className,
        id: elements.elements.title.id,
        placeholder: elements.elements.title.placeholder
      } : null,
      contentInfo: elements.elements.content ? {
        tagName: elements.elements.content.tagName,
        className: elements.elements.content.className,
        id: elements.elements.content.id,
        isCodeMirror: elements.elements.content.classList?.contains('CodeMirror'),
        contentEditable: elements.elements.content.contentEditable
      } : null,
      url: window.location.href
    });

    return elements;
  }

  getEditorType(contentElement) {
    if (!contentElement) return 'unknown';
    if (contentElement.classList?.contains('CodeMirror')) return 'CodeMirror';
    if (contentElement.tagName === 'TEXTAREA') return 'textarea';
    if (contentElement.isContentEditable || contentElement.contentEditable === 'true') return 'contentEditable';
    return 'unknown';
  }

  async fillContentEditor(contentElement, content, data) {
    console.log('🎯 CSDN fillContentEditor 被调用!');
    console.log('📋 传入参数:', {
      contentElement: contentElement ? {
        tagName: contentElement.tagName,
        className: contentElement.className,
        id: contentElement.id
      } : null,
      contentLength: content?.length,
      hasData: !!data
    });

    const editorType = this.getEditorType(contentElement);
    console.log('🔍 检测到编辑器类型:', editorType);

    try {
      switch (editorType) {
        case 'CodeMirror':
          console.log('🔄 调用 CodeMirror 填充逻辑');
          return await this.fillCodeMirrorEditor(contentElement, content);
        case 'textarea':
          console.log('🔄 调用 textarea 填充逻辑');
          return await this.fillTextareaEditor(contentElement, content);
        default:
          console.log('🔄 调用默认填充逻辑');
          return await super.fillContentEditor(contentElement, content, data);
      }
    } catch (error) {
      console.error(`CSDN 内容填充失败 [${editorType}]:`, error);
      throw error;
    }
  }

  async fillCodeMirrorEditor(element, content) {
    console.log('📝 填充 CSDN CodeMirror 编辑器');
    console.log('🔍 CodeMirror元素信息:', {
      tagName: element.tagName,
      className: element.className,
      hasCodeMirrorClass: element.classList?.contains('CodeMirror'),
      innerHTMLLength: element.innerHTML?.length || 0
    });

    try {
      // CSDN特殊处理：将HTML图片转换为Markdown语法
      console.log('🖼️ 开始为CSDN处理图片格式...');
      let processedContent = await this.convertHtmlImagesToMarkdown(content);

      console.log('🔍 处理后的内容:', {
        originalLength: content?.length,
        processedLength: processedContent?.length,
        hasImages: processedContent?.includes('!['),
        preview: processedContent?.substring(0, 200) + '...'
      });

      // 尝试多种方式找到CodeMirror实例
      let cmInstance = element.CodeMirror || (element.closest('.CodeMirror')?.CodeMirror);

      if (cmInstance) {
        console.log('✅ 找到CodeMirror实例，直接设置值');
        cmInstance.setValue(processedContent);
        cmInstance.focus();
      } else {
        console.log('🔍 未找到CodeMirror实例，尝试查找textarea...');

        // 查找所有可能的textarea
        const textareas = [
          element.querySelector?.('textarea'),
          document.querySelector('.CodeMirror textarea'),
          document.querySelector('textarea'),
          element.closest('textarea')
        ].filter(Boolean);

        console.log('📋 找到的textarea数量:', textareas.length);

        if (textareas.length > 0) {
          const textarea = textareas[0];
          console.log('✅ 使用textarea填充内容');
          await this.setInputValue(textarea, processedContent);
        } else {
          console.warn('⚠️ 未找到任何textarea，尝试直接设置HTML');
          // 最后尝试直接设置HTML
          if (element.contentEditable === 'true') {
            element.innerHTML = processedContent;
            element.focus();
          } else {
            throw new Error('未找到可用的编辑器元素');
          }
        }
      }

      await this.delay(400);
      console.log('✅ CSDN CodeMirror 填充完成');
      return { success: true, value: processedContent, type: 'CodeMirror' };
    } catch (error) {
      console.error('❌ CSDN CodeMirror 填充失败:', error);
      throw error;
    }
  }

  async fillTextareaEditor(element, content) {
    console.log('📝 填充 CSDN textarea 编辑器');
    await this.setInputValue(element, content);
    await this.delay(300);
    return { success: true, value: content, type: 'textarea' };
  }

  async postFillProcess(elements, data, results) {
    // 将焦点放到内容区域，提升体验
    if (elements.content) {
      try {
        elements.content.focus();
      } catch (e) {}
    }
  }

  // ========== CSDN 特殊图片处理 ==========

  /**
   * CSDN专用图片处理：上传图片并转换为Markdown语法
   */
  async convertHtmlImagesToMarkdown(htmlContent) {
    if (!htmlContent) return htmlContent;

    console.log('🔍 开始处理CSDN图片...');

    // 创建临时DOM来解析HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // 查找所有img标签
    const images = tempDiv.querySelectorAll('img');
    if (images.length === 0) {
      console.log('✅ 没有发现图片，直接返回原始内容');
      return htmlContent;
    }

    console.log(`🖼️ 发现 ${images.length} 个图片，开始上传到CDN...`);

    // 处理每个图片
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const src = img.src || img.getAttribute('src');
      const alt = img.alt || img.getAttribute('alt') || `图片${i + 1}`;

      if (src) {
        try {
          console.log(`📤 上传图片 ${i + 1}/${images.length}: ${src.substring(0, 50)}...`);

          // 先尝试七牛云CDN
          const cdnUrl = await this.uploadImageToQiniuCDN(src);

          if (cdnUrl && cdnUrl !== src) {
            console.log(`✅ 图片上传成功: ${cdnUrl}`);

            // 使用微信CDN URL创建Markdown语法
            const markdownImg = `![${alt}](${cdnUrl})`;
            img.replaceWith(document.createTextNode(markdownImg));
          } else {
            console.warn(`⚠️ 图片上传失败，使用原始URL`);
            // 上传失败，使用原始URL
            const markdownImg = `![${alt}](${src})`;
            img.replaceWith(document.createTextNode(markdownImg));
          }
        } catch (error) {
          console.error(`❌ 图片 ${i + 1} 处理失败:`, error);
          // 出错时使用原始URL
          const markdownImg = `![${alt}](${src})`;
          img.replaceWith(document.createTextNode(markdownImg));
        }
      }
    }

    const result = tempDiv.innerHTML;
    console.log('✅ CSDN图片处理完成，结果长度:', result.length);

    return result;
  }

  // ========== 图片处理功能（从微信插件复制）==========

  /**
   * 图片上传风控配置
   */
  static get UPLOAD_CONFIG() {
    return {
      // 并发控制
      MAX_CONCURRENT_UPLOADS: 3,

      // 重试配置
      MAX_RETRY_ATTEMPTS: 3,
      BASE_DELAY: 1000, // 1秒基础延迟
      MAX_DELAY: 10000, // 最大延迟10秒

      // 请求频率限制
      MIN_REQUEST_INTERVAL: 500, // 最小请求间隔500ms

      // 上传队列配置
      QUEUE_TIMEOUT: 120000, // 队列超时2分钟

      // 错误码配置
      RETRY_ERROR_CODES: [-1, 400001, 400002, 429, 503],
      FATAL_ERROR_CODES: [401, 403, 404]
    };
  }

  /**
   * 预处理HTML中的外链图片（微信逻辑的简化版）
   */
  async preProcessImages(htmlContent) {
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

    try {
      // 简化版本：直接尝试转换为微信CDN
      const conversionPromises = images.map(async (img, index) => {
        const originalSrc = img.src || img.getAttribute('src');
        console.log(`📤 转换图片 ${index + 1}/${images.length}: ${originalSrc}`);

        try {
          // 尝试上传到微信CDN
          const cdnUrl = await this.uploadImageWithQueue(originalSrc);
          if (cdnUrl) {
            img.src = cdnUrl;
            img.setAttribute('src', cdnUrl);
            console.log(`✅ 图片 ${index + 1} 转换成功: ${cdnUrl}`);
            return { success: true, index, originalSrc, newSrc: cdnUrl };
          } else {
            console.warn(`⚠️ 图片 ${index + 1} 转换失败，保留原链接`);
            return { success: false, index, originalSrc, error: '上传返回空结果' };
          }
        } catch (error) {
          console.error(`❌ 图片 ${index + 1} 转换出错:`, error);
          return { success: false, index, originalSrc, error: error.message };
        }
      });

      // 等待所有转换完成
      const results = await Promise.all(conversionPromises);
      const successResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      console.log(`📊 图片转换完成: 成功 ${successResults.length}/${images.length}`);

      return tempDiv.innerHTML;

    } catch (error) {
      console.error('❌ 图片预处理过程出错:', error);
      // 如果处理失败，返回原始内容
      return htmlContent;
    }
  }

  /**
   * 智能图片上传队列管理
   */
  async uploadImageWithQueue(imageUrl) {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    return new Promise((resolve, reject) => {
      // 检查是否已经上传过相同图片
      if (this.uploadState.uploadHistory.has(imageUrl)) {
        console.log('🔄 复用已上传图片:', imageUrl);
        const cachedUrl = this.uploadState.uploadHistory.get(imageUrl);
        resolve(cachedUrl);
        return;
      }

      // 添加到上传队列
      const uploadTask = {
        id: uploadId,
        imageUrl,
        resolve,
        reject,
        addedAt: Date.now(),
        retryCount: 0
      };

      this.uploadState.uploadQueue.push(uploadTask);
      this.uploadState.totalUploads++;

      console.log(`📋 图片加入上传队列: ${uploadId}, 队列长度: ${this.uploadState.uploadQueue.length}`);

      // 启动队列处理
      this.processUploadQueue();
    });
  }

  /**
   * 处理上传队列
   */
  async processUploadQueue() {
    // 检查是否可以启动新的上传
    if (this.uploadState.activeUploads >= CsdnPlatformPlugin.UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS ||
        this.uploadState.uploadQueue.length === 0) {
      return;
    }

    // 获取下一个上传任务
    const uploadTask = this.uploadState.uploadQueue.shift();

    // 检查任务是否超时
    const now = Date.now();
    if (now - uploadTask.addedAt > CsdnPlatformPlugin.UPLOAD_CONFIG.QUEUE_TIMEOUT) {
      console.error(`⏰ 上传任务超时: ${uploadTask.id}`);
      uploadTask.reject(new Error('上传队列超时'));
      this.uploadState.failedUploads++;
      return;
    }

    // 执行上传
    this.uploadState.activeUploads++;

    try {
      console.log(`🚀 开始上传图片: ${uploadTask.id} (活跃: ${this.uploadState.activeUploads})`);

      const result = await this.uploadImageWithRetry(uploadTask);

      if (result) {
        // 缓存成功的上传结果
        this.uploadState.uploadHistory.set(uploadTask.imageUrl, result);
        this.uploadState.successUploads++;
        uploadTask.resolve(result);
        console.log(`✅ 上传成功: ${uploadTask.id}`);
      } else {
        this.uploadState.failedUploads++;
        uploadTask.reject(new Error('上传失败'));
      }
    } catch (error) {
      this.uploadState.failedUploads++;
      uploadTask.reject(error);
    } finally {
      this.uploadState.activeUploads--;

      // 继续处理下一个任务
      setTimeout(() => this.processUploadQueue(), 100);
    }
  }

  /**
   * 带重试的图片上传
   */
  async uploadImageWithRetry(uploadTask) {
    const config = CsdnPlatformPlugin.UPLOAD_CONFIG;

    try {
      // 频率控制
      await this.enforceRequestFrequency();

      // 尝试上传到七牛云CDN
      const result = await this.uploadImageToQiniuCDN(uploadTask.imageUrl);

      if (result) {
        console.log(`✅ 上传成功: ${uploadTask.imageUrl} -> ${result}`);
        return result;
      } else {
        throw new Error('上传返回空结果');
      }

    } catch (error) {
      uploadTask.retryCount++;

      // 检查是否可以重试
      if (uploadTask.retryCount <= config.MAX_RETRY_ATTEMPTS) {
        const delay = Math.min(
          config.BASE_DELAY * Math.pow(2, uploadTask.retryCount - 1),
          config.MAX_DELAY
        );

        console.warn(`⚠️ 上传失败，${delay}ms后重试 (${uploadTask.retryCount}/${config.MAX_RETRY_ATTEMPTS}):`, error.message);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.uploadImageWithRetry(uploadTask);
      } else {
        console.error(`❌ 上传重试次数耗尽: ${uploadTask.imageUrl}`);
        throw error;
      }
    }
  }

  /**
   * 频率控制
   */
  async enforceRequestFrequency() {
    const config = CsdnPlatformPlugin.UPLOAD_CONFIG;
    const now = Date.now();
    const timeSinceLastRequest = now - this.uploadState.lastRequestTime;

    if (timeSinceLastRequest < config.MIN_REQUEST_INTERVAL) {
      const delay = config.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.uploadState.lastRequestTime = Date.now();
  }

  /**
   * 上传图片到七牛云CDN（核心功能）
   */
  async uploadImageToQiniuCDN(imageUrl) {
    try {
      console.log('📤 尝试上传到七牛云CDN:', imageUrl);

      // 调用后端API上传到七牛云
      const response = await fetch(`${this.getZiliuBaseUrl()}/api/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          userEmail: 'csdn-user' // 可以后续改为实际用户邮箱
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.url) {
        console.log('✅ 七牛云CDN上传成功:', data.url);
        return data.url;
      } else {
        throw new Error(data.error || '上传失败');
      }

    } catch (error) {
      console.error('❌ 七牛云CDN上传失败，尝试降级方案:', error);
      return await this.fallbackImageUpload(imageUrl);
    }
  }

  /**
   * 获取字流后端基础URL
   */
  getZiliuBaseUrl() {
    // 在开发环境下使用localhost，优先尝试3001端口（Turbopack常用）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }

    // 可以根据实际部署配置修改
    return 'https://your-domain.com';
  }

  /**
   * 降级图片上传方案
   */
  async fallbackImageUpload(imageUrl) {
    console.log('🔄 使用降级图片上传方案...');

    try {
      // 方案1：直接下载图片并转换为base64（仅用于非常小的图片）
      const response = await fetch(imageUrl, {
        mode: 'cors',
        cache: 'force-cache'
      });

      if (response.ok) {
        const blob = await response.blob();

        // 只对小于500KB的图片使用base64
        if (blob.size < 500 * 1024) {
          const base64Image = await this.imageToBase64(imageUrl);
          if (base64Image) {
            console.log('✅ 图片转换为base64成功（小图片）');
            return base64Image;
          }
        }
      }

      // 方案2：对于其他情况，返回原始URL并警告
      console.warn('⚠️ 图片过大或转换失败，返回原始URL（可能无法在CSDN中正常显示）');
      return imageUrl;

    } catch (error) {
      console.error('❌ 降级上传方案失败:', error);
      return imageUrl; // 最后返回原始URL
    }
  }

  /**
   * 将图片转换为base64
   */
  async imageToBase64(imageUrl) {
    try {
      console.log('🔄 开始转换图片为base64:', imageUrl);

      // 下载图片
      const response = await fetch(imageUrl, {
        mode: 'cors',
        cache: 'force-cache'
      });

      if (!response.ok) {
        throw new Error(`图片下载失败: ${response.status}`);
      }

      const blob = await response.blob();

      // 转换为base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result;
          console.log('✅ 图片base64转换成功，大小:', base64.length);
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('base64转换失败'));
        reader.readAsDataURL(blob);
      });

    } catch (error) {
      console.error('❌ 图片base64转换失败:', error);
      return null;
    }
  }

}

// 配置驱动的自动注册
if (window.ZiliuPlatformRegistry && window.ZiliuPluginConfig) {
  console.log('🔍 CSDN插件: 开始检查注册条件...');
  console.log('📋 ZiliuPlatformRegistry存在:', !!window.ZiliuPlatformRegistry);
  console.log('📋 ZiliuPluginConfig存在:', !!window.ZiliuPluginConfig);

  const cfg = window.ZiliuPluginConfig.platforms.find(p => p.id === 'csdn');
  console.log('🔧 找到CSDN配置:', cfg ? {
    id: cfg.id,
    enabled: cfg.enabled,
    urlPatterns: cfg.urlPatterns
  } : null);

  if (cfg && cfg.enabled) {
    console.log('🌍 当前URL:', window.location.href);
    const shouldRegister = cfg.urlPatterns.some(pattern => {
      try {
        const escaped = pattern.replace(/[.+^${}()|[\]\\?]/g, '\\$&').replace(/\*/g, '.*');
        const regex = new RegExp('^' + escaped + '$', 'i');
        const matches = regex.test(window.location.href);
        console.log(`🔍 模式匹配测试: ${pattern} -> ${matches}`);
        return matches;
      } catch (e) {
        console.error('❌ 模式匹配错误:', e);
        return false;
      }
    });

    console.log('📝 是否应该注册CSDN插件:', shouldRegister);

    if (shouldRegister) {
      console.log('🔧 注册 CSDN 专用插件（配置驱动）');
      const plugin = new CsdnPlatformPlugin(cfg);
      ZiliuPlatformRegistry.register(plugin);
      console.log('✅ CSDN插件注册完成');
    } else {
      console.log('⚠️ 当前URL不匹配CSDN插件模式，跳过注册');
    }
  } else {
    console.log('⚠️ CSDN插件配置未找到或未启用');
  }
} else {
  console.log('❌ ZiliuPlatformRegistry 或 ZiliuPluginConfig 不存在');
}

window.CsdnPlatformPlugin = CsdnPlatformPlugin;