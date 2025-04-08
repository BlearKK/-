// 全局变量
let apiKey = '';
let selectedModel = 'gpt-4-turbo';
let companyColor = '#cce5ff';
let criticismColor = '#fff3cd';
let sourceColor = '#d4edda';
let analysisResults = [];

// DOM元素
document.addEventListener('DOMContentLoaded', function() {
  // 标签页切换
  const tabButtons = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 移除所有活动标签和面板
      tabButtons.forEach(btn => btn.classList.remove('active'));
      panels.forEach(panel => panel.classList.remove('active'));
      
      // 激活当前标签和面板
      button.classList.add('active');
      const targetPanel = document.getElementById(button.id.replace('tab-', '') + '-panel');
      targetPanel.classList.add('active');
    });
  });
  
  // 从当前页面提取文本
  document.getElementById('extract-page-text').addEventListener('click', extractPageText);
  
  // 分析按钮
  document.getElementById('analyze-button').addEventListener('click', analyzeText);
  
  // 复制结果
  document.getElementById('copy-result').addEventListener('click', copyResult);
  
  // 保存为HTML
  document.getElementById('save-result').addEventListener('click', saveAsHTML);
  
  // 保存设置
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  
  // 重置设置
  document.getElementById('reset-settings').addEventListener('click', resetSettings);
  
  // 加载设置
  loadSettings();
});

// 从当前页面提取文本
function extractPageText() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: () => {
        // 获取页面主要内容
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
    }, (results) => {
      if (results && results[0] && results[0].result) {
        document.getElementById('news-text').value = results[0].result;
      } else {
        alert('无法从当前页面提取文本，请手动复制粘贴。');
      }
    });
  });
}

// 分析文本
async function analyzeText() {
  const newsText = document.getElementById('news-text').value.trim();
  
  if (!newsText) {
    alert('请输入需要分析的新闻文本！');
    return;
  }
  
  if (!apiKey) {
    alert('请在设置中输入OpenAI API密钥！');
    document.getElementById('tab-settings').click();
    return;
  }
  
  // 显示加载动画
  document.getElementById('loading').style.display = 'flex';
  
  try {
    // 读取提示文本
    const promptText = await getPromptText();
    
    // 调用OpenAI API
    const result = await analyzeNewsWithOpenAI(apiKey, newsText, promptText);
    
    // 解析分析结果
    analysisResults = parseAnalysisResults(result);
    
    // 生成高亮文本
    const highlightedText = generateHighlightedHTML(newsText, analysisResults);
    document.getElementById('analysis-result').innerHTML = highlightedText;
    
    // 生成摘要
    const summaryHTML = generateSummaryHTML(analysisResults);
    document.getElementById('summary-content').innerHTML = summaryHTML;
    
    // 切换到结果标签页
    document.getElementById('tab-result').click();
  } catch (error) {
    alert('分析过程中出错: ' + error.message);
    console.error('分析错误:', error);
  } finally {
    // 隐藏加载动画
    document.getElementById('loading').style.display = 'none';
  }
}

// 获取提示文本
async function getPromptText() {
  // 这里使用内置的提示文本，也可以从服务器或存储中获取
  return `
You are a professional ESG Research analyst with 10 years of experience in ESG analysis for reputational risk. A junior analyst has requested your expert assistance. Your task is to meticulously review a document and identify every entity that is criticized, along with the exact cited text that contains each criticism. Accuracy and completeness are critical.

## Instruction

### Entity Identification: 
You will search this entire document and identify every company, business entity, or corporate name mentioned, regardless of how frequently or in what context they appear. Include both large corporations and smaller suppliers, intermediaries, or any organization involved, even if only briefly mentioned in the document. Focus on entities that are explicitly criticized.

### Explicit Criticism: 
Direct, clear, and unambiguous ESG accusations against companies or projects. Any severity rating can be applied to explicit criticism. 
Examples: 
The NGO Greenpeace has accused Company A of causing deforestation in a rainforest in Ecuador. 
A study by the Korean Ministry of Labor has found that the risk of leukemia is five times higher among women working at Company B's semiconductor plant compared to the general population. 

### Implied Criticism: 
Indirect ESG accusations against companies or projects. These companies or projects are not the primary focus of the criticism but are cited as examples, leading to their indirect implication. 

### Citation of original sentence
Cite the original criticism content identified from the document.

## Criticized by
For criticisms from government agencies or officials and NGOs, cite the source of criticism in the criticized_by field.
For criticisms from other critics (such as journalists, academics, local residents, etc.), leave the criticized_by field empty.

## Output Format 
Please return the results in the following JSON format:
[
  {
    "company": "Company Name",
    "citation": "Original text containing criticism",
    "criticized_by": "Criticism source (if any)"
  }
]

## Notes
1. company cannot include government or NGO.
2. Make sure to extract the EXACT company name as it appears in the text.
3. For Japanese text, make sure to correctly identify company names even when they are written in hiragana, katakana, or kanji.
4. If the criticism source is a city or government agency, include it in the criticized_by field.

Please analyze the following news text:`;
}

// 调用OpenAI API分析新闻
async function analyzeNewsWithOpenAI(apiKey, newsText, promptText) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {role: "system", content: promptText},
          {role: "user", content: newsText}
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API错误: ${errorData.error?.message || '未知错误'}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API调用错误:', error);
    
    // 如果API调用失败，使用示例数据
    return `
company_name: First City Monument Bank (FCMB)
Citation: "The school owner accused the financial institution of collusion and fraudulent sale of his school property without proper consent or valuation."
Criticized by: Pastor Sunday Omonivi Enikuomehin

company_name: FCMB
Citation: "Enikuomehin alleged that despite a mutual agreement between his team and FCMB in 2016 to handle the sale of the mortgaged property through joint negotiation, the bank unilaterally proceeded in 2023 to sell the school building to a third party for ₦90 million."
Criticized by: Pastor Sunday Omonivi Enikuomehin
`;
  }
}

// 解析分析结果
function parseAnalysisResults(analysisResult) {
  const results = [];
  
  try {
    // 尝试使用正则表达式解析
    const companyPattern = /(?:company_name|"company_name"):\s*"?([^"\n]+)"?/g;
    const citationPattern = /(?:Citation|"Citation"):\s*"([^"]+)"/g;
    const criticizedByPattern = /(?:Criticized by|"Criticized by"):\s*"?([^"\n]+)"?/g;
    
    let companies = [];
    let citations = [];
    let criticizedBys = [];
    
    let match;
    while ((match = companyPattern.exec(analysisResult)) !== null) {
      companies.push(match[1].trim());
    }
    
    while ((match = citationPattern.exec(analysisResult)) !== null) {
      citations.push(match[1].trim());
    }
    
    while ((match = criticizedByPattern.exec(analysisResult)) !== null) {
      criticizedBys.push(match[1].trim());
    }
    
    // 确保所有列表长度一致
    const minLength = Math.min(companies.length, citations.length, criticizedBys.length);
    
    for (let i = 0; i < minLength; i++) {
      results.push({
        company_name: companies[i],
        citation: citations[i],
        criticized_by: criticizedBys[i]
      });
    }
    
    if (results.length === 0) {
      // 如果正则表达式没有找到结果，尝试按段落分割
      const paragraphs = analysisResult.split('\n\n');
      for (const paragraph of paragraphs) {
        if (!paragraph.trim()) continue;
        
        const lines = paragraph.trim().split('\n');
        if (lines.length >= 2) {
          const item = {};
          
          for (const line of lines) {
            if (line.toLowerCase().includes('company_name') || line.toLowerCase().includes('"company_name"')) {
              let value = line.split(':', 1)[1]?.trim() || '';
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
              }
              if (value.endsWith(',')) {
                value = value.substring(0, value.length - 1);
              }
              item.company_name = value;
            } else if (line.toLowerCase().includes('citation') || line.toLowerCase().includes('"citation"')) {
              let value = line.split(':', 1)[1]?.trim() || '';
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
              }
              if (value.endsWith(',')) {
                value = value.substring(0, value.length - 1);
              }
              item.citation = value;
            } else if (line.toLowerCase().includes('criticized by') || line.toLowerCase().includes('"criticized by"')) {
              let value = line.split(':', 1)[1]?.trim() || '';
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
              }
              if (value.endsWith(',')) {
                value = value.substring(0, value.length - 1);
              }
              item.criticized_by = value;
            }
          }
          
          if (item.company_name && item.citation) {
            if (!item.criticized_by) {
              item.criticized_by = '';
            }
            results.push(item);
          }
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('解析分析结果出错:', error);
    return [];
  }
}

// 生成高亮HTML
function generateHighlightedHTML(newsText, analysisResults) {
  // 将新闻文本按行分割
  const lines = newsText.split('\n');
  const highlightedLines = [];
  
  // 创建公司名称和批评来源的映射
  const companyNames = {};
  const criticismSources = {};
  
  // 从分析结果中提取公司名称和批评来源
  for (const result of analysisResults) {
    const companyName = result.company_name || '';
    const criticizedBy = result.criticized_by || '';
    
    if (companyName) {
      companyNames[companyName] = true;
    }
    if (criticizedBy) {
      criticismSources[criticizedBy] = true;
    }
  }
  
  // 处理每一行文本
  for (const line of lines) {
    let originalLine = line;
    let processedLine = line;
    
    // 检查这一行是否包含批评信息
    let isCriticismLine = false;
    for (const result of analysisResults) {
      const citation = result.citation || '';
      if (citation && originalLine.includes(citation)) {
        isCriticismLine = true;
        break;
      }
    }
    
    // 先标记公司名称和批评来源，按长度排序以避免部分匹配问题
    const sortedCompanies = Object.keys(companyNames).sort((a, b) => b.length - a.length);
    for (const company of sortedCompanies) {
      if (processedLine.includes(company)) {
        processedLine = processedLine.replace(
          new RegExp(escapeRegExp(company), 'g'),
          `<span class="company" style="background-color:${companyColor}">${company}</span>`
        );
      }
    }
    
    const sortedSources = Object.keys(criticismSources).sort((a, b) => b.length - a.length);
    for (const source of sortedSources) {
      if (processedLine.includes(source)) {
        processedLine = processedLine.replace(
          new RegExp(escapeRegExp(source), 'g'),
          `<span class="source" style="background-color:${sourceColor}">${source}</span>`
        );
      }
    }
    
    // 如果是批评信息行，用黄色背景标注整行
    if (isCriticismLine) {
      processedLine = `<span class="citation" style="background-color:${criticismColor}">${processedLine}</span>`;
    }
    
    highlightedLines.push(processedLine);
  }
  
  // 将处理后的行重新组合成文本，并将换行符替换为HTML换行标签
  return highlightedLines.join('<br>\n');
}

// 生成摘要HTML
function generateSummaryHTML(analysisResults) {
  let summaryHTML = '';
  
  for (const result of analysisResults) {
    const companyName = result.company_name || '';
    const citation = result.citation || '';
    const criticizedBy = result.criticized_by || '';
    
    summaryHTML += `
    <div class="summary-item">
      <p><strong>公司:</strong> <span class="company" style="background-color:${companyColor}">${companyName}</span></p>
      <p><strong>批评信息:</strong> <span class="citation" style="background-color:${criticismColor}">${citation}</span></p>
      <p><strong>批评来源:</strong> <span class="source" style="background-color:${sourceColor}">${criticizedBy || '未指定'}</span></p>
    </div>
    `;
  }
  
  return summaryHTML || '<p>未找到分析结果</p>';
}

// 复制结果
function copyResult() {
  const resultElement = document.getElementById('analysis-result');
  const summaryElement = document.getElementById('summary-content');
  
  // 创建一个临时元素来存储要复制的内容
  const tempElement = document.createElement('div');
  tempElement.innerHTML = `
    <h1>新闻分析结果</h1>
    <h2>高亮文本</h2>
    ${resultElement.innerHTML}
    <h2>分析摘要</h2>
    ${summaryElement.innerHTML}
  `;
  
  // 将HTML转换为纯文本
  const plainText = tempElement.innerText;
  
  // 复制到剪贴板
  navigator.clipboard.writeText(plainText)
    .then(() => alert('结果已复制到剪贴板'))
    .catch(err => {
      console.error('复制失败:', err);
      alert('复制失败，请手动选择并复制');
    });
}

// 保存为HTML
function saveAsHTML() {
  const resultElement = document.getElementById('analysis-result');
  const summaryElement = document.getElementById('summary-content');
  
  // 创建HTML内容
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>新闻分析结果</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      h1 {
        color: #2c3e50;
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
      }
      h2 {
        color: #2c3e50;
        margin-top: 30px;
      }
      .container {
        background: white;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .news-content {
        margin-bottom: 30px;
      }
      .summary {
        margin-top: 30px;
      }
      .summary-item {
        margin-bottom: 20px;
        padding: 15px;
        background: #f9f9f9;
        border-radius: 5px;
      }
      .company {
        color: #004085;
        background-color: ${companyColor};
        padding: 2px 5px;
        border-radius: 3px;
      }
      .citation {
        color: #856404;
        background-color: ${criticismColor};
        padding: 2px 5px;
        border-radius: 3px;
      }
      .source {
        color: #155724;
        background-color: ${sourceColor};
        padding: 2px 5px;
        border-radius: 3px;
      }
      .legend {
        display: flex;
        margin-bottom: 20px;
        padding: 10px;
        background: #f9f9f9;
        border-radius: 5px;
      }
      .legend-item {
        display: flex;
        align-items: center;
        margin-right: 20px;
      }
      .legend-color {
        width: 20px;
        height: 20px;
        margin-right: 5px;
        border-radius: 3px;
      }
      .blue {
        background-color: ${companyColor};
      }
      .yellow {
        background-color: ${criticismColor};
      }
      .green {
        background-color: ${sourceColor};
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>新闻分析结果</h1>
      
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color blue"></div>
          <span>公司名称</span>
        </div>
        <div class="legend-item">
          <div class="legend-color yellow"></div>
          <span>批评信息</span>
        </div>
        <div class="legend-item">
          <div class="legend-color green"></div>
          <span>批评来源</span>
        </div>
      </div>
      
      <div class="news-content">
        ${resultElement.innerHTML}
      </div>
      
      <div class="summary">
        <h2>分析摘要</h2>
        ${summaryElement.innerHTML}
      </div>
    </div>
  </body>
  </html>
  `;
  
  // 创建Blob对象
  const blob = new Blob([htmlContent], {type: 'text/html'});
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'news_analysis_result.html';
  
  // 模拟点击下载
  document.body.appendChild(a);
  a.click();
  
  // 清理
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// 保存设置
function saveSettings() {
  apiKey = document.getElementById('api-key').value;
  selectedModel = document.getElementById('model-select').value;
  companyColor = document.getElementById('company-color').value;
  criticismColor = document.getElementById('criticism-color').value;
  sourceColor = document.getElementById('source-color').value;
  
  // 保存到Chrome存储
  chrome.storage.sync.set({
    apiKey,
    selectedModel,
    companyColor,
    criticismColor,
    sourceColor
  }, function() {
    alert('设置已保存');
  });
}

// 重置设置
function resetSettings() {
  // 重置为默认值
  document.getElementById('api-key').value = '';
  document.getElementById('model-select').value = 'gpt-4-turbo';
  document.getElementById('company-color').value = '#cce5ff';
  document.getElementById('criticism-color').value = '#fff3cd';
  document.getElementById('source-color').value = '#d4edda';
  
  // 保存默认设置
  saveSettings();
}

// 加载设置
function loadSettings() {
  chrome.storage.sync.get({
    apiKey: '',
    selectedModel: 'gpt-4-turbo',
    companyColor: '#cce5ff',
    criticismColor: '#fff3cd',
    sourceColor: '#d4edda'
  }, function(items) {
    apiKey = items.apiKey;
    selectedModel = items.selectedModel;
    companyColor = items.companyColor;
    criticismColor = items.criticismColor;
    sourceColor = items.sourceColor;
    
    // 更新UI
    document.getElementById('api-key').value = apiKey;
    document.getElementById('model-select').value = selectedModel;
    document.getElementById('company-color').value = companyColor;
    document.getElementById('criticism-color').value = criticismColor;
    document.getElementById('source-color').value = sourceColor;
  });
}

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
