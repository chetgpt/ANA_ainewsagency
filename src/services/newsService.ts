
import { 
  analyzeSentiment, 
  extractKeywords, 
  calculateReadingTime, 
  fetchArticleContent,
  generateNewsScript 
} from "@/utils/textAnalysis";
import { useToast } from "@/hooks/use-toast";

export async function fetchNewsArticle() {
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
  
  // Get all items from the feed for debugging
  const allItems = xmlDoc.querySelectorAll("item");
  console.log(`Found ${allItems.length} items in the RSS feed`);
  
  // Get the first item from the feed
  const firstItem = xmlDoc.querySelector("item");
  
  if (!firstItem) {
    throw new Error("No items found in RSS feed");
  }
  
  // Extract the item data
  const title = firstItem.querySelector("title")?.textContent || "No title";
  const description = firstItem.querySelector("description")?.textContent || "";
  const pubDate = firstItem.querySelector("pubDate")?.textContent || new Date().toUTCString();
  const link = firstItem.querySelector("link")?.textContent || "#";
  
  console.log("Extracted news item data:", { 
    title, 
    description: description.substring(0, 100) + "...", 
    pubDate, 
    link 
  });
  
  return { title, description, pubDate, link };
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
