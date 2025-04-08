/**
 * RepRisk News Analyzer - Utility Functions
 * Contains helper functions for parsing analysis results and generating HTML
 */

/**
 * Get the prompt text for OpenAI analysis
 * @returns {string} Prompt text
 */
function getPromptText() {
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

Please analyze the following news text:
  `;
}

/**
 * Parse analysis results from OpenAI
 * @param {string} analysisResult - Raw analysis result from OpenAI
 * @returns {Array} Parsed analysis results
 */
function parseAnalysisResults(analysisResult) {
  try {
    // 检查分析结果是否存在
    if (!analysisResult || !analysisResult.choices || !analysisResult.choices[0] || !analysisResult.choices[0].message) {
      console.error('Invalid analysis result structure:', analysisResult);
      return [];
    }
    
    // 提取内容
    let content = analysisResult.choices[0].message.content;
    console.log('Raw API response content:', content);
    
    // 处理非JSON格式的输出
    let results = [];
    
    // 尝试先将内容解析为JSON
    try {
      // 尝试查找JSON数组的开始和结束位置
      const jsonStartIndex = content.indexOf('[');
      const jsonEndIndex = content.lastIndexOf(']');
      
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        // 提取JSON部分
        const jsonContent = content.substring(jsonStartIndex, jsonEndIndex + 1);
        console.log('Extracted JSON content:', jsonContent);
        
        try {
          const parsedContent = JSON.parse(jsonContent);
          if (Array.isArray(parsedContent)) {
            console.log('Successfully parsed content as JSON array');
            
            // 如果是JSON数组，直接过滤并返回
            return parsedContent.filter(item => {
              if (!item || typeof item !== 'object') return false;
              return item.company || item.company_name;
            }).map(item => {
              // 标准化字段名称
              return {
                company: item.company || item.company_name || '',
                citation: item.citation || item.Citation || '',
                criticized_by: item.criticized_by || item["Criticized by"] || ''
              };
            });
          }
        } catch (innerParseError) {
          console.error('Error parsing extracted JSON:', innerParseError);
        }
      }
      
      // 尝试解析整个内容
      const parsedContent = JSON.parse(content);
      if (Array.isArray(parsedContent)) {
        console.log('Successfully parsed entire content as JSON array');
        
        // 如果是JSON数组，直接过滤并返回
        return parsedContent.filter(item => {
          if (!item || typeof item !== 'object') return false;
          return item.company || item.company_name;
        }).map(item => {
          // 标准化字段名称
          return {
            company: item.company || item.company_name || '',
            citation: item.citation || item.Citation || '',
            criticized_by: item.criticized_by || item["Criticized by"] || ''
          };
        });
      }
    } catch (parseError) {
      console.log('Not a JSON format, trying to parse as key-value pairs:', parseError);
      // 不是JSON格式，尝试解析键值对格式
    }
    
    // 如果不是JSON，尝试解析键值对格式
    const entries = content.split('\n\n');
    
    for (const entry of entries) {
      if (entry.trim()) {
        const lines = entry.split('\n');
        let item = {};
        
        for (const line of lines) {
          if (line.includes(':')) {
            const [key, value] = line.split(':', 2);
            const trimmedKey = key.trim().replace(/"/g, '');
            const trimmedValue = value.trim().replace(/"/g, '');
            
            // 处理各种可能的字段名称
            if (trimmedKey.toLowerCase() === 'company_name' || trimmedKey.toLowerCase() === 'company') {
              item.company = trimmedValue;
            } else if (trimmedKey.toLowerCase() === 'citation' || trimmedKey.toLowerCase() === 'criticism') {
              item.citation = trimmedValue;
            } else if (trimmedKey.toLowerCase() === 'criticized by' || trimmedKey.toLowerCase() === 'criticized_by' || trimmedKey.toLowerCase() === 'critics') {
              item.criticized_by = trimmedValue;
            }
          }
        }
        
        // 如果至少有公司名称和引用文本，则添加到结果中
        if (item.company && item.citation) {
          results.push(item);
        }
      }
    }
    
    // 如果仍然没有结果，尝试使用正则表达式提取
    if (results.length === 0) {
      console.log('Trying to extract with regex');
      
      // 匹配公司名称和批评内容的正则表达式
      const companyRegex = /"?company(?:_name)?"?\s*:\s*"([^"]+)"/gi;
      const citationRegex = /"?citation"?\s*:\s*"([^"]+)"/gi;
      const criticizedByRegex = /"?criticized(?:_by|\s+by)"?\s*:\s*"([^"]*)"/gi;
      
      let companyMatch, citationMatch, criticizedByMatch;
      let index = 0;
      
      // 提取所有匹配项
      while ((companyMatch = companyRegex.exec(content)) !== null) {
        citationRegex.lastIndex = 0; // 重置索引
        criticizedByRegex.lastIndex = 0; // 重置索引
        
        const company = companyMatch[1];
        let citation = '';
        let criticized_by = '';
        
        // 查找对应的批评内容
        while ((citationMatch = citationRegex.exec(content)) !== null) {
          citation = citationMatch[1];
          break;
        }
        
        // 查找对应的批评来源
        while ((criticizedByMatch = criticizedByRegex.exec(content)) !== null) {
          criticized_by = criticizedByMatch[1];
          break;
        }
        
        if (company && citation) {
          results.push({ company, citation, criticized_by });
        }
        
        index++;
      }
    }
    
    console.log('Parsed results:', results);
    return results;
  } catch (error) {
    console.error('Error parsing analysis results:', error);
    return [];
  }
}

/**
 * Generate HTML with highlighted text based on analysis results
 * @param {string} originalText - Original news text
 * @param {Array} analysisResults - Parsed analysis results
 * @param {string} companyColor - Color for company highlights
 * @param {string} criticismColor - Color for criticism highlights
 * @param {string} sourceColor - Color for source highlights
 * @returns {string} HTML with highlighted text
 */
function generateHighlightedHTML(originalText, analysisResults, companyColor, criticismColor, sourceColor) {
  if (!analysisResults || analysisResults.length === 0) {
    return `<p>No criticisms found in the text.</p>`;
  }
  
  let highlightedText = originalText;
  
  // Sort analysis results by citation length (descending) to avoid nested highlighting issues
  const sortedResults = [...analysisResults].sort((a, b) => {
    return (b.citation?.length || 0) - (a.citation?.length || 0);
  });
  
  // First, highlight criticisms (entire citation with yellow background)
  sortedResults.forEach(result => {
    if (result.citation) {
      const citationText = result.citation;
      // 使用精确匹配而不是单词边界，以确保完整匹配引用文本
      const escapedCitation = escapeRegExp(citationText);
      const regex = new RegExp(escapedCitation, 'g');
      
      highlightedText = highlightedText.replace(regex, match => 
        `<span class="citation-highlight" style="background-color: ${criticismColor};">${match}</span>`
      );
    }
  });
  
  // Then, highlight companies (blue color, even within criticism spans)
  sortedResults.forEach(result => {
    if (result.company) {
      const companyName = result.company;
      // 移除单词边界限制，使用精确匹配
      const regex = new RegExp(`${escapeRegExp(companyName)}`, 'gi');
      
      // 使用DOM解析替换，以便在已高亮的文本中也能正确替换
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = highlightedText;
      
      // 遍历所有文本节点
      const textNodes = [];
      const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }
      
      // 替换每个文本节点中的公司名称
      textNodes.forEach(textNode => {
        const parent = textNode.parentNode;
        const text = textNode.nodeValue;
        const parts = text.split(regex);
        
        if (parts.length > 1) { // 找到匹配项
          const fragment = document.createDocumentFragment();
          let i = 0;
          text.replace(regex, (match) => {
            // 添加匹配前的文本
            if (parts[i].length > 0) {
              fragment.appendChild(document.createTextNode(parts[i]));
            }
            
            // 添加带有蓝色背景的公司名称
            const span = document.createElement('span');
            span.className = 'company-highlight';
            span.style.backgroundColor = companyColor;
            span.textContent = match;
            fragment.appendChild(span);
            
            i++;
            return match;
          });
          
          // 添加最后一部分
          if (parts[i] && parts[i].length > 0) {
            fragment.appendChild(document.createTextNode(parts[i]));
          }
          
          // 替换原始节点
          parent.replaceChild(fragment, textNode);
        }
      });
      
      highlightedText = tempDiv.innerHTML;
    }
  });
  
  // Finally, highlight criticism sources (green color, even within criticism spans)
  sortedResults.forEach(result => {
    if (result.criticized_by && result.criticized_by.trim() !== '') {
      const sourceText = result.criticized_by;
      // 移除单词边界限制，使用精确匹配
      const regex = new RegExp(`${escapeRegExp(sourceText)}`, 'gi');
      
      // 使用DOM解析替换，以便在已高亮的文本中也能正确替换
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = highlightedText;
      
      // 遍历所有文本节点
      const textNodes = [];
      const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }
      
      // 替换每个文本节点中的批评来源
      textNodes.forEach(textNode => {
        const parent = textNode.parentNode;
        const text = textNode.nodeValue;
        const parts = text.split(regex);
        
        if (parts.length > 1) { // 找到匹配项
          const fragment = document.createDocumentFragment();
          let i = 0;
          text.replace(regex, (match) => {
            // 添加匹配前的文本
            if (parts[i].length > 0) {
              fragment.appendChild(document.createTextNode(parts[i]));
            }
            
            // 添加带有绿色背景的批评来源
            const span = document.createElement('span');
            span.className = 'source-highlight';
            span.style.backgroundColor = sourceColor;
            span.textContent = match;
            fragment.appendChild(span);
            
            i++;
            return match;
          });
          
          // 添加最后一部分
          if (parts[i] && parts[i].length > 0) {
            fragment.appendChild(document.createTextNode(parts[i]));
          }
          
          // 替换原始节点
          parent.replaceChild(fragment, textNode);
        }
      });
      
      highlightedText = tempDiv.innerHTML;
    }
  });
  
  // Convert newlines to <br> tags
  highlightedText = highlightedText.replace(/\n/g, '<br>');
  
  return highlightedText;
}

/**
 * Generate summary HTML based on analysis results
 * @param {Array} analysisResults - Parsed analysis results
 * @returns {string} HTML summary
 */
function generateSummaryHTML(analysisResults) {
  if (!analysisResults || analysisResults.length === 0) {
    return `<p class="placeholder-text">No criticisms found in the text.</p>`;
  }
  
  // Group results by company
  const companySummary = {};
  
  analysisResults.forEach(result => {
    if (result.company) {
      if (!companySummary[result.company]) {
        companySummary[result.company] = [];
      }
      
      companySummary[result.company].push({
        criticism: result.citation,  // 使用citation字段而不是criticism
        source: result.criticized_by  // 使用criticized_by字段而不是source
      });
    }
  });
  
  // 添加调试日志
  console.log('Summary data:', companySummary);
  
  // Generate HTML
  let summaryHTML = '';
  
  Object.keys(companySummary).forEach(company => {
    const criticisms = companySummary[company];
    
    summaryHTML += `
      <div class="company-summary">
        <div class="company-tag">${company}</div>
        <div class="company-details">
          <ul>
    `;
    
    criticisms.forEach(item => {
      summaryHTML += `
        <li>
          <strong>Criticism:</strong> ${item.criticism || 'N/A'}<br>
          <strong>Source:</strong> ${item.source || 'N/A'}
        </li>
      `;
    });
    
    summaryHTML += `
          </ul>
        </div>
      </div>
    `;
  });
  
  return summaryHTML;
}

/**
 * Escape special characters in a string for use in a regular expression
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegExp(string) {
  if (!string) return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
