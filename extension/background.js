// 字流助手 - 后台脚本

// 安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('字流助手已安装');
});

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
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
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('mp.weixin.qq.com')) {
    // 可以在这里做一些初始化工作
    console.log('检测到公众号页面:', tab.url);
  }
});
