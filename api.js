/**
 * RepRisk News Analyzer - API Integration
 * Handles interactions with the OpenAI API for news analysis
 */

/**
 * Get prompt text for news analysis
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
 * Analyze news text using OpenAI API
 * @param {string} apiKey - OpenAI API key
 * @param {string} newsText - News text to analyze
 * @param {string} promptText - Prompt text for the analysis
 * @param {string} model - OpenAI model to use
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeNewsWithOpenAI(apiKey, newsText, promptText, model = 'gpt-4-turbo') {
  try {
    // Prepare request body
    const requestBody = {
      model: model,
      messages: [
        {
          role: "system",
          content: promptText
        },
        {
          role: "user",
          content: newsText
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    };
    
    // Make API request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    // Check for errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }
    
    // Parse and return response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing news with OpenAI:', error);
    throw error;
  }
}
