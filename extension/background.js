// 字流助手 - 后台脚本
console.log('🚀 字流助手 Background Script 启动');

// 字流站点配置 - 动态选择环境
const ZILIU_CONFIG = {
  // 字流站点基础URL - 开发环境使用本地地址
  baseUrl: 'http://localhost:3000',

  // 获取完整的API URL
  getApiUrl(path = '') {
    return path.startsWith('/') ? `${this.baseUrl}${path}` : `${this.baseUrl}/${path}`;
  },

  // 获取编辑器URL
  getEditorUrl(articleId) {
    return `${this.baseUrl}/editor/${articleId}`;
  },

  // 获取登录URL
  getLoginUrl() {
    return `${this.baseUrl}/login`;
  }
};

// 平台基础配置（在Service Worker中使用，不依赖window）
const PLATFORM_CONFIGS = {
  wechat: {
    urlPatterns: ['*://mp.weixin.qq.com/*'],
    editorUrl: 'https://mp.weixin.qq.com/',
    platformName: '微信公众号',
    loadDelay: 2000
  },
  zhihu: {
    urlPatterns: ['*://zhuanlan.zhihu.com/write*', '*://zhuanlan.zhihu.com/p/*/edit*'],
    editorUrl: 'https://zhuanlan.zhihu.com/write',
    platformName: '知乎',
    loadDelay: 1500
  },
  juejin: {
    urlPatterns: ['*://juejin.cn/editor/*', '*://juejin.cn/post/*'],
    editorUrl: 'https://juejin.cn/editor/drafts/new',
    platformName: '掘金',
    loadDelay: 2000
  },
  zsxq: {
    urlPatterns: ['*://wx.zsxq.com/group/*', '*://wx.zsxq.com/article?groupId=*'],
    editorUrl: 'https://wx.zsxq.com/',
    platformName: '知识星球',
    loadDelay: 1000
  }
};

function normalizePlatformId(platform) {
  const map = { '微信': 'wechat', '微信公众号': 'wechat', '知乎': 'zhihu', '掘金': 'juejin', '知识星球': 'zsxq' };
  const key = (platform || 'wechat').toString().toLowerCase();
  return map[platform] || map[key] || key;
}


// 安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('字流助手已安装');

  // 初始化存储
  chrome.storage.local.set({
    'ziliu_settings': {
      version: '1.0.0',
      autoFill: true,
      notifications: true
    }
  });
});

// 处理插件图标点击事件
chrome.action.onClicked.addListener((tab) => {
  console.log('字流助手图标被点击，跳转到官网');

  // 创建新标签页打开字流官网
  chrome.tabs.create({
    url: ZILIU_CONFIG.baseUrl,
    active: true
  });
});

// 处理来自网站和popup的消息
console.log('🎯 注册消息监听器');
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('📨 Background Script 收到消息:', message.action);

  // 统一消息处理器
  const messageHandlers = {
    // 获取活动标签页
    getActiveTab: async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return { tab: tabs[0] };
    },

    // 存储内容
    storeContent: async (data) => {
      await chrome.storage.local.set({
        'ziliu_content': {
          ...data,
          timestamp: Date.now(),
          source: 'website'
        }
      });
      console.log('✅ 内容已存储到扩展存储');
      notifyPlatformTabs();
      return { success: true };
    },

    // 获取存储的内容
    getStoredContent: async () => {
      const result = await chrome.storage.local.get(['ziliu_content']);
      return {
        success: true,
        data: result.ziliu_content || null
      };
    },

    // 填充内容到标签页（通过内容脚本执行，SW 不直接访问 window.*）
    fillContentToTab: async (data) => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      // 基于URL模式判断是否为受支持的平台页面
      const platformConfig = findMatchingPlatform(activeTab?.url || '');
      if (!platformConfig) {
        throw new Error('当前页面不支持内容填充功能');
      }

      // 先 ping 内容脚本，确认可通信
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(activeTab.id, { action: 'ping' }, (_pong) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: '页面未注入字流脚本或不可通信' });
            return;
          }
          // 发送填充请求
          chrome.tabs.sendMessage(activeTab.id, { action: 'fillContent', data }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message || '无法连接到页面' });
            } else {
              resolve(response || { success: false, error: '无法连接到页面' });
            }
          });
        });
      });
    },

    // 一键发布
    oneClickPublish: async (data) => {
      return await handleOneClickPublish(data);
    },

    // API请求代理
    apiRequest: async (requestData) => {
      return await handleApiRequest(requestData);
    },

    // 获取字流配置URL
    getZiliuUrls: async (data) => {
      return {
        success: true,
        data: {
          baseUrl: ZILIU_CONFIG.baseUrl,
          loginUrl: ZILIU_CONFIG.getLoginUrl(),
          editorUrl: data?.articleId ? ZILIU_CONFIG.getEditorUrl(data.articleId) : null
        }
      };
    }
  };

  // 执行消息处理
  const handler = messageHandlers[message.action];
  if (handler) {
    handler(message.data)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error(`❌ 处理消息失败 [${message.action}]:`, error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  }

  console.warn('⚠️ 未知消息类型:', message.action);
  sendResponse({ success: false, error: '未知消息类型' });
});

// 处理API请求（解决跨域cookie问题）
async function handleApiRequest(requestData) {
  console.log('🔧 handleApiRequest 开始处理请求:', requestData);

  try {
    // 优先从存储中获取API基础URL，否则使用配置文件中的默认值
    const result = await chrome.storage.sync.get(['apiBaseUrl']);
    const API_BASE_URL = result.apiBaseUrl || ZILIU_CONFIG.baseUrl;
    console.log('🔗 使用API基础URL:', API_BASE_URL);
    const { method = 'GET', endpoint, body, headers = {} } = requestData;

    // 验证endpoint
    if (!endpoint || !endpoint.startsWith('/')) {
      throw new Error('Invalid API endpoint');
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ZiliuAssistant/3.0',
        ...headers
      },
      credentials: 'include' // 重要：包含cookie
    };

    // 只有非GET请求才添加body
    if (body && method.toUpperCase() !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log(`🌐 API请求 [${method}]:`, url, body ? '(含数据)' : '');
    console.log('📋 请求配置:', JSON.stringify(fetchOptions, null, 2));

    const response = await Promise.race([
      fetch(url, fetchOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('请求超时')), 30000)
      )
    ]);

    // 处理响应
    let data;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const textData = await response.text();
      data = { message: textData };
    }

    // 检查HTTP状态
    if (!response.ok) {
      const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error(`❌ API请求失败 [${response.status}]:`, errorMessage);
      throw new Error(errorMessage);
    }

    console.log(`✅ API请求成功 [${response.status}]:`, endpoint);
    return data;

  } catch (error) {
    // 统一错误处理
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('❌ 网络连接失败，请检查服务器是否运行:', error);
      throw new Error('无法连接到服务器，请检查网络连接和服务器状态');
    }

    console.error('❌ API请求异常:', error);
    throw error;
  }
}

// 通知所有相关平台页面有新内容
function notifyPlatformTabs() {
  // 遍历已知平台URL模式，向匹配的标签页广播更新消息
  Object.values(PLATFORM_CONFIGS).forEach(cfg => {
    (cfg.urlPatterns || []).forEach(pattern => {
      chrome.tabs.query({ url: pattern }, (tabs) => {
        tabs.forEach(t => {
          try {
            chrome.tabs.sendMessage(t.id, { action: 'contentUpdated' }, () => {
              // 忽略错误（页面未加载/未注入内容脚本等）
              void chrome.runtime.lastError;
            });
          } catch (_e) { /* ignore */ }
        });
      });
    });
  });
}

// 处理一键发布 - 简化为通用逻辑
async function handleOneClickPublish(data) {
  try {
    // 存储内容
    await chrome.storage.local.set({
      'ziliu_content': {
        ...data,
        timestamp: Date.now(),
        source: 'one_click_publish'
      }
    });

    console.log('🚀 开始一键发布:', data.title?.substring(0, 30) + '...');

    // 获取平台配置
    const platformConfig = getPlatformConfig(data.platform);
    if (!platformConfig) {
      throw new Error(`不支持的平台: ${data.platform}`);
    }

    return await handlePlatformPublish(data, platformConfig);

  } catch (error) {
    console.error('❌ 一键发布失败:', error);
    throw error;
  }
}

// 获取平台配置（使用平台管理服务）
function getPlatformConfig(platform) {
  const id = normalizePlatformId(platform) || 'wechat';
  const cfg = PLATFORM_CONFIGS[id] || PLATFORM_CONFIGS['wechat'];
  return {
    urlPattern: (cfg.urlPatterns && cfg.urlPatterns[0]) || '*://mp.weixin.qq.com/*',
    newTabUrl: cfg.editorUrl,
    platformName: cfg.platformName,
    loadDelay: cfg.loadDelay || 2000
  };
}

// 通用的平台发布处理
async function handlePlatformPublish(data, config) {
  try {
    const { urlPattern, newTabUrl, platformName, loadDelay = 2000 } = config;

    // 查找现有的编辑页面
    const existingTabs = await chrome.tabs.query({ url: urlPattern });

    if (existingTabs.length > 0) {
      // 激活现有页面
      const targetTab = existingTabs[0];
      await chrome.tabs.update(targetTab.id, { active: true });
      console.log(`✅ 激活现有${platformName}页面`);

      return sendFillMessage(targetTab.id, data, 500);
    } else {
      // 创建新页面
      const newTab = await chrome.tabs.create({
        url: newTabUrl,
        active: true
      });
      console.log(`🆕 创建新的${platformName}页面`);

      return waitForTabAndFill(newTab.id, data, loadDelay);
    }
  } catch (error) {
    console.error(`❌ ${config.platformName}发布失败:`, error);
    throw error;
  }
}

// 发送填充消息
function sendFillMessage(tabId, data, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        action: 'fillContent',
        data: data
      }, (response) => {
        resolve(response || { success: false, error: '填充失败' });
      });
    }, delay);
  });
}

// 等待Tab加载并填充
function waitForTabAndFill(tabId, data, loadDelay) {
  return new Promise((resolve) => {
    const listener = (currentTabId, changeInfo) => {
      if (currentTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            action: 'fillContent',
            data: data
          }, (response) => {
            resolve(response || { success: false, error: '填充失败' });
          });
        }, loadDelay);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // 超时保护
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve({ success: false, error: '页面加载超时' });
    }, 30000);
  });
}


// 监听标签页更新 - 支持自动填充（简化版）
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 检查是否有待填充的内容
    chrome.storage.local.get(['ziliu_content'], (result) => {
      if (result.ziliu_content && result.ziliu_content.source === 'one_click_publish') {
        // 检查是否是支持的平台
        const platformConfig = findMatchingPlatform(tab.url);

        if (platformConfig) {
          console.log(`🎯 检测到${platformConfig.platformName}页面:`, tab.url);
          console.log(`🔄 自动填充内容到${platformConfig.platformName}`);

          // 延迟填充，确保页面完全加载
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, {
              action: 'autoFillContent',
              data: result.ziliu_content
            }, () => {
              // 忽略错误（可能未注入内容脚本）
              void chrome.runtime.lastError;
            });
          }, 1000);
        }
      }
    });
  }
});

// 查找匹配的平台配置（使用平台管理服务）
function findMatchingPlatform(url) {
  for (const cfg of Object.values(PLATFORM_CONFIGS)) {
    for (const pattern of (cfg.urlPatterns || [])) {
      if (urlMatches(url, pattern)) {
        return {
          urlPattern: pattern,
          newTabUrl: cfg.editorUrl,
          platformName: cfg.platformName,
          loadDelay: cfg.loadDelay || 2000
        };
      }
    }
  }
  return null;
}

// URL匹配检查
function urlMatches(url, pattern) {
  try {
    const escapedPattern = pattern
      .replace(/[.+^${}()|[\]\\?]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp('^' + escapedPattern + '$', 'i');
    return regex.test(url);
  } catch (error) {
    console.warn('URL匹配失败:', { pattern, error });
    return false;
  }
}
