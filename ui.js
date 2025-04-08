/**
 * RepRisk News Analyzer - UI Helper Functions
 * Contains functions for managing UI elements and interactions
 */

/**
 * Initialize UI
 */
function initUI() {
  // Add company tag click event
  document.addEventListener('click', (event) => {
    if (event.target.closest('.company-tag')) {
      const tag = event.target.closest('.company-tag');
      const details = tag.nextElementSibling;
      if (details && details.classList.contains('company-details')) {
        if (details.classList.contains('active')) {
          details.classList.remove('active');
        } else {
          details.classList.add('active');
        }
      }
    }
  });
  
  // Add real-time preview for color pickers
  const colorInputs = document.querySelectorAll('input[type="color"]');
  colorInputs.forEach(input => {
    input.addEventListener('input', () => {
      const id = input.id;
      let cssVar = '';
      
      switch (id) {
        case 'company-color':
          cssVar = '--company-color';
          break;
        case 'criticism-color':
          cssVar = '--criticism-color';
          break;
        case 'source-color':
          cssVar = '--source-color';
          break;
      }
      
      if (cssVar) {
        document.documentElement.style.setProperty(cssVar, input.value);
      }
    });
  });
}

/**
 * Show loading animation
 */
function showLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'flex';
  }
}

/**
 * Hide loading animation
 */
function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
  }
}

/**
 * Show a specific panel
 * @param {string} panelId - ID of the panel to show
 */
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

/**
 * Update UI colors
 * @param {string} companyColor - Color for company highlights
 * @param {string} criticismColor - Color for criticism highlights
 * @param {string} sourceColor - Color for source highlights
 */
function updateUIColors(companyColor, criticismColor, sourceColor) {
  // Update preview colors
  updatePreviewColor('company-preview', companyColor);
  updatePreviewColor('criticism-preview', criticismColor);
  updatePreviewColor('source-preview', sourceColor);
  
  // Update example text background colors
  updateExampleTextColor('company-color', companyColor);
  updateExampleTextColor('criticism-color', criticismColor);
  updateExampleTextColor('source-color', sourceColor);
  
  // Update CSS variables
  document.documentElement.style.setProperty('--company-color', companyColor);
  document.documentElement.style.setProperty('--criticism-color', criticismColor);
  document.documentElement.style.setProperty('--source-color', sourceColor);
  
  // Update legend colors
  const blueElements = document.querySelectorAll('.legend-color.blue');
  const yellowElements = document.querySelectorAll('.legend-color.yellow');
  const greenElements = document.querySelectorAll('.legend-color.green');
  
  blueElements.forEach(el => el.style.backgroundColor = companyColor);
  yellowElements.forEach(el => el.style.backgroundColor = criticismColor);
  greenElements.forEach(el => el.style.backgroundColor = sourceColor);
  
  // Update existing highlight elements
  const companyHighlights = document.querySelectorAll('.company-highlight');
  const criticismHighlights = document.querySelectorAll('.criticism-highlight');
  const sourceHighlights = document.querySelectorAll('.source-highlight');
  
  companyHighlights.forEach(el => el.style.backgroundColor = companyColor);
  criticismHighlights.forEach(el => el.style.backgroundColor = criticismColor);
  sourceHighlights.forEach(el => el.style.backgroundColor = sourceColor);
}

/**
 * Update color preview
 * @param {string} elementId - ID of the preview element
 * @param {string} color - Color value
 */
function updatePreviewColor(elementId, color) {
  const previewElement = document.getElementById(elementId);
  if (previewElement) {
    previewElement.style.backgroundColor = color;
  }
}

/**
 * Update example text background color
 * @param {string} colorPickerId - ID of the color picker
 * @param {string} color - Color value
 */
function updateExampleTextColor(colorPickerId, color) {
  const colorPicker = document.getElementById(colorPickerId);
  if (colorPicker) {
    const settingItem = colorPicker.closest('.color-setting-item');
    if (settingItem) {
      const exampleText = settingItem.querySelector('.example-text span:last-child');
      if (exampleText) {
        exampleText.style.backgroundColor = color;
      }
    }
  }
}
