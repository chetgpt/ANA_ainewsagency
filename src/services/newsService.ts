
import { 
  analyzeSentiment, 
  extractKeywords, 
  calculateReadingTime, 
  fetchArticleContent,
  generateNewsScript 
} from "@/utils/textAnalysis";

// Store a queue of unprocessed news items
let newsQueue: Array<{
  title: string;
  description: string;
  pubDate: string;
  link: string;
}> = [];

// Track the items we've already processed to avoid duplicates
const processedArticleLinks = new Set<string>();

// Fetch more items from the feed than before
const INITIAL_FETCH_COUNT = 5;

export async function fetchNewsArticle() {
  // If we have items in the queue, return the next one
  if (newsQueue.length > 0) {
    return newsQueue.shift()!;
  }
  
  // Otherwise, fetch fresh items from the RSS feed
  // Use ABC News RSS feed with a CORS proxy
  const corsProxy = "https://api.allorigins.win/raw?url=";
  const rssUrl = "https://abcnews.go.com/abcnews/topstories";
  
  const response = await fetch(`${corsProxy}${encodeURIComponent(rssUrl)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.status}`);
  }
  
  const data = await response.text();
  console.log("RSS data fetched successfully with length:", data.length);
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data, "text/xml");
  
  // Get all items from the feed
  const allItems = xmlDoc.querySelectorAll("item");
  console.log(`Found ${allItems.length} items in the RSS feed`);
  
  // Process items and add to queue (skip already processed ones)
  allItems.forEach((item) => {
    const title = item.querySelector("title")?.textContent || "No title";
    const description = item.querySelector("description")?.textContent || "";
    const pubDate = item.querySelector("pubDate")?.textContent || new Date().toUTCString();
    const link = item.querySelector("link")?.textContent || "#";
    
    // Skip if we've already processed this article
    if (!processedArticleLinks.has(link)) {
      processedArticleLinks.add(link);
      newsQueue.push({ title, description, pubDate, link });
    }
  });
  
  // If queue is empty after processing (all items were duplicates), throw error
  if (newsQueue.length === 0) {
    throw new Error("No new items found in RSS feed");
  }
  
  // Return the first item from the queue
  return newsQueue.shift()!;
}

export async function processNewsArticle(article: { 
  title: string; 
  description: string; 
  pubDate: string; 
  link: string; 
}) {
  // Fetch full article content
  console.log("Fetching full article content from link:", article.link);
  let articleContent = "";
  
  try {
    articleContent = await fetchArticleContent(article.link);
    console.log("Fetched article content length:", articleContent.length);
  } catch (err) {
    console.error("Error fetching article content:", err);
    articleContent = article.description; // Fallback to description
  }
  
  // Use either full article content or description for analysis
  const contentToAnalyze = articleContent || article.description;
  const combinedText = article.title + " " + contentToAnalyze;
  
  // Perform simple analysis
  const sentiment = analyzeSentiment(combinedText);
  const keywords = extractKeywords(combinedText, 3);
  const readingTimeSeconds = calculateReadingTime(contentToAnalyze);
  
  console.log("Analysis results:", { sentiment, keywords, readingTimeSeconds });
  
  // Create a news item object with the required information
  const newsItem = {
    title: article.title,
    description: article.description,
    fullContent: articleContent,
    sentiment,
    keywords,
    readingTimeSeconds,
    pubDate: article.pubDate,
    link: article.link,
    sourceName: "ABC News",
  };
  
  // Generate a script for the news item
  const newsScript = await generateNewsScript(newsItem);
  console.log("Generated script with length:", newsScript.length);
  
  return {
    title: newsItem.title,
    content: newsScript,
    type: 'single',
    summary: {
      description: newsItem.description,
      sentiment: newsItem.sentiment,
      keywords: newsItem.keywords,
      readingTimeSeconds: newsItem.readingTimeSeconds,
      pubDate: newsItem.pubDate,
      sourceName: newsItem.sourceName
    }
  };
}

// Function to preload multiple news items
export async function preloadMultipleNews(count: number = 3) {
  const results = [];
  
  try {
    // Fetch multiple news articles in parallel
    for (let i = 0; i < count; i++) {
      // Stop if we run out of news in the queue
      if (newsQueue.length === 0) {
        // Refill queue if empty
        try {
          await fetchNewsArticle();
        } catch (error) {
          console.error("Error refilling news queue:", error);
          break;
        }
      }
      
      // Process the next item in the queue
      if (newsQueue.length > 0) {
        const article = newsQueue.shift()!;
        results.push(article);
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error preloading multiple news:", error);
    return [];
  }
}

export function getSampleNewsData() {
  const sampleNewsItem = {
    title: "Breaking news from ABC News",
    description: "This is a sample news article from ABC News to demonstrate the functionality when the actual feed cannot be fetched.",
    fullContent: "This is a sample news article from ABC News to demonstrate the functionality when the actual feed cannot be fetched. The content is shown here as a placeholder. In a real scenario, this would contain the full article text that would be analyzed and summarized.",
    sentiment: "neutral" as const,
    keywords: ["ABC News", "sample", "news"],
    readingTimeSeconds: 120,
    pubDate: new Date().toUTCString(),
    link: "#",
    sourceName: "ABC News",
  };
  
  return sampleNewsItem;
}
