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
    console.log(`Fetched article HTML with length: ${html.length}`);
    
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Try common article content selectors
    // This is a simplified approach - real-world implementations would use more sophisticated methods
    const contentSelectors = [
      "article", ".article", ".post-content", ".entry-content", 
      ".content", "#content", "main", ".main", ".story-body", ".article-body",
      "[data-component='text-block']", ".zn-body__paragraph", ".pf-content"
    ];
    
    let content = "";
    
    // Try each selector
    for (const selector of contentSelectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        // Combine text from all matching elements
        elements.forEach(element => {
          if (element.textContent) {
            content += element.textContent + " ";
          }
        });
        if (content) {
          console.log(`Found content with selector ${selector}, length: ${content.length}`);
          break;
        }
      }
    }
    
    // If we couldn't find content with selectors, try paragraphs
    if (!content) {
      console.log("No content found with selectors, trying paragraphs");
      const paragraphs = doc.querySelectorAll("p");
      if (paragraphs && paragraphs.length > 0) {
        paragraphs.forEach(p => {
          if (p.textContent) {
            content += p.textContent + " ";
          }
        });
      }
    }
    
    // If we still couldn't find content, take the body content
    if (!content) {
      console.log("No content found with paragraphs, using body content");
      const body = doc.querySelector("body");
      content = body ? body.textContent || "" : "";
    }
    
    // Clean the content
    content = content
      .replace(/\s+/g, " ")  // Replace multiple whitespace with single space
      .trim();               // Trim leading/trailing whitespace
    
    console.log(`Final cleaned content length: ${content.length}`);
    return content;
    
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

// Function to group similar news items based on analysis
export function groupSimilarNews(newsItems: any[]): any[] {
  if (!newsItems.length) return [];
  
  // Group by sentiment first
  const sentimentGroups: Record<string, any[]> = {
    positive: [],
    negative: [],
    neutral: []
  };
  
  // Add each news item to its sentiment group
  newsItems.forEach(item => {
    if (item.sentiment) {
      sentimentGroups[item.sentiment].push(item);
    }
  });
  
  // For each sentiment group, further group by keywords similarity
  const result: any[] = [];
  
  Object.keys(sentimentGroups).forEach(sentiment => {
    const itemsInSentiment = sentimentGroups[sentiment];
    
    // If there's only one item or none in this sentiment, just add it to result
    if (itemsInSentiment.length <= 1) {
      result.push(...itemsInSentiment);
      return;
    }
    
    // Keep track of which items we've grouped
    const processedIndices = new Set<number>();
    
    // Loop through each item to find similar ones
    for (let i = 0; i < itemsInSentiment.length; i++) {
      if (processedIndices.has(i)) continue;
      
      const currentItem = itemsInSentiment[i];
      const currentKeywords = new Set(currentItem.keywords || []);
      const similarItems = [currentItem];
      processedIndices.add(i);
      
      // Check other items for similarity
      for (let j = i + 1; j < itemsInSentiment.length; j++) {
        if (processedIndices.has(j)) continue;
        
        const compareItem = itemsInSentiment[j];
        const compareKeywords = new Set(compareItem.keywords || []);
        
        // Check for keyword overlap
        let overlap = 0;
        currentKeywords.forEach(keyword => {
          if (compareKeywords.has(keyword)) overlap++;
        });
        
        // If there's significant overlap (at least one keyword in common)
        if (overlap > 0) {
          similarItems.push(compareItem);
          processedIndices.add(j);
        }
      }
      
      // If we found similar items, group them
      if (similarItems.length > 1) {
        result.push({
          type: 'group',
          sentiment,
          items: similarItems,
          keywords: Array.from(new Set(similarItems.flatMap(item => item.keywords || []))),
          readingTimeSeconds: similarItems.reduce((total, item) => total + (item.readingTimeSeconds || 0), 0)
        });
      } else {
        // Otherwise, add the single item
        result.push(similarItems[0]);
      }
    }
  });
  
  return result;
}

// Generate a news script for a group of news items or a single item
export function generateNewsScript(newsItem: any): string {
  // Handle grouped news items
  if (newsItem.type === 'group') {
    const items = newsItem.items;
    const sentiment = newsItem.sentiment;
    const keywords = newsItem.keywords;
    
    // Create intro based on sentiment
    let intro = `A group of ${items.length} related stories with a ${sentiment} outlook. `;
    
    if (keywords && keywords.length) {
      intro += `The key themes include ${keywords.join(', ')}. `;
    }
    
    // Create body from each news item
    let body = `Summary of connected stories:\n\n`;
    
    items.forEach((item: any, index: number) => {
      body += `Story ${index + 1}: "${item.title}". `;
      if (item.sourceName) {
        body += `From ${item.sourceName}. `;
      }
      body += `\n`;
    });
    
    return `${intro}\n\n${body}`;
  } 
  // Handle single news item
  else {
    const title = newsItem.title;
    const fullContent = newsItem.fullContent || ""; 
    const description = newsItem.description;
    const keywords = newsItem.keywords || [];
    const sourceName = newsItem.sourceName;
    
    // Create a more complete summary from the full content if available
    let summary = "";
    
    if (fullContent && fullContent.length > description.length) {
      // Split the content into sentences
      const sentences = fullContent.match(/[^.!?]+[.!?]+/g) || [];
      
      // Take the first few sentences for the summary (up to 10)
      const summaryLength = Math.min(sentences.length, 10);
      summary = sentences.slice(0, summaryLength).join(' ').trim();
    } else {
      summary = description;
    }
    
    let script = `${title}\n\n`;
    
    if (sourceName) {
      script += `Source: ${sourceName}\n\n`;
    }
    
    // Add the main content summary
    script += `${summary}\n\n`;
    
    // Add keywords if available
    if (keywords && keywords.length) {
      script += `Key topics: ${keywords.join(', ')}`;
    }
    
    return script;
  }
}
