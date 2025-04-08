// 背景脚本 - 使用Service Worker (Manifest V3)
// 负责处理扩展的后台任务和消息传递

// 监听扩展安装或更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装时显示欢迎页面
    chrome.tabs.create({
      url: 'welcome.html'
    });
  }
  
  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'analyzeSelectedText',
    title: '使用RepRisk分析所选文本',
    contexts: ['selection']
  });
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 打开侧边栏
  chrome.sidePanel.open({ tabId: tab.id });
});

// 监听来自内容脚本或侧边栏的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理分析请求
  if (message.action === 'analyzeText') {
    // 由于Service Worker的限制，我们不在这里直接调用API
    // 而是将请求转发回sidebar.js处理
    sendResponse({ status: 'received' });
    return true;
  }
  
  // 处理页面内容提取请求
  if (message.action === 'extractContent') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: extractPageContent
      }, (results) => {
        if (results && results[0] && results[0].result) {
          sendResponse({ content: results[0].result });
        } else {
          sendResponse({ error: '无法提取页面内容' });
        }
      });
    });
    
    return true; // 异步响应
  }
  
  // 处理更新选中文本的请求
  if (message.action === 'updateSelectedText') {
    chrome.storage.local.set({ selectedText: message.text });
    return true;
  }
});

// 提取页面内容的函数
function extractPageContent() {
  // 尝试获取页面的主要内容
  const article = document.querySelector('article');
  if (article) {
    return article.innerText;
  }
  
  // 如果没有article标签，尝试获取主要内容区域
  const mainContent = document.querySelector('main') || 
                     document.querySelector('.content') || 
                     document.querySelector('#content');
  if (mainContent) {
    return mainContent.innerText;
  }
  
  // 如果仍然找不到，获取页面所有文本
  return document.body.innerText;
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyzeSelectedText') {
    // 获取选中的文本
    const selectedText = info.selectionText;
    
    // 保存选中的文本到本地存储
    chrome.storage.local.set({ selectedText: selectedText }, () => {
      // 打开侧边栏
      chrome.sidePanel.open({ tabId: tab.id });
    });
  }
});
