// 字流助手 - 弹窗脚本

document.addEventListener('DOMContentLoaded', function() {
  const pageStatus = document.getElementById('pageStatus');
  const pageStatusText = document.getElementById('pageStatusText');
  const dataStatus = document.getElementById('dataStatus');
  const dataStatusText = document.getElementById('dataStatusText');
  const message = document.getElementById('message');
  const fillBtn = document.getElementById('fillBtn');
  const fillBtnText = document.getElementById('fillBtnText');
  const loading = document.getElementById('loading');
  const openWebBtn = document.getElementById('openWebBtn');

  let currentTab = null;
  let clipboardData = null;

  // 显示消息
  function showMessage(text, type = 'info') {
    message.textContent = text;
    message.className = `message ${type}`;
    message.style.display = 'block';
    
    setTimeout(() => {
      message.style.display = 'none';
    }, 3000);
  }

  // 设置状态
  function setStatus(element, textElement, status, text) {
    element.className = `status-icon ${status}`;
    textElement.textContent = text;
  }

  // 设置按钮加载状态
  function setButtonLoading(isLoading) {
    if (isLoading) {
      loading.style.display = 'block';
      fillBtnText.textContent = '填充中...';
      fillBtn.disabled = true;
    } else {
      loading.style.display = 'none';
      fillBtnText.textContent = '一键填充内容';
      fillBtn.disabled = false;
    }
  }

  // 检查当前页面
  function checkCurrentPage() {
    chrome.runtime.sendMessage({ action: 'getActiveTab' }, (response) => {
      if (response && response.tab) {
        currentTab = response.tab;
        
        if (currentTab.url.includes('mp.weixin.qq.com')) {
          setStatus(pageStatus, pageStatusText, 'success', '已检测到公众号页面');
          checkClipboardData();
        } else {
          setStatus(pageStatus, pageStatusText, 'error', '请在公众号编辑页面使用');
          setStatus(dataStatus, dataStatusText, 'warning', '请先打开公众号页面');
        }
      }
    });
  }

  // 检查剪贴板数据
  async function checkClipboardData() {
    try {
      // 尝试从localStorage获取数据（模拟从字流网站复制的数据）
      const data = localStorage.getItem('ziliu_clipboard_data');
      
      if (data) {
        clipboardData = JSON.parse(data);
        setStatus(dataStatus, dataStatusText, 'success', '已检测到字流数据');
        fillBtn.disabled = false;
      } else {
        // 尝试读取剪贴板
        try {
          const text = await navigator.clipboard.readText();
          if (text && text.includes('<!-- ZILIU_DATA -->')) {
            // 解析字流格式的数据
            const match = text.match(/<!-- ZILIU_DATA -->(.*?)<!-- \/ZILIU_DATA -->/s);
            if (match) {
              clipboardData = JSON.parse(match[1]);
              setStatus(dataStatus, dataStatusText, 'success', '已检测到字流数据');
              fillBtn.disabled = false;
            } else {
              throw new Error('数据格式错误');
            }
          } else {
            throw new Error('未找到字流数据');
          }
        } catch (clipboardError) {
          setStatus(dataStatus, dataStatusText, 'warning', '请先在字流网站复制内容');
          // 提供示例数据用于测试
          clipboardData = {
            title: '测试文章标题',
            content: `
              <h1>这是一个测试标题</h1>
              <p>这是一个测试段落，用于验证字流助手的功能。</p>
              <h2>二级标题</h2>
              <ul>
                <li>列表项1</li>
                <li>列表项2</li>
              </ul>
              <blockquote>这是一个引用块</blockquote>
            `
          };
          fillBtn.disabled = false;
          setStatus(dataStatus, dataStatusText, 'success', '使用测试数据');
        }
      }
    } catch (error) {
      console.error('检查数据失败:', error);
      setStatus(dataStatus, dataStatusText, 'error', '数据检查失败');
    }
  }

  // 填充内容
  function fillContent() {
    if (!currentTab || !clipboardData) {
      showMessage('缺少必要数据，请重试', 'error');
      return;
    }

    if (!currentTab.url.includes('mp.weixin.qq.com')) {
      showMessage('请在公众号编辑页面使用此功能', 'error');
      return;
    }

    setButtonLoading(true);

    chrome.runtime.sendMessage({
      action: 'fillContentToTab',
      data: clipboardData
    }, (response) => {
      setButtonLoading(false);
      
      if (response && response.success) {
        showMessage('内容填充成功！', 'success');
      } else {
        const errorMsg = response ? response.error : '填充失败，请重试';
        showMessage(errorMsg, 'error');
      }
    });
  }

  // 打开字流网站
  function openWebsite() {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  }

  // 事件监听
  fillBtn.addEventListener('click', fillContent);
  openWebBtn.addEventListener('click', openWebsite);

  // 初始化
  checkCurrentPage();

  // 定期检查页面状态
  setInterval(checkCurrentPage, 2000);
});
