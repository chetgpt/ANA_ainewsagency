/**
 * Text analysis utilities for news content
 */

// Analyzes sentiment of text (very basic implementation)
export function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const positiveWords = [
    "good", "great", "excellent", "amazing", "wonderful", "fantastic", 
    "positive", "success", "successful", "win", "happy", "glad", "celebrate",
    "improve", "improvement", "benefit", "achieve", "achievement", "progress"
  ];
  
  const negativeWords = [
    "bad", "terrible", "horrible", "awful", "poor", "negative", "fail", 
    "failure", "lose", "lost", "sad", "unfortunate", "tragic", "crisis",
    "problem", "issue", "decline", "decrease", "worst", "disaster", "controversy"
  ];
  
  // Convert to lowercase for case-insensitive matching
  const lowercaseText = text.toLowerCase();
  
  // Count positive and negative word occurrences
  const positiveCount = positiveWords.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowercaseText.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
  
  const negativeCount = negativeWords.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowercaseText.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
  
  // Determine sentiment based on count
  if (positiveCount > negativeCount) {
    return "positive";
  } else if (negativeCount > positiveCount) {
    return "negative";
  } else {
    return "neutral";
  }
}

// Extracts keywords from text (simple implementation based on word frequency)
export function extractKeywords(text: string, limit: number = 5): string[] {
  if (!text) return [];
  
  // Convert to lowercase and remove punctuation
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split text into words
  const words = cleanText.split(/\s+/);
  
  // Filter out common stop words
  const stopWords = [
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", 
    "any", "are", "as", "at", "be", "because", "been", "before", "being", "below", 
    "between", "both", "but", "by", "could", "did", "do", "does", "doing", "down", 
    "during", "each", "few", "for", "from", "further", "had", "has", "have", "having", 
    "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", 
    "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", 
    "into", "is", "it", "it's", "its", "itself", "let's", "me", "more", "most", "my", 
    "myself", "nor", "of", "on", "once", "only", "or", "other", "ought", "our", "ours", 
    "ourselves", "out", "over", "own", "same", "she", "she'd", "she'll", "she's", 
    "should", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", 
    "them", "themselves", "then", "there", "there's", "these", "they", "they'd", 
    "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", 
    "until", "up", "very", "was", "we", "we'd", "we'll", "we're", "we've", "were", 
    "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", 
    "who's", "whom", "why", "why's", "with", "would", "you", "you'd", "you'll", 
    "you're", "you've", "your", "yours", "yourself", "yourselves"
  ];
  
  const filteredWords = words.filter(word => 
    word.length > 2 && !stopWords.includes(word)
  );
  
  // Count word frequency
  const wordCounts: Record<string, number> = {};
  filteredWords.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Sort by frequency and get top keywords
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(entry => entry[0]);
}

// Calculate approximate reading time in seconds
export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200; // Average reading speed
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute * 60);
}

// Function to fetch and parse full article content
export async function fetchArticleContent(url: string): Promise<string> {
  try {
    // Use a CORS proxy to fetch the article
    const corsProxy = "https://api.allorigins.win/raw?url=";
    const response = await fetch(`${corsProxy}${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Try common article content selectors
    // This is a simplified approach - real-world implementations would use more sophisticated methods
    const contentSelectors = [
      "article", ".article", ".post-content", ".entry-content", 
      ".content", "#content", "main", ".main"
    ];
    
    let content = "";
    
    // Try each selector
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        content = element.textContent || "";
        break;
      }
    }
    
    // If we couldn't find content with selectors, take the body content
    if (!content) {
      const body = doc.querySelector("body");
      content = body ? body.textContent || "" : "";
    }
    
    // Clean the content
    return content
      .replace(/\s+/g, " ")  // Replace multiple whitespace with single space
      .trim();               // Trim leading/trailing whitespace
    
  } catch (error) {
    console.error("Error fetching article content:", error);
    return ""; // Return empty string on error
  }
}

// Function to fully analyze an article
export async function fullAnalyzeArticle(article: {
  title: string;
  description: string;
  link: string;
}): Promise<{
  fullContent: string;
  sentiment: "positive" | "negative" | "neutral";
  keywords: string[];
  readingTimeSeconds: number;
}> {
  try {
    const fullContent = await fetchArticleContent(article.link);
    
    if (!fullContent) {
      throw new Error("Could not retrieve article content");
    }
    
    // Analyze the full content
    const combinedText = article.title + " " + fullContent;
    const sentiment = analyzeSentiment(combinedText);
    const keywords = extractKeywords(combinedText, 3);
    const readingTimeSeconds = calculateReadingTime(fullContent);
    
    return {
      fullContent,
      sentiment,
      keywords,
      readingTimeSeconds
    };
  } catch (error) {
    console.error("Error in full article analysis:", error);
    throw error;
  }
}
