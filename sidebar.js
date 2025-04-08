/**
 * RepRisk News Analyzer - Sidebar Main Functionality
 * Minimalist design inspired by Dieter Rams design principles and MUJI product aesthetics
 */

// Global variables
let apiKey = '';
let selectedModel = 'gpt-4-turbo';
let companyColor = '#cce5ff';
let criticismColor = '#fff3cd';
let sourceColor = '#d4edda';
let analysisResults = [];

// Initialize when DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize UI
  initUI();
  
  // Initialize tab switching
  initTabSwitching();
  
  // Extract text from current page
  document.getElementById('extract-page-text').addEventListener('click', extractPageText);
  
  // Analyze button
  document.getElementById('analyze-button').addEventListener('click', analyzeText);
  
  // Copy results
  document.getElementById('copy-result').addEventListener('click', copyResult);
  
  // Save as HTML
  document.getElementById('save-result').addEventListener('click', saveAsHTML);
  
  // Save settings
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  
  // Reset settings
  document.getElementById('reset-settings').addEventListener('click', resetSettings);
  
  // Load settings
  loadSettings();
  
  // Check for text passed from context menu
  checkForSelectedText();
});

// Extract text from current page
function extractPageText() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: () => {
        // Get main content from page
        const article = document.querySelector('article');
        if (article) {
          return article.innerText;
        }
        
        // If no article tag, try to get main content area
        const mainContent = document.querySelector('main') || 
                           document.querySelector('.content') || 
                           document.querySelector('#content');
        if (mainContent) {
          return mainContent.innerText;
        }
        
        // If still can't find, get all text from body
        return document.body.innerText;
      }
    }, (results) => {
      if (results && results[0] && results[0].result) {
        document.getElementById('news-text').value = results[0].result;
      } else {
        alert('Unable to extract text from current page. Please copy and paste manually.');
      }
    });
  });
}

// Check for text passed from context menu
function checkForSelectedText() {
  chrome.storage.local.get('selectedText', (data) => {
    if (data.selectedText) {
      document.getElementById('news-text').value = data.selectedText;
      chrome.storage.local.remove('selectedText');
    }
  });
}

// Analyze text
async function analyzeText() {
  const newsText = document.getElementById('news-text').value.trim();
  
  if (!newsText) {
    alert('Please enter news text to analyze!');
    return;
  }
  
  if (!apiKey) {
    alert('Please enter your OpenAI API key in the settings!');
    document.getElementById('tab-settings').click();
    return;
  }
  
  // Show loading animation
  showLoading();
  
  try {
    // Get prompt text
    const promptText = getPromptText();
    
    // Call OpenAI API to analyze news
    const analysisResult = await analyzeNewsWithOpenAI(apiKey, newsText, promptText, selectedModel);
    
    // Parse analysis results
    analysisResults = parseAnalysisResults(analysisResult);
    
    // Generate highlighted HTML
    const highlightedHTML = generateHighlightedHTML(newsText, analysisResults, companyColor, criticismColor, sourceColor);
    
    // Display analysis results
    document.getElementById('analysis-result').innerHTML = highlightedHTML;
    
    // Generate summary HTML
    const summaryHTML = generateSummaryHTML(analysisResults);
    document.getElementById('summary-content').innerHTML = summaryHTML;
    
    // Add company tag click handlers
    addCompanyTagClickHandlers();
    
    // Switch to results panel
    document.getElementById('tab-result').click();
  } catch (error) {
    console.error('Error during analysis:', error);
    alert('Analysis failed: ' + (error.message || 'Unknown error'));
  } finally {
    // Hide loading animation
    hideLoading();
  }
}

// Add company tag click handlers
function addCompanyTagClickHandlers() {
  const companyTags = document.querySelectorAll('.company-tag');
  companyTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const details = tag.nextElementSibling;
      if (details.classList.contains('active')) {
        details.classList.remove('active');
      } else {
        details.classList.add('active');
      }
    });
  });
}

// Copy result
function copyResult() {
  const resultElement = document.getElementById('analysis-result');
  if (!resultElement.textContent || resultElement.textContent === 'Analysis results will appear here...') {
    alert('No analysis results to copy!');
    return;
  }
  
  // Create temporary element to copy content
  const tempElement = document.createElement('div');
  tempElement.innerHTML = resultElement.innerHTML;
  
  // Add temporary element to DOM
  document.body.appendChild(tempElement);
  
  // Create range
  const range = document.createRange();
  range.selectNodeContents(tempElement);
  
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Copy
  document.execCommand('copy');
  
  // Cleanup
  selection.removeAllRanges();
  document.body.removeChild(tempElement);
  
  alert('Analysis results copied to clipboard!');
}

// Save as HTML
function saveAsHTML() {
  const resultElement = document.getElementById('analysis-result');
  if (!resultElement.textContent || resultElement.textContent === 'Analysis results will appear here...') {
    alert('No analysis results to save!');
    return;
  }
  
  // Create HTML document content
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RepRisk News Analysis Results</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .legend {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 5px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }
    .legend-color.blue {
      background-color: ${companyColor};
    }
    .legend-color.yellow {
      background-color: ${criticismColor};
    }
    .legend-color.green {
      background-color: ${sourceColor};
    }
    .company-highlight {
      background-color: ${companyColor};
      padding: 2px 0;
      border-radius: 2px;
    }
    .criticism-highlight {
      background-color: ${criticismColor};
      padding: 2px 0;
      border-radius: 2px;
    }
    .source-highlight {
      background-color: ${sourceColor};
      padding: 2px 0;
      border-radius: 2px;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>RepRisk News Analysis Results</h1>
  
  <div class="legend">
    <div class="legend-item">
      <div class="legend-color blue"></div>
      <span>Company</span>
    </div>
    <div class="legend-item">
      <div class="legend-color yellow"></div>
      <span>Criticism</span>
    </div>
    <div class="legend-item">
      <div class="legend-color green"></div>
      <span>Source</span>
    </div>
  </div>
  
  <div class="analysis-result">
    ${resultElement.innerHTML}
  </div>
  
  <div class="footer">
    <p>Generated by RepRisk News Analyzer - ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
  
  // Create Blob object
  const blob = new Blob([htmlContent], { type: 'text/html' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RepRisk_Analysis_${new Date().toISOString().slice(0, 10)}.html`;
  
  // Trigger download
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// Save settings
function saveSettings() {
  apiKey = document.getElementById('api-key').value.trim();
  selectedModel = document.getElementById('model-select').value;
  companyColor = document.getElementById('company-color').value;
  criticismColor = document.getElementById('criticism-color').value;
  sourceColor = document.getElementById('source-color').value;
  
  // Save to Chrome storage
  chrome.storage.sync.set({
    apiKey: apiKey,
    selectedModel: selectedModel,
    companyColor: companyColor,
    criticismColor: criticismColor,
    sourceColor: sourceColor
  }, () => {
    alert('Settings saved!');
    
    // Update UI colors
    updateUIColors(companyColor, criticismColor, sourceColor);
  });
}

// Reset settings
function resetSettings() {
  // Reset to default values
  document.getElementById('model-select').value = 'gpt-4-turbo';
  document.getElementById('company-color').value = '#cce5ff';
  document.getElementById('criticism-color').value = '#fff3cd';
  document.getElementById('source-color').value = '#d4edda';
  
  // Don't reset API key
  
  // Save settings
  saveSettings();
}

// Load settings
function loadSettings() {
  chrome.storage.sync.get({
    apiKey: '',
    selectedModel: 'gpt-4-turbo',
    companyColor: '#cce5ff',
    criticismColor: '#fff3cd',
    sourceColor: '#d4edda'
  }, (items) => {
    apiKey = items.apiKey;
    selectedModel = items.selectedModel;
    companyColor = items.companyColor;
    criticismColor = items.criticismColor;
    sourceColor = items.sourceColor;
    
    // Update UI
    document.getElementById('api-key').value = apiKey;
    document.getElementById('model-select').value = selectedModel;
    document.getElementById('company-color').value = companyColor;
    document.getElementById('criticism-color').value = criticismColor;
    document.getElementById('source-color').value = sourceColor;
    
    // Update UI colors
    updateUIColors(companyColor, criticismColor, sourceColor);
  });
}

function initTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      panels.forEach(panel => panel.classList.remove('active'));
      
      button.classList.add('active');
      const targetPanel = document.getElementById(button.id.replace('tab-', '') + '-panel');
      targetPanel.classList.add('active');
    });
  });
}
function initUI() {
  // Initialize tabs
  document.getElementById('tab-input').classList.add('active');
  document.getElementById('input-panel').classList.add('active');
  
  // Set placeholder text
  document.getElementById('analysis-result').innerHTML = '<p class="placeholder-text">Analysis results will appear here...</p>';
  document.getElementById('summary-content').innerHTML = '<p class="placeholder-text">Summary will appear here...</p>';
  
  // Initialize color pickers
  initColorPickers();
  
  // Add model selector options
  initModelSelector();
}

function initColorPickers() {
  const companyColorPicker = document.getElementById('company-color');
  const criticismColorPicker = document.getElementById('criticism-color');
  const sourceColorPicker = document.getElementById('source-color');
  
  // Add color change event listeners
  companyColorPicker.addEventListener('input', function() {
    updatePreviewColor('company-preview', this.value);
  });
  
  criticismColorPicker.addEventListener('input', function() {
    updatePreviewColor('criticism-preview', this.value);
  });
  
  sourceColorPicker.addEventListener('input', function() {
    updatePreviewColor('source-preview', this.value);
  });
}

function initModelSelector() {
  const modelSelect = document.getElementById('model-select');
  
  // Clear existing options
  modelSelect.innerHTML = '';
  
  // Add model options
  const models = [
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo (Recommended)' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini (Faster and more economical)' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Faster but less accurate)' }
  ];
  
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.name;
    modelSelect.appendChild(option);
  });
}

function updatePreviewColor(elementId, color) {
  const previewElement = document.getElementById(elementId);
  if (previewElement) {
    previewElement.style.backgroundColor = color;
  }
}

function showLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'flex';
  }
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
  }
}

function showPanel(panelId) {
  // Hide all panels
  const panels = document.querySelectorAll('.panel');
  panels.forEach(panel => panel.classList.remove('active'));
  
  // Deactivate all tabs
  const tabs = document.querySelectorAll('.tab-button');
  tabs.forEach(tab => tab.classList.remove('active'));
  
  // Show specified panel
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add('active');
    
    // Activate corresponding tab
    const tabId = panelId.replace('-panel', '');
    const tab = document.getElementById(`tab-${tabId}`);
    if (tab) {
      tab.classList.add('active');
    }
  }
}

function updateUIColors(companyColor, criticismColor, sourceColor) {
  // Update preview colors
  updatePreviewColor('company-preview', companyColor);
  updatePreviewColor('criticism-preview', criticismColor);
  updatePreviewColor('source-preview', sourceColor);
  
  // Update CSS variables
  document.documentElement.style.setProperty('--company-color', companyColor);
  document.documentElement.style.setProperty('--criticism-color', criticismColor);
  document.documentElement.style.setProperty('--source-color', sourceColor);
}
