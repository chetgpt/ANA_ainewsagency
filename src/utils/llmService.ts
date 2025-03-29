
/**
 * This file contains utilities for interacting with LLM APIs
 */

// Interface for the LLM API response
interface LLMResponse {
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  keywords: string[];
}

// LLM Provider types
type LLMProvider = "perplexity" | "gemini";

// Function to analyze text using an LLM API
export async function analyzeLLM(title: string, content: string): Promise<LLMResponse> {
  try {
    // Get API keys from environment variables
    const perplexityApiKey = import.meta.env.VITE_LLM_API_KEY;
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    // Determine which provider to use (prefer Gemini if available)
    const provider: LLMProvider = geminiApiKey ? "gemini" : "perplexity";
    const apiKey = provider === "gemini" ? geminiApiKey : perplexityApiKey;
    
    // If no API key is available, use a fallback message
    if (!apiKey) {
      console.warn("No LLM API key provided. Using fallback analysis.");
      return fallbackAnalysis(title, content);
    }
    
    console.log(`Using ${provider} for news analysis`);
    
    if (provider === "gemini") {
      return analyzeWithGemini(title, content, apiKey);
    } else {
      return analyzeWithPerplexity(title, content, apiKey);
    }
  } catch (error) {
    console.error("Error using LLM service:", error);
    return fallbackAnalysis(title, content);
  }
}

// Function to analyze content with Gemini
async function analyzeWithGemini(title: string, content: string, apiKey: string): Promise<LLMResponse> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a news analysis assistant. Analyze the following news article.
                Return a JSON object with the following fields:
                - summary: A concise 2-3 sentence summary of the key information
                - sentiment: Either "positive", "negative", or "neutral"
                - keywords: An array of 3-5 key terms from the article
                
                Title: ${title}
                
                Content: ${content}
                
                Respond ONLY with valid JSON.`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini API response:", data);
    
    // Parse the response as JSON
    try {
      // Extract the content from the response
      const content = data.candidates[0].content.parts[0].text;
      
      // Parse the JSON from the content
      const parsedResponse = JSON.parse(content);
      
      return {
        summary: parsedResponse.summary || "No summary available",
        sentiment: parsedResponse.sentiment || "neutral",
        keywords: parsedResponse.keywords || []
      };
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      return fallbackAnalysis(title, content);
    }
  } catch (error) {
    console.error("Error using Gemini service:", error);
    return fallbackAnalysis(title, content);
  }
}

// Function to analyze content with Perplexity
async function analyzeWithPerplexity(title: string, content: string, apiKey: string): Promise<LLMResponse> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: `You are a news analysis assistant. Analyze the following news article.
            Return a JSON object with the following fields:
            - summary: A concise 2-3 sentence summary of the key information
            - sentiment: Either "positive", "negative", or "neutral"
            - keywords: An array of 3-5 key terms from the article`
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nContent: ${content}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Perplexity API response:", data);
    
    // Parse the response as JSON
    try {
      // Extract the content from the response
      const content = data.choices[0].message.content;
      
      // Parse the JSON from the content
      const parsedResponse = JSON.parse(content);
      
      return {
        summary: parsedResponse.summary || "No summary available",
        sentiment: parsedResponse.sentiment || "neutral",
        keywords: parsedResponse.keywords || []
      };
    } catch (parseError) {
      console.error("Error parsing Perplexity response:", parseError);
      return fallbackAnalysis(title, content);
    }
  } catch (error) {
    console.error("Error using Perplexity service:", error);
    return fallbackAnalysis(title, content);
  }
}

// Fallback function to use when the LLM API is unavailable
function fallbackAnalysis(title: string, content: string): LLMResponse {
  // Import local analysis functions
  const { analyzeSentiment, extractKeywords } = require('./textAnalysis');
  
  // Create a basic summary from first 2 sentences or 150 chars
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  const summary = sentences.slice(0, 2).join(' ').trim() || content.substring(0, 150) + "...";
  
  return {
    summary,
    sentiment: analyzeSentiment(title + " " + content),
    keywords: extractKeywords(title + " " + content, 5)
  };
}

// Generate a news script using LLM
export async function generateScriptWithLLM(title: string, content: string): Promise<string> {
  try {
    const perplexityApiKey = import.meta.env.VITE_LLM_API_KEY;
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    // Determine which provider to use (prefer Gemini if available)
    const provider: LLMProvider = geminiApiKey ? "gemini" : "perplexity";
    const apiKey = provider === "gemini" ? geminiApiKey : perplexityApiKey;
    
    if (!apiKey) {
      console.warn("No LLM API key provided. Using fallback script generation.");
      const analysis = await analyzeLLM(title, content);
      return `${title}\n\n${analysis.summary}\n\nKey topics: ${analysis.keywords.join(', ')}`;
    }
    
    console.log(`Using ${provider} for script generation`);
    
    if (provider === "gemini") {
      return generateScriptWithGemini(title, content, apiKey);
    } else {
      return generateScriptWithPerplexity(title, content, apiKey);
    }
  } catch (error) {
    console.error("Error generating script with LLM:", error);
    // Fall back to local text analysis
    const { generateNewsScript } = require('./textAnalysis');
    const newsItem = { 
      title, 
      fullContent: content,
      description: content.substring(0, 150),
      sourceName: "NewsHub" 
    };
    return generateNewsScript(newsItem);
  }
}

// Function to generate script with Gemini
async function generateScriptWithGemini(title: string, content: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a news summary assistant. Create a concise summary of the following news article.
                Focus only on the key facts, with no commentary or analysis.
                Keep it under 200 words and focus on the most important information.
                
                Title: ${title}
                
                Content: ${content}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const scriptContent = data.candidates[0].content.parts[0].text;
    
    return `${title}\n\n${scriptContent}`;
  } catch (error) {
    console.error("Error generating script with Gemini:", error);
    throw error; // Let the parent function handle the fallback
  }
}

// Function to generate script with Perplexity
async function generateScriptWithPerplexity(title: string, content: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: `You are a news summary assistant. Create a concise summary of the following news article.
            Focus only on the key facts, with no commentary or analysis.
            Keep it under 200 words and focus on the most important information.`
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nContent: ${content}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const scriptContent = data.choices[0].message.content;
    
    return `${title}\n\n${scriptContent}`;
  } catch (error) {
    console.error("Error generating script with Perplexity:", error);
    throw error; // Let the parent function handle the fallback
  }
}
