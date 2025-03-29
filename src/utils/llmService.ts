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

// Function to get API key from environment or localStorage
function getApiKey(keyName: string): string | undefined {
  // Try to get from environment first (for Vite, use import.meta.env)
  const envKey = import.meta.env[keyName];
  
  // If not found in environment, try localStorage
  const localKey = localStorage.getItem(keyName) || undefined;
  
  const apiKey = envKey || localKey;
  
  console.log(`Getting ${keyName}:`, apiKey ? `Found (length: ${apiKey.length})` : "Not found");
  console.log(`Source: ${envKey ? "Environment variable" : localKey ? "LocalStorage" : "Not found"}`);
  
  return apiKey;
}

// Check API availability and log results
export function checkApiAvailability(): { geminiAvailable: boolean, perplexityAvailable: boolean } {
  const geminiApiKey = getApiKey('VITE_GEMINI_API_KEY');
  const perplexityApiKey = getApiKey('VITE_LLM_API_KEY');
  
  console.log("API availability check:");
  console.log("- Gemini API:", geminiApiKey ? "Available" : "Not available");
  console.log("- Perplexity API:", perplexityApiKey ? "Available" : "Not available");
  
  return {
    geminiAvailable: !!geminiApiKey,
    perplexityAvailable: !!geminiApiKey
  };
}

// Function to analyze text using an LLM API
export async function analyzeLLM(title: string, content: string): Promise<LLMResponse> {
  try {
    // Get API keys from environment variables or localStorage
    const perplexityApiKey = getApiKey('VITE_LLM_API_KEY');
    const geminiApiKey = getApiKey('VITE_GEMINI_API_KEY');
    
    // Determine which provider to use (prefer Gemini if available)
    const provider: LLMProvider = geminiApiKey ? "gemini" : "perplexity";
    const apiKey = provider === "gemini" ? geminiApiKey : perplexityApiKey;
    
    // If no API key is available, use a fallback message
    if (!apiKey) {
      console.warn("No LLM API key provided. Using fallback analysis.");
      return fallbackAnalysis(title, content);
    }
    
    console.log(`Using ${provider} for news analysis with API key length: ${apiKey.length}`);
    
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
    // Updated to use gemini-2.0-flash model with web search instructions
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a news analysis assistant with web search capabilities. 
                Analyze the following news article and use web search to find additional context about:
                1. What caused the events described in the news
                2. What are the potential consequences of these events
                
                Return a JSON object with the following fields:
                - summary: A concise 3-4 sentence summary that includes the cause and potential consequences of the news
                - sentiment: Either "positive", "negative", or "neutral"
                - keywords: An array of 3-5 key terms from the article
                
                Title: ${title}
                
                Content: ${content}
                
                Use web search to find the most accurate and up-to-date information about this topic.
                Respond ONLY with valid JSON.`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
        tools: [{
          functionDeclarations: [{
            name: "search",
            description: "Search the web for real-time information",
            parameters: {
              type: "OBJECT",
              properties: {
                query: {
                  type: "STRING",
                  description: "The search query"
                }
              },
              required: ["query"]
            }
          }]
        }],
        toolConfig: {
          functionCallingConfig: {
            mode: "AUTO"
          }
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error details:", errorData);
      throw new Error(`Gemini API error: ${response.status}. Message: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log("Gemini API response:", data);
    
    // Parse the response as JSON
    try {
      // Extract the content from the response
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        throw new Error("Unexpected response format from Gemini API");
      }
      
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
            content: `You are a news analysis assistant with web search capabilities. 
            Analyze the following news article and provide context about:
            1. What caused the events described in the news
            2. What are the potential consequences of these events
            
            Return a JSON object with the following fields:
            - summary: A concise 3-4 sentence summary that includes the cause and potential consequences of the news
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
  // Create a basic summary from first 2 sentences or 150 chars
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  const summary = sentences.slice(0, 2).join(' ').trim() || content.substring(0, 150) + "...";
  
  // Simple sentiment analysis
  const positiveWords = ["good", "great", "excellent", "amazing", "wonderful", "fantastic", "positive", "success"];
  const negativeWords = ["bad", "terrible", "horrible", "awful", "poor", "negative", "fail", "failure"];
  
  const lcContent = (title + " " + content).toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lcContent.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lcContent.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  let sentiment: "positive" | "negative" | "neutral" = "neutral";
  if (positiveCount > negativeCount) sentiment = "positive";
  else if (negativeCount > positiveCount) sentiment = "negative";
  
  // Extract keywords (basic implementation)
  const words = lcContent.replace(/[^\w\s]/g, '').split(/\s+/);
  const wordFreq: Record<string, number> = {};
  const stopWords = ["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "about", "as"];
  
  words.forEach(word => {
    if (word.length > 3 && !stopWords.includes(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  const keywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => entry[0]);
  
  return {
    summary,
    sentiment,
    keywords
  };
}

// Generate a news script using LLM
export async function generateScriptWithLLM(title: string, content: string): Promise<string> {
  try {
    const perplexityApiKey = getApiKey('VITE_LLM_API_KEY');
    const geminiApiKey = getApiKey('VITE_GEMINI_API_KEY');
    
    // Determine which provider to use (prefer Gemini if available)
    const provider: LLMProvider = geminiApiKey ? "gemini" : "perplexity";
    const apiKey = provider === "gemini" ? geminiApiKey : perplexityApiKey;
    
    if (!apiKey) {
      console.warn("No LLM API key provided. Using fallback script generation.");
      const analysis = await analyzeLLM(title, content);
      return `${title}\n\n${analysis.summary}\n\nKey topics: ${analysis.keywords.join(', ')}`;
    }
    
    console.log(`Using ${provider} for script generation with API key length: ${apiKey.length}`);
    
    if (provider === "gemini") {
      return generateScriptWithGemini(title, content, apiKey);
    } else {
      return generateScriptWithPerplexity(title, content, apiKey);
    }
  } catch (error) {
    console.error("Error generating script with LLM:", error);
    
    // Fallback to simple text analysis
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const summary = sentences.slice(0, 3).join(' ').trim() || content.substring(0, 200) + "...";
    
    const lcContent = (title + " " + content).toLowerCase();
    const words = lcContent.replace(/[^\w\s]/g, '').split(/\s+/);
    const wordFreq: Record<string, number> = {};
    const stopWords = ["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "about", "as"];
    
    words.forEach(word => {
      if (word.length > 3 && !stopWords.includes(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    const keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
    
    return `${title}\n\n${summary}\n\nKey topics: ${keywords.join(', ')}`;
  }
}

// Function to generate script with Gemini
async function generateScriptWithGemini(title: string, content: string, apiKey: string): Promise<string> {
  try {
    // Updated to include web search for additional context
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a news summary assistant with web search capabilities. Create a comprehensive summary of the following news article.
                Use casual, everyday language that's easy to understand for the average reader.
                Avoid jargon, technical terms, and complex sentences.
                Explain any complex concepts in simple terms as if you're explaining to a friend.
                Keep it conversational and use a friendly tone.
                Focus on the key facts, with no commentary or analysis.
                
                MOST IMPORTANTLY:
                1. Use web search to find out what CAUSED these events
                2. Explain what the CONSEQUENCES might be
                3. Add this contextual information to your summary
                
                Keep it under 250 words and focus on the most important information.
                
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
        tools: [{
          functionDeclarations: [{
            name: "search",
            description: "Search the web for real-time information",
            parameters: {
              type: "OBJECT",
              properties: {
                query: {
                  type: "STRING",
                  description: "The search query"
                }
              },
              required: ["query"]
            }
          }]
        }],
        toolConfig: {
          functionCallingConfig: {
            mode: "AUTO"
          }
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error details:", errorData);
      throw new Error(`Gemini API error: ${response.status}. Message: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const scriptContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!scriptContent) {
      throw new Error("Unexpected response format from Gemini API");
    }
    
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
            content: `You are a news summary assistant with web search capabilities. Create a comprehensive summary of the following news article.
            Use casual, everyday language that's easy to understand for the average reader.
            Avoid jargon, technical terms, and complex sentences.
            Explain any complex concepts in simple terms as if you're explaining to a friend.
            Keep it conversational and use a friendly tone.
            Focus on the key facts, with no commentary or analysis.
            
            MOST IMPORTANTLY:
            1. Use web search to find out what CAUSED these events
            2. Explain what the CONSEQUENCES might be
            3. Add this contextual information to your summary
            
            Keep it under 250 words and focus on the most important information.`
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
