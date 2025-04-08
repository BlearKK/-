// 内容脚本 - 在网页中执行
// 负责与网页内容交互，提取文本和显示分析结果

// 全局变量
let isAnalyzing = false;
let selectedText = '';

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSelectedText') {
    // 返回当前选中的文本
    sendResponse({ text: window.getSelection().toString() });
  }
  
  if (message.action === 'highlightAnalysisResults') {
    // 在页面上高亮显示分析结果
    highlightResults(message.results);
    sendResponse({ status: 'success' });
  }
  
  if (message.action === 'showAnalysisPanel') {
    // 在页面上显示分析面板
    showAnalysisPanel(message.results);
    sendResponse({ status: 'success' });
  }
  
  return true;
});

// 添加右键菜单选择事件监听
document.addEventListener('mouseup', function(event) {
  // 获取选中的文本
  const selection = window.getSelection().toString().trim();
  if (selection) {
    selectedText = selection;
    
    // 向扩展发送消息，更新选中的文本
    chrome.runtime.sendMessage({
      action: 'updateSelectedText',
      text: selectedText
    });
  }
});

// 在页面上高亮显示分析结果
function highlightResults(results) {
  if (!results || results.length === 0) return;
  
  // 确保样式已添加
  addStyles();
  
  // 获取当前页面的文本节点
  const textNodes = getTextNodes(document.body);
  
  // 按长度排序，先处理较长的文本，避免部分替换问题
  const sortedResults = results.sort((a, b) => 
    (b.citation ? b.citation.length : 0) - (a.citation ? a.citation.length : 0)
  );
  
  // 创建公司名称和批评来源的映射
  const companyNames = {};
  const criticismSources = {};
  
  // 从分析结果中提取公司名称和批评来源
  for (const result of sortedResults) {
    const companyName = result.company || '';
    const criticizedBy = result.criticized_by || '';
    
    if (companyName) {
      companyNames[companyName] = true;
    }
    if (criticizedBy) {
      criticismSources[criticizedBy] = true;
    }
  }
  
  // 处理每个文本节点
  for (const node of textNodes) {
    let text = node.nodeValue;
    let hasChanges = false;
    
    // 检查是否包含批评信息、公司名称或批评来源
    let isCriticismNode = false;
    let containsCompany = false;
    let containsCitation = false;
    let containsSource = false;
    
    // 检查是否包含批评信息
    for (const result of sortedResults) {
      if (result.citation && text.includes(result.citation)) {
        isCriticismNode = true;
        containsCitation = true;
        break;
      }
    }
    
    // 检查是否包含公司名称
    for (const company of Object.keys(companyNames)) {
      if (company && company.trim() && text.includes(company)) {
        containsCompany = true;
        break;
      }
    }
    
    // 检查是否包含批评来源
    for (const source of Object.keys(criticismSources)) {
      if (source && source.trim() && text.includes(source)) {
        containsSource = true;
        break;
      }
    }
    
    // 标记公司名称 - 对日语文本使用精确匹配
    for (const company of Object.keys(companyNames)) {
      if (company && company.trim() && text.includes(company)) {
        // 使用精确匹配而不是单词边界，以便更好地处理日语文本
        text = text.replace(new RegExp(escapeRegExp(company), 'g'), 
          `###COMPANY_START###${company}###COMPANY_END###`);
        hasChanges = true;
        console.log(`标记公司名称: ${company}`);
      }
    }
    
    // 标记批评来源 - 对日语文本使用精确匹配
    for (const source of Object.keys(criticismSources)) {
      if (source && source.trim() && text.includes(source)) {
        // 使用精确匹配而不是单词边界，以便更好地处理日语文本
        text = text.replace(new RegExp(escapeRegExp(source), 'g'), 
          `###SOURCE_START###${source}###SOURCE_END###`);
        hasChanges = true;
        console.log(`标记批评来源: ${source}`);
      }
    }
    
    // 标记批评信息 - 对日语文本使用精确匹配
    for (const result of sortedResults) {
      if (result.citation && result.citation.trim() && text.includes(result.citation)) {
        // 使用精确匹配而不是单词边界，以便更好地处理日语文本
        text = text.replace(new RegExp(escapeRegExp(result.citation), 'g'), 
          `###CITATION_START###${result.citation}###CITATION_END###`);
        hasChanges = true;
        console.log(`标记批评信息: ${result.citation.substring(0, 50)}...`);
      }
    }
    
    // 如果是批评信息节点，标记整个节点
    if (isCriticismNode) {
      // 确保在标记批评信息之前，已经标记了公司名称和批评来源
      text = `###CRITICISM_START###${text}###CRITICISM_END###`;
      hasChanges = true;
      console.log(`标记批评信息节点`);
    }
    // 即使不是批评信息节点，如果包含公司名称或批评来源也标记为有变化
    else if (containsCompany || containsSource || containsCitation) {
      hasChanges = true;
      console.log(`标记包含公司名称/批评来源/批评信息的节点`);
    }
    
    // 如果有变化，替换节点内容
    if (hasChanges) {
      const fragment = document.createDocumentFragment();
      let currentIndex = 0;
      
      // 处理公司标记
      while (text.includes('###COMPANY_START###')) {
        const startIndex = text.indexOf('###COMPANY_START###');
        const endIndex = text.indexOf('###COMPANY_END###') + '###COMPANY_END###'.length;
        
        // 添加前面的文本
        if (startIndex > currentIndex) {
          fragment.appendChild(document.createTextNode(
            text.substring(currentIndex, startIndex)
          ));
        }
        
        // 提取公司名称
        const companyName = text.substring(
          startIndex + '###COMPANY_START###'.length,
          text.indexOf('###COMPANY_END###')
        );
        
        // 创建高亮元素
        const span = document.createElement('span');
        span.className = 'reprisk-company';
        span.textContent = companyName;
        fragment.appendChild(span);
        
        currentIndex = endIndex;
        text = text.substring(0, startIndex) + text.substring(endIndex);
      }
      
      // 处理来源标记
      while (text.includes('###SOURCE_START###')) {
        const startIndex = text.indexOf('###SOURCE_START###');
        const endIndex = text.indexOf('###SOURCE_END###') + '###SOURCE_END###'.length;
        
        // 添加前面的文本
        if (startIndex > currentIndex) {
          fragment.appendChild(document.createTextNode(
            text.substring(currentIndex, startIndex)
          ));
        }
        
        // 提取来源名称
        const sourceName = text.substring(
          startIndex + '###SOURCE_START###'.length,
          text.indexOf('###SOURCE_END###')
        );
        
        // 创建高亮元素
        const span = document.createElement('span');
        span.className = 'reprisk-source';
        span.textContent = sourceName;
        fragment.appendChild(span);
        
        currentIndex = endIndex;
        text = text.substring(0, startIndex) + text.substring(endIndex);
      }
      
      // 处理批评标记
      if (text.includes('###CRITICISM_START###')) {
        const startIndex = text.indexOf('###CRITICISM_START###');
        const endIndex = text.indexOf('###CRITICISM_END###') + '###CRITICISM_END###'.length;
        
        // 添加前面的文本
        if (startIndex > currentIndex) {
          fragment.appendChild(document.createTextNode(
            text.substring(currentIndex, startIndex)
          ));
        }
        
        // 提取批评内容
        const criticismText = text.substring(
          startIndex + '###CRITICISM_START###'.length,
          text.indexOf('###CRITICISM_END###')
        );
        
        // 创建高亮元素
        const span = document.createElement('span');
        span.className = 'reprisk-criticism';
        span.textContent = criticismText;
        fragment.appendChild(span);
        
        currentIndex = endIndex;
        text = text.substring(0, startIndex) + text.substring(endIndex);
      }
      
      // 处理批评信息标记
      while (text.includes('###CITATION_START###')) {
        const startIndex = text.indexOf('###CITATION_START###');
        const endIndex = text.indexOf('###CITATION_END###') + '###CITATION_END###'.length;
        
        // 添加前面的文本
        if (startIndex > currentIndex) {
          fragment.appendChild(document.createTextNode(
            text.substring(currentIndex, startIndex)
          ));
        }
        
        // 提取批评信息
        const citationText = text.substring(
          startIndex + '###CITATION_START###'.length,
          text.indexOf('###CITATION_END###')
        );
        
        // 创建高亮元素
        const span = document.createElement('span');
        span.className = 'reprisk-criticism';
        span.textContent = citationText;
        fragment.appendChild(span);
        
        currentIndex = endIndex;
        text = text.substring(0, startIndex) + text.substring(endIndex);
      }
      
      // 添加剩余的文本
      if (currentIndex < text.length) {
        fragment.appendChild(document.createTextNode(
          text.substring(currentIndex)
        ));
      }
      
      // 替换原始节点
      const parent = node.parentNode;
      parent.replaceChild(fragment, node);
    }
  }
}

// 在页面上显示分析面板
function showAnalysisPanel(results) {
  // 移除已有的面板
  const existingPanel = document.getElementById('reprisk-analysis-panel');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  // 创建分析面板
  const panel = document.createElement('div');
  panel.id = 'reprisk-analysis-panel';
  panel.className = 'reprisk-panel';
  
  // 添加面板标题
  const header = document.createElement('div');
  header.className = 'reprisk-panel-header';
  
  const title = document.createElement('h2');
  title.textContent = 'RepRisk 分析结果';
  header.appendChild(title);
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.className = 'reprisk-close-button';
  closeButton.addEventListener('click', () => panel.remove());
  header.appendChild(closeButton);
  
  panel.appendChild(header);
  
  // 添加图例
  const legend = document.createElement('div');
  legend.className = 'reprisk-legend';
  
  const companyLegend = document.createElement('div');
  companyLegend.className = 'reprisk-legend-item';
  companyLegend.innerHTML = '<div class="reprisk-legend-color reprisk-blue"></div><span>公司名称</span>';
  legend.appendChild(companyLegend);
  
  const criticismLegend = document.createElement('div');
  criticismLegend.className = 'reprisk-legend-item';
  criticismLegend.innerHTML = '<div class="reprisk-legend-color reprisk-yellow"></div><span>批评信息</span>';
  legend.appendChild(criticismLegend);
  
  const sourceLegend = document.createElement('div');
  sourceLegend.className = 'reprisk-legend-item';
  sourceLegend.innerHTML = '<div class="reprisk-legend-color reprisk-green"></div><span>批评来源</span>';
  legend.appendChild(sourceLegend);
  
  panel.appendChild(legend);
  
  // 添加摘要内容
  const summaryContent = document.createElement('div');
  summaryContent.className = 'reprisk-summary-content';
  
  if (results && results.length > 0) {
    for (const result of results) {
      const summaryItem = document.createElement('div');
      summaryItem.className = 'reprisk-summary-item';
      
      const companyPara = document.createElement('p');
      companyPara.innerHTML = `<strong>公司:</strong> <span class="reprisk-company">${result.company || ''}</span>`;
      summaryItem.appendChild(companyPara);
      
      const citationPara = document.createElement('p');
      citationPara.innerHTML = `<strong>批评信息:</strong> <span class="reprisk-criticism">${result.citation || ''}</span>`;
      summaryItem.appendChild(citationPara);
      
      const sourcePara = document.createElement('p');
      sourcePara.innerHTML = `<strong>批评来源:</strong> <span class="reprisk-source">${result.criticized_by || '未指定'}</span>`;
      summaryItem.appendChild(sourcePara);
      
      summaryContent.appendChild(summaryItem);
    }
  } else {
    summaryContent.innerHTML = '<p>未找到分析结果</p>';
  }
  
  panel.appendChild(summaryContent);
  
  // 添加操作按钮
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'reprisk-button-group';
  
  const highlightButton = document.createElement('button');
  highlightButton.textContent = '在页面上高亮显示';
  highlightButton.className = 'reprisk-button reprisk-primary-button';
  highlightButton.addEventListener('click', () => highlightResults(results));
  buttonGroup.appendChild(highlightButton);
  
  const clearButton = document.createElement('button');
  clearButton.textContent = '清除高亮';
  clearButton.className = 'reprisk-button reprisk-secondary-button';
  clearButton.addEventListener('click', clearHighlights);
  buttonGroup.appendChild(clearButton);
  
  panel.appendChild(buttonGroup);
  
  // 添加到页面
  document.body.appendChild(panel);
  
  // 添加拖动功能
  makeDraggable(panel);
}

// 清除高亮
function clearHighlights() {
  // 移除所有高亮元素
  const companies = document.querySelectorAll('.reprisk-company');
  const criticisms = document.querySelectorAll('.reprisk-criticism');
  const sources = document.querySelectorAll('.reprisk-source');
  
  // 辅助函数：替换元素为其文本内容
  const replaceWithText = (elements) => {
    for (const el of elements) {
      const text = el.textContent;
      const textNode = document.createTextNode(text);
      el.parentNode.replaceChild(textNode, el);
    }
  };
  
  replaceWithText(companies);
  replaceWithText(criticisms);
  replaceWithText(sources);
}

// 获取页面中的所有文本节点
function getTextNodes(node) {
  const textNodes = [];
  
  function getNodes(node) {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
      textNodes.push(node);
    } else {
      for (const child of node.childNodes) {
        getNodes(child);
      }
    }
  }
  
  getNodes(node);
  return textNodes;
}

// 使元素可拖动
function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  // 获取拖动的起始位置
  element.querySelector('.reprisk-panel-header').onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // 获取鼠标位置
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // 鼠标移动时调用函数
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // 计算新位置
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // 设置元素的新位置
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // 停止移动
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 添加CSS样式
function addStyles() {
  // 检查是否已经添加了样式
  if (document.getElementById('reprisk-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'reprisk-styles';
  style.textContent = `
    .reprisk-company {
      background-color: #add8e6 !important; /* 蓝色 */
      padding: 0 2px;
      border-radius: 2px;
      display: inline !important;
      font-size: inherit !important;
      font-family: inherit !important;
      line-height: inherit !important;
    }
    
    .reprisk-criticism {
      background-color: #ffff99 !important; /* 黄色 */
      padding: 0 2px;
      border-radius: 2px;
      display: inline !important;
      font-size: inherit !important;
      font-family: inherit !important;
      line-height: inherit !important;
    }
    
    .reprisk-source {
      background-color: #90ee90 !important; /* 绿色 */
      padding: 0 2px;
      border-radius: 2px;
      display: inline !important;
      font-size: inherit !important;
      font-family: inherit !important;
      line-height: inherit !important;
    }
  `;
  document.head.appendChild(style);
  console.log('RepRisk: 添加了样式');
}

// 页面加载时添加样式
addStyles();
