// 字流助手 - 后台脚本

// 安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('字流助手已安装');

  // 初始化存储
  chrome.storage.local.set({
    'ziliu_settings': {
      version: '1.1.0',
      autoFill: true,
      notifications: true
    }
  });
});

// 处理来自网站和popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);

  if (message.action === 'getActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true;
  }

  // 处理来自字流网站的数据存储请求
  if (message.action === 'storeContent') {
    chrome.storage.local.set({
      'ziliu_content': {
        ...message.data,
        timestamp: Date.now(),
        source: 'website'
      }
    }, () => {
      console.log('内容已存储到扩展存储');
      sendResponse({ success: true });

      // 通知所有公众号页面有新内容
      notifyWechatTabs();
    });
    return true;
  }

  // 获取存储的内容
  if (message.action === 'getStoredContent') {
    chrome.storage.local.get(['ziliu_content'], (result) => {
      sendResponse({
        success: true,
        data: result.ziliu_content || null
      });
    });
    return true;
  }

  if (message.action === 'fillContentToTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];

      // 检查是否在公众号页面
      if (!activeTab.url.includes('mp.weixin.qq.com')) {
        sendResponse({
          success: false,
          error: '请在公众号编辑页面使用此功能'
        });
        return;
      }

      // 发送消息到content script
      chrome.tabs.sendMessage(activeTab.id, {
        action: 'fillContent',
        data: message.data
      }, (response) => {
        sendResponse(response || { success: false, error: '无法连接到页面' });
      });
    });
    return true;
  }

  // 处理一键发布请求
  if (message.action === 'publishToWechat') {
    handleOneClickPublish(message.data, sendResponse);
    return true;
  }

  // 处理API请求（解决跨域cookie问题）
  if (message.action === 'apiRequest') {
    handleApiRequest(message.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// 处理API请求（解决跨域cookie问题）
async function handleApiRequest(requestData) {
  // 从存储中获取API基础URL，默认为localhost
  const result = await chrome.storage.sync.get(['apiBaseUrl']);
  const API_BASE_URL = result.apiBaseUrl || 'http://localhost:3000';
  const { method = 'GET', endpoint, body, headers = {} } = requestData;

  const url = `${API_BASE_URL}${endpoint}`;
  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    credentials: 'include' // 重要：包含cookie
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  console.log('发起API请求:', url, fetchOptions);

  try {
    const response = await fetch(url, fetchOptions);

    // 处理非JSON响应
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
}

// 通知所有公众号页面有新内容
function notifyWechatTabs() {
  chrome.tabs.query({ url: '*://mp.weixin.qq.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'contentUpdated'
      }).catch(() => {
        // 忽略无法发送消息的错误（页面可能还未加载完成）
      });
    });
  });
}

// 处理一键发布
async function handleOneClickPublish(data, sendResponse) {
  try {
    // 存储内容
    await chrome.storage.local.set({
      'ziliu_content': {
        ...data,
        timestamp: Date.now(),
        source: 'one_click_publish'
      }
    });

    // 查找现有的公众号标签页
    const wechatTabs = await chrome.tabs.query({ url: '*://mp.weixin.qq.com/*' });

    if (wechatTabs.length > 0) {
      // 如果有公众号页面，激活第一个并填充内容
      const targetTab = wechatTabs[0];
      await chrome.tabs.update(targetTab.id, { active: true });

      // 等待一下确保页面激活
      setTimeout(() => {
        chrome.tabs.sendMessage(targetTab.id, {
          action: 'fillContent',
          data: data
        }, (response) => {
          sendResponse(response || { success: false, error: '填充失败' });
        });
      }, 500);
    } else {
      // 如果没有公众号页面，打开新的
      const newTab = await chrome.tabs.create({
        url: 'https://mp.weixin.qq.com/',
        active: true
      });

      // 等待页面加载完成后再填充
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          setTimeout(() => {
            chrome.tabs.sendMessage(newTab.id, {
              action: 'fillContent',
              data: data
            }, (response) => {
              sendResponse(response || { success: false, error: '填充失败' });
            });
          }, 2000); // 给页面更多时间加载
        }
      });
    }
  } catch (error) {
    console.error('一键发布失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('mp.weixin.qq.com')) {
    console.log('检测到公众号页面:', tab.url);

    // 检查是否有待填充的内容
    chrome.storage.local.get(['ziliu_content'], (result) => {
      if (result.ziliu_content && result.ziliu_content.source === 'one_click_publish') {
        // 如果是一键发布的内容，自动填充
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            action: 'autoFillContent',
            data: result.ziliu_content
          });
        }, 1000);
      }
    });
  }
});
