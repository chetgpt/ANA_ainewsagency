/**
 * This file contains utilities for interacting with LLM APIs
 */

// Interface for the LLM API response
interface LLMResponse {
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  keywords: string[];
}

// Interface for media identification response
interface MediaIdentificationResponse {
  hasImage: boolean;
  hasVideo: boolean;
  imageUrls?: string[];
  videoUrls?: string[];
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
    perplexityAvailable: !!perplexityApiKey
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

// Function to detect if content is not news using an LLM
export async function detectNonNewsWithLLM(title: string, content: string): Promise<boolean> {
  try {
    // Get API keys from environment variables or localStorage
    const perplexityApiKey = getApiKey('VITE_LLM_API_KEY');
    const geminiApiKey = getApiKey('VITE_GEMINI_API_KEY');
    
    // Determine which provider to use (prefer Gemini if available)
    const provider: LLMProvider = geminiApiKey ? "gemini" : "perplexity";
    const apiKey = provider === "gemini" ? geminiApiKey : perplexityApiKey;
    
    // If no API key is available, assume it is news content
    if (!apiKey) {
      console.warn("No LLM API key provided. Assuming this is news content.");
      return true;
    }
    
    console.log(`Using ${provider} for news content detection with API key length: ${apiKey.length}`);
    
    if (provider === "gemini") {
      return detectNonNewsWithGemini(title, content, apiKey);
    } else {
      return detectNonNewsWithPerplexity(title, content, apiKey);
    }
  } catch (error) {
    console.error("Error using LLM for content detection:", error);
    // Default to assuming it's news content in case of errors
    return true;
  }
}

// Function to analyze content with Gemini
async function analyzeWithGemini(title: string, content: string, apiKey: string): Promise<LLMResponse> {
  try {
    // Updated to use gemini-2.0-flash model
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

// Function to detect non-news content with Gemini
async function detectNonNewsWithGemini(title: string, content: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a news content analyzer.
                Given the following title and content, determine if this is a news article or not.
                Non-news content includes: advertisements, opinion pieces, editorials, podcasts, webinars, 
                quizzes, promotions, product reviews, entertainment listings, etc.
                
                Title: ${title}
                
                Content: ${content && content.length > 1000 ? content.substring(0, 1000) + "..." : content}
                
                Respond with just "true" if it is real news content or "false" if it is not news content.`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error details:", errorData);
      return true; // Default to true (is news) on error
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
    
    // Return true if it's news content (returned "true")
    return result === "true";
  } catch (error) {
    console.error("Error detecting non-news with Gemini:", error);
    return true; // Default to true (is news) on error
  }
}

// Function to detect non-news content with Perplexity
async function detectNonNewsWithPerplexity(title: string, content: string, apiKey: string): Promise<boolean> {
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
            content: `You are a news content analyzer. Given a title and content, 
            determine if this is a news article or not. 
            Non-news content includes: advertisements, opinion pieces, editorials, 
            podcasts, webinars, quizzes, promotions, product reviews, entertainment listings, etc.
            Respond with just "true" if it is real news content or "false" if it is not news content.`
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nContent: ${content && content.length > 1000 ? content.substring(0, 1000) + "..." : content}`
          }
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content.trim().toLowerCase();
    
    // Return true if it's news content (returned "true")
    return result === "true";
  } catch (error) {
    console.error("Error detecting non-news with Perplexity:", error);
    return true; // Default to true (is news) on error
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

// Function to identify media content with LLM
export async function identifyMediaWithLLM(title: string, content: string): Promise<MediaIdentificationResponse> {
  try {
    // Get API keys from environment variables or localStorage
    const perplexityApiKey = getApiKey('VITE_LLM_API_KEY');
    const geminiApiKey = getApiKey('VITE_GEMINI_API_KEY');
    
    // Determine which provider to use (prefer Gemini if available)
    const provider: LLMProvider = geminiApiKey ? "gemini" : "perplexity";
    const apiKey = provider === "gemini" ? geminiApiKey : perplexityApiKey;
    
    // If no API key is available, return default response
    if (!apiKey) {
      console.warn("No LLM API key provided for media identification. Using default response.");
      return { hasImage: false, hasVideo: false };
    }
    
    console.log(`Using ${provider} for media identification with API key length: ${apiKey.length}`);
    
    if (provider === "gemini") {
      return identifyMediaWithGemini(title, content, apiKey);
    } else {
      return identifyMediaWithPerplexity(title, content, apiKey);
    }
  } catch (error) {
    console.error("Error using LLM for media identification:", error);
    return { hasImage: false, hasVideo: false };
  }
}

// Function to identify media with Gemini
async function identifyMediaWithGemini(title: string, content: string, apiKey: string): Promise<MediaIdentificationResponse> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a media content analyzer.
                Based on the following article title and content, determine if the article likely contains 
                or refers to images or videos that would be important for understanding the content.
                
                Title: ${title}
                
                Content: ${content && content.length > 1000 ? content.substring(0, 1000) + "..." : content}
                
                Return a JSON object with these fields:
                - hasImage: boolean (true if article likely has or needs images)
                - hasVideo: boolean (true if article likely has or needs videos)
                - imageUrls: array of strings with potential image URLs in the content (can be empty)
                - videoUrls: array of strings with potential video URLs in the content (can be empty)
                
                Respond ONLY with valid JSON.`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error details:", errorData);
      return { hasImage: false, hasVideo: false };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error("Unexpected response format from Gemini API");
    }
    
    try {
      // Parse the JSON from the content
      const result = JSON.parse(content);
      return {
        hasImage: Boolean(result.hasImage),
        hasVideo: Boolean(result.hasVideo),
        imageUrls: result.imageUrls,
        videoUrls: result.videoUrls
      };
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      return { hasImage: false, hasVideo: false };
    }
  } catch (error) {
    console.error("Error identifying media with Gemini:", error);
    return { hasImage: false, hasVideo: false };
  }
}

// Function to identify media with Perplexity
async function identifyMediaWithPerplexity(title: string, content: string, apiKey: string): Promise<MediaIdentificationResponse> {
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
            content: `You are a media content analyzer.
            Based on the article title and content, determine if the article likely contains 
            or refers to images or videos that would be important for understanding the content.
            Return a JSON object with these fields:
            - hasImage: boolean (true if article likely has or needs images)
            - hasVideo: boolean (true if article likely has or needs videos)
            - imageUrls: array of strings with potential image URLs in the content (can be empty)
            - videoUrls: array of strings with potential video URLs in the content (can be empty)
            Respond ONLY with valid JSON.`
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nContent: ${content && content.length > 1000 ? content.substring(0, 1000) + "..." : content}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices[0].message.content;
    
    try {
      const result = JSON.parse(responseContent);
      return {
        hasImage: Boolean(result.hasImage),
        hasVideo: Boolean(result.hasVideo),
        imageUrls: result.imageUrls,
        videoUrls: result.videoUrls
      };
    } catch (parseError) {
      console.error("Error parsing Perplexity response:", parseError);
      return { hasImage: false, hasVideo: false };
    }
  } catch (error) {
    console.error("Error identifying media with Perplexity:", error);
    return { hasImage: false, hasVideo: false };
  }
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
    // Updated Gemini API endpoint to use the latest version
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
                text: `You are a news summary assistant. Create a concise summary of the following news article.
                Use casual, everyday language that's easy to understand for the average reader.
                Avoid jargon, technical terms, and complex sentences.
                Explain any complex concepts in simple terms as if you're explaining to a friend.
                Keep it conversational and use a friendly tone.
                Focus on the key facts, with no commentary or analysis.
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
            content: `You are a news summary assistant. Create a concise summary of the following news article.
            Use casual, everyday language that's easy to understand for the average reader.
            Avoid jargon, technical terms, and complex sentences.
            Explain any complex concepts in simple terms as if you're explaining to a friend.
            Keep it conversational and use a friendly tone.
            Focus on the key facts, with no commentary or analysis.
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
