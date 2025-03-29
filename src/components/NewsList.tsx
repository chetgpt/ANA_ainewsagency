
import { useState, useEffect } from "react";
import NewsItem, { NewsItemProps } from "./NewsItem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { analyzeSentiment, extractKeywords, calculateReadingTime, fetchArticleContent } from "@/utils/textAnalysis";
import { analyzeLLM } from "@/utils/llmService";
import { useToast } from "@/hooks/use-toast";
import NewsSourceSelector, { NewsSource, NEWS_SOURCES } from "./NewsSourceSelector";

interface NewsListProps {
  feedUrl?: string;
}

interface CachedNewsItem extends NewsItemProps {
  id: string; // Unique identifier for caching
  cached: boolean; // Flag to indicate if this item is from cache
  summary?: string | null; // LLM-generated summary
  llmSentiment?: "positive" | "negative" | "neutral" | null; // LLM-analyzed sentiment
  llmKeywords?: string[]; // LLM-extracted keywords
  isSummarized: boolean; // Flag to indicate if this item has been summarized
}

const NewsList = ({ feedUrl }: NewsListProps) => {
  const [currentSource, setCurrentSource] = useState<NewsSource>(
    NEWS_SOURCES[0] // Default to first source
  );
  const [newsItems, setNewsItems] = useState<CachedNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const { toast } = useToast();

  // Use the provided feedUrl or get it from currentSource
  const activeFeedUrl = feedUrl || currentSource.feedUrl;

  // Generate a unique ID for a news item based on its content
  const generateNewsItemId = (title: string, pubDate: string, link: string): string => {
    return `${title}-${pubDate}-${link}`.replace(/[^a-zA-Z0-9]/g, '');
  };

  // Load cached news items from localStorage for the current feed
  const loadCachedNews = () => {
    try {
      const cachedData = localStorage.getItem(`news-cache-${activeFeedUrl}`);
      if (cachedData) {
        const { items, timestamp } = JSON.parse(cachedData);
        setNewsItems(items);
        setLastUpdated(new Date(timestamp));
        setLoading(false);
        toast({
          title: "Loaded from cache",
          description: `Showing cached news from ${new Date(timestamp).toLocaleString()}`,
        });
        return true;
      }
    } catch (err) {
      console.error("Error loading cached news:", err);
    }
    return false;
  };

  // Save news items to localStorage for the current feed
  const saveCachedNews = (items: CachedNewsItem[]) => {
    try {
      const cacheData = {
        items,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`news-cache-${activeFeedUrl}`, JSON.stringify(cacheData));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error saving news to cache:", err);
    }
  };

  // Force refresh news from the source
  const refreshNews = () => {
    setLoading(true);
    fetchRssFeed(true);
    toast({
      title: "Refreshing news",
      description: "Fetching the latest updates...",
    });
  };

  // Handle changing the news source
  const handleSourceChange = (source: NewsSource) => {
    setCurrentSource(source);
    setLoading(true);
    setNewsItems([]);
    // After setting the new source, the useEffect will trigger
    // and load the cached news or fetch new news for this source
  };

  // Clear all news cache
  const clearCache = () => {
    try {
      // Clear specific feed cache
      localStorage.removeItem(`news-cache-${activeFeedUrl}`);
      
      // Optionally, clear ALL feeds cache
      for (const source of NEWS_SOURCES) {
        localStorage.removeItem(`news-cache-${source.feedUrl}`);
      }
      
      setNewsItems([]);
      setLastUpdated(null);
      setLoading(true);
      
      toast({
        title: "Cache cleared",
        description: "All cached news has been removed.",
      });
      
      // Fetch fresh news
      fetchRssFeed(true);
    } catch (err) {
      console.error("Error clearing cache:", err);
      toast({
        title: "Error",
        description: "Failed to clear cache.",
        variant: "destructive",
      });
    }
  };

  // Function to update a specific news item
  const updateNewsItem = (updatedItem: CachedNewsItem) => {
    setNewsItems(currentItems => {
      const newItems = currentItems.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      );
      // Save updated items to cache
      saveCachedNews(newItems);
      return newItems;
    });
  };

  // Background summarization function
  const summarizeItemInBackground = async (itemId: string, currentItems: CachedNewsItem[]) => {
    const item = currentItems.find(i => i.id === itemId);
    if (!item) return;

    try {
      setSummarizing(true);
      const fullContent = await fetchArticleContent(item.link);
      const contentToAnalyze = fullContent || item.description;
      
      // Try to use LLM for analysis
      try {
        const llmResult = await analyzeLLM(item.title, contentToAnalyze);
        
        const updatedItem: CachedNewsItem = {
          ...item,
          summary: llmResult.summary,
          llmSentiment: llmResult.sentiment,
          llmKeywords: llmResult.keywords,
          isSummarized: true,
          readingTimeSeconds: fullContent ? calculateReadingTime(fullContent) : item.readingTimeSeconds,
        };
        
        updateNewsItem(updatedItem);
      } catch (llmError) {
        console.warn("LLM analysis failed, falling back to local analysis:", llmError);
        
        // Fall back to local analysis
        const combinedText = item.title + " " + contentToAnalyze;
        const sentiment = analyzeSentiment(combinedText);
        const keywords = extractKeywords(combinedText, 3);
        
        const updatedItem: CachedNewsItem = {
          ...item,
          sentiment: sentiment,
          keywords: keywords,
          isSummarized: true,
          readingTimeSeconds: fullContent ? calculateReadingTime(fullContent) : item.readingTimeSeconds,
        };
        
        updateNewsItem(updatedItem);
      }
    } catch (error) {
      console.error(`Error summarizing item ${itemId}:`, error);
      // Mark item as failed summarization
      const updatedItem = { 
        ...item, 
        isSummarized: true, 
        summary: "Could not summarize content."
      };
      updateNewsItem(updatedItem);
    } finally {
      setSummarizing(false);
    }
  };

  // Process summarization queue with limited concurrency
  const processSummarizationQueue = async (itemIds: string[], currentItems: CachedNewsItem[]) => {
    const MAX_CONCURRENT = 2; // Process up to 2 items at once
    
    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < itemIds.length; i += MAX_CONCURRENT) {
      const batch = itemIds.slice(i, i + MAX_CONCURRENT);
      await Promise.all(
        batch.map(itemId => summarizeItemInBackground(itemId, currentItems))
      );
    }
  };

  const fetchRssFeed = async (forceRefresh = false) => {
    // Try to load from cache first, unless force refresh is requested
    if (!forceRefresh && loadCachedNews()) {
      // Check if there are any items that haven't been summarized yet
      const itemsToSummarize = newsItems
        .filter(item => !item.isSummarized)
        .map(item => item.id);
        
      if (itemsToSummarize.length > 0) {
        processSummarizationQueue(itemsToSummarize, newsItems);
      }
      return;
    }

    try {
      setLoading(true);
      
      // Use a CORS proxy to fetch the RSS feed
      const corsProxy = "https://api.allorigins.win/raw?url=";
      const response = await fetch(`${corsProxy}${encodeURIComponent(activeFeedUrl)}?_=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status}`);
      }
      
      const data = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, "text/xml");
      
      const items = xmlDoc.querySelectorAll("item");
      const newParsedItems: CachedNewsItem[] = [];
      const itemsToSummarize: string[] = []; // Store IDs of new items
      
      // Create a map for fast lookup of existing items
      const currentItemsMap = new Map(newsItems.map(item => [item.id, item]));
      
      items.forEach((item) => {
        // Find image in media:content, enclosure, or description
        let imageUrl = "";
        const mediaContent = item.querySelector("media\\:content, content");
        const enclosure = item.querySelector("enclosure");
        
        if (mediaContent && mediaContent.getAttribute("url")) {
          imageUrl = mediaContent.getAttribute("url") || "";
        } else if (enclosure && enclosure.getAttribute("url") && enclosure.getAttribute("type")?.startsWith("image/")) {
          imageUrl = enclosure.getAttribute("url") || "";
        } else {
          // Try to extract image from description
          const description = item.querySelector("description")?.textContent || "";
          const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
        }
        
        const title = item.querySelector("title")?.textContent || "No title";
        const pubDate = item.querySelector("pubDate")?.textContent || new Date().toUTCString();
        const link = item.querySelector("link")?.textContent || "#";
        const description = item.querySelector("description")?.textContent || "";
        
        // Generate a unique ID for this news item
        const id = generateNewsItemId(title, pubDate, link);
        
        // Check if we already have this item in our current newsItems state
        const existingItem = currentItemsMap.get(id);
        
        if (existingItem && !forceRefresh) {
          // We already have this item, reuse it
          newParsedItems.push(existingItem);
        } else {
          // This is a new item or we're forcing refresh, do basic analysis immediately
          // but defer LLM processing to background
          const combinedText = title + " " + description;
          const sentiment = analyzeSentiment(combinedText);
          const keywords = extractKeywords(combinedText, 3);
          const readingTimeSeconds = calculateReadingTime(description);
          
          const newItem: CachedNewsItem = {
            id,
            title,
            description,
            pubDate,
            link,
            imageUrl: imageUrl || undefined,
            sourceName: currentSource.name,
            sentiment,
            keywords,
            readingTimeSeconds,
            summary: null,
            llmSentiment: null,
            llmKeywords: [],
            isSummarized: false,
            cached: false
          };
          
          newParsedItems.push(newItem);
          itemsToSummarize.push(id);
        }
      });
      
      // Sort items by publication date (newest first)
      newParsedItems.sort((a, b) => {
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      });
      
      // Update state and save to cache
      setNewsItems(newParsedItems);
      saveCachedNews(newParsedItems);
      setLoading(false);
      setError("");
      
      // Start background summarization for new items
      if (itemsToSummarize.length > 0) {
        toast({
          title: "Processing content",
          description: `Generating summaries for ${itemsToSummarize.length} new articles...`,
        });
        
        processSummarizationQueue(itemsToSummarize, newParsedItems);
      }
      
      if (forceRefresh) {
        toast({
          title: "News updated",
          description: "Latest news has been loaded.",
        });
      }
    } catch (err) {
      console.error("Error fetching RSS feed:", err);
      setError("Failed to load news. Please try again later.");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Whenever the activeFeedUrl changes, try to load from cache or fetch fresh data
    fetchRssFeed();
  }, [activeFeedUrl]); // This will trigger when either the feedUrl prop or currentSource changes

  // Define a function to sort news items
  const sortedNewsItems = [...newsItems].sort((a, b) => {
    // First, prioritize summarized items
    if (a.isSummarized && !b.isSummarized) return -1;
    if (!a.isSummarized && b.isSummarized) return 1;
    
    // Then sort by date (newest first)
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading news...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (newsItems.length === 0) {
    return (
      <Alert className="my-4">
        <AlertDescription>No news articles found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          {/* Only show the source selector if no feedUrl is provided as a prop */}
          {!feedUrl && (
            <NewsSourceSelector 
              currentSource={currentSource} 
              onSourceChange={handleSourceChange} 
            />
          )}
          {lastUpdated && (
            <span className="text-sm text-gray-500 ml-4">
              Last updated: {lastUpdated.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={clearCache}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Clear Cache
          </button>
          <button
            onClick={refreshNews}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
            disabled={loading || summarizing}
          >
            <Loader2 className={`h-3 w-3 mr-1 ${(loading || summarizing) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {summarizing && (
        <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-md mb-4 flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Generating summaries in the background...</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
        {sortedNewsItems.map((item, index) => (
          <NewsItem 
            key={item.id || index} 
            {...item} 
            isSummarizing={!item.isSummarized}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsList;
