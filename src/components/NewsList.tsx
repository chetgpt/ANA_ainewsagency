
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
  onStatusUpdate?: (summarizingCount: number, lastUpdated: Date | null) => void;
}

interface CachedNewsItem extends NewsItemProps {
  id: string; // Unique identifier for caching
  cached: boolean; // Flag to indicate if this item is from cache
  summary?: string | null; // LLM-generated summary
  llmSentiment?: "positive" | "negative" | "neutral" | null; // LLM-analyzed sentiment
  llmKeywords?: string[]; // LLM-extracted keywords
  isSummarized: boolean; // Flag to indicate if this item has been summarized
  isSummarizing?: boolean; // Flag to indicate if this item is currently being summarized
}

const NewsList = ({ feedUrl, onStatusUpdate }: NewsListProps) => {
  const [currentSource, setCurrentSource] = useState<NewsSource>(
    NEWS_SOURCES[0] // Default to first source
  );
  const [newsItems, setNewsItems] = useState<CachedNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [summarizingCount, setSummarizingCount] = useState(0);
  const { toast } = useToast();

  // Use the provided feedUrl or get it from currentSource
  const activeFeedUrl = feedUrl || currentSource.feedUrl;

  // Update parent component with current status
  useEffect(() => {
    if (onStatusUpdate) {
      onStatusUpdate(summarizingCount, lastUpdated);
    }
  }, [summarizingCount, lastUpdated, onStatusUpdate]);

  // Define a function to check if a date is within the last day
  const isWithinLastDay = (dateString: string): boolean => {
    const pubDate = new Date(dateString);
    const now = new Date();
    const oneDayAgo = new Date(now.setDate(now.getDate() - 1));
    return pubDate >= oneDayAgo;
  };

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
        // Ensure loaded items have the necessary flags
        const validatedItems = items.map((item: CachedNewsItem) => ({
          ...item,
          isSummarized: item.isSummarized || false,
          isSummarizing: false // Reset summarizing status on load
        }));
        
        setNewsItems(validatedItems);
        setLastUpdated(new Date(timestamp));
        setLoading(false);
        toast({
          title: "Loaded from cache",
          description: `Showing cached news from ${new Date(timestamp).toLocaleString()}`,
        });
        return { items: validatedItems, timestamp }; // Return cache content
      }
    } catch (err) {
      console.error("Error loading cached news:", err);
      localStorage.removeItem(`news-cache-${activeFeedUrl}`); // Clear corrupted cache
    }
    return null; // Return null if no cache or error
  };

  // Save news items to localStorage for the current feed
  const saveCachedNews = (items: CachedNewsItem[]) => {
    try {
      // Ensure isSummarizing is not persisted to cache
      const itemsToSave = items.map(({ isSummarizing, ...rest }) => rest);
      const cacheData = {
        items: itemsToSave,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`news-cache-${activeFeedUrl}`, JSON.stringify(cacheData));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error saving news to cache:", err);
      // Handle potential storage quota errors
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
  const summarizeItemInBackground = async (itemId: string, currentItems: CachedNewsItem[]): Promise<CachedNewsItem | null> => {
    const item = currentItems.find(i => i.id === itemId);
    // Ensure item exists and isn't already summarized or being summarized
    if (!item || item.isSummarized || item.isSummarizing) {
      console.log(`Skipping summarization for item ${itemId}: Already summarized or in progress.`);
      return null; // Return null if no action needed
    }

    try {
      console.log(`Summarizing item ${itemId}: ${item.title}`);
      const fullContent = await fetchArticleContent(item.link);
      const contentToAnalyze = fullContent || item.description;
      
      // Ensure content exists before calling LLM
      if (!contentToAnalyze) {
        console.warn(`No content found to analyze for item ${itemId}`);
        return { 
          ...item, 
          isSummarized: true, 
          isSummarizing: false, 
          summary: "No content to summarize." 
        };
      }
      
      // Try LLM analysis
      try {
        const llmResult = await analyzeLLM(item.title, contentToAnalyze);
        
        console.log(`LLM summarization successful for item ${itemId}`);
        return {
          ...item,
          summary: llmResult.summary,
          llmSentiment: llmResult.sentiment,
          llmKeywords: llmResult.keywords,
          isSummarized: true,
          isSummarizing: false,
          // Update reading time based on full content if available
          readingTimeSeconds: fullContent ? calculateReadingTime(fullContent) : item.readingTimeSeconds,
        };
      } catch (llmError) {
        console.warn(`LLM analysis failed for item ${itemId}, falling back to local analysis:`, llmError);
        
        // Fallback: Use local analysis and store in primary fields
        const combinedText = item.title + " " + contentToAnalyze;
        const fallbackSentiment = analyzeSentiment(combinedText);
        const fallbackKeywords = extractKeywords(combinedText, 3);
        // Generate a simple fallback summary (e.g., first few sentences)
        const sentences = contentToAnalyze.split(/\.\s+/);
        const fallbackSummary = sentences.slice(0, 3).join(". ") + (sentences.length > 3 ? "." : "");
        
        return {
          ...item,
          summary: fallbackSummary, // Use basic summary
          sentiment: fallbackSentiment, // Store fallback in primary sentiment field
          keywords: fallbackKeywords, // Store fallback in primary keywords field
          llmSentiment: null, // Indicate LLM didn't provide this
          llmKeywords: [], // Indicate LLM didn't provide this
          isSummarized: true, // Mark as summarized (even with fallback)
          isSummarizing: false,
          readingTimeSeconds: fullContent ? calculateReadingTime(fullContent) : item.readingTimeSeconds,
        };
      }
    } catch (error) {
      console.error(`Error summarizing item ${itemId}:`, error);
      // Mark item as failed summarization
      return {
        ...item,
        isSummarized: true, // Mark as summarized (failure state)
        isSummarizing: false,
        summary: "Could not summarize content."
      };
    }
  };

  // Process summarization queue with limited concurrency
  const processSummarizationQueue = async (
    itemIds: string[],
    currentItems: CachedNewsItem[]
  ) => {
    const MAX_CONCURRENT = 2; // Process up to 2 items at once
    console.log(`Starting summarization queue for ${itemIds.length} items.`);
    
    // Filter out IDs that might already be summarized or are currently summarizing
    const itemsToProcess = itemIds.filter(id => {
      const item = currentItems.find(i => i.id === id);
      return item && !item.isSummarized && !item.isSummarizing;
    });
    
    if (itemsToProcess.length === 0) {
      console.log("No items need summarization in the current queue.");
      return;
    }
    
    console.log(`Processing ${itemsToProcess.length} items in batches of ${MAX_CONCURRENT}.`);
    
    // Update status to isSummarizing = true before starting the batch
    itemsToProcess.forEach(itemId => {
      const item = currentItems.find(i => i.id === itemId);
      if (item) {
        updateNewsItem({ ...item, isSummarizing: true });
        setSummarizingCount(prev => prev + 1);
      }
    });
    
    // Process in batches
    for (let i = 0; i < itemsToProcess.length; i += MAX_CONCURRENT) {
      const batchIds = itemsToProcess.slice(i, i + MAX_CONCURRENT);
      console.log(`Processing batch: ${batchIds.join(', ')}`);
      
      // Get the latest state for each call to summarizeItemInBackground
      const latestItems = newsItems;
      
      // Process the batch
      const results = await Promise.all(
        batchIds.map(itemId => summarizeItemInBackground(itemId, latestItems))
      );
      
      // Update state for items that were successfully processed
      results.forEach(updatedItem => {
        if (updatedItem) {
          console.log(`Updating state for summarized item ${updatedItem.id}`);
          updateNewsItem(updatedItem);
          setSummarizingCount(prev => Math.max(0, prev - 1));
        }
      });
      
      // Small delay between batches to avoid overwhelming the API
      if (i + MAX_CONCURRENT < itemsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log("Finished summarization queue.");
  };

  const fetchRssFeed = async (forceRefresh = false) => {
    // Try to load from cache first, unless force refresh is requested
    const cachedNews = !forceRefresh ? loadCachedNews() : null;
    if (cachedNews) {
      // Filter cached news to only include items from the last day
      const filteredItems = cachedNews.items.filter((item: CachedNewsItem) => isWithinLastDay(item.pubDate));
      setNewsItems(filteredItems);
      
      // Check if there are any items that haven't been summarized yet from cache
      const itemsToSummarizeFromCache = filteredItems
        .filter(item => !item.isSummarized && !item.isSummarizing)
        .map(item => item.id);
      
      if (itemsToSummarizeFromCache.length > 0) {
        console.log(`Found ${itemsToSummarizeFromCache.length} items in cache needing summarization.`);
        processSummarizationQueue(itemsToSummarizeFromCache, filteredItems);
      }
      return;
    }
    
    try {
      setLoading(true);
      
      // Use a CORS proxy to fetch the RSS feed with cache busting
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
      const itemsToSummarize: string[] = []; // Store IDs of new items needing summarization
      
      // Use existing state for comparison
      const currentItemsState = newsItems.length > 0 ? newsItems : (cachedNews?.items || []);
      const currentItemsMap = new Map(currentItemsState.map(item => [item.id, item]));
      
      items.forEach((item) => {
        // Extract data from RSS item
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
        const pubDateStr = item.querySelector("pubDate")?.textContent || new Date().toUTCString();
        const link = item.querySelector("link")?.textContent || "#";
        const description = item.querySelector("description")?.textContent || "";
        
        // Skip items that are older than one day
        if (!isWithinLastDay(pubDateStr)) {
          return;
        }
        
        // Generate a unique ID for this news item
        const id = generateNewsItemId(title, pubDateStr, link);
        
        // Check if we already have this item
        const existingItem = currentItemsMap.get(id);
        
        if (existingItem && !forceRefresh) {
          // We already have this item, reuse it
          newParsedItems.push(existingItem);
        } else {
          // Check if it's an update to an existing item or a completely new item
          const isUpdate = existingItem && forceRefresh;
          
          // New item or forced refresh: Create basic info, mark for summarization
          const newItem: CachedNewsItem = {
            id,
            title,
            description,
            pubDate: pubDateStr,
            link,
            imageUrl: imageUrl || undefined,
            sourceName: currentSource.name,
            // Do basic analysis immediately for a minimal display
            sentiment: isUpdate ? existingItem.sentiment : analyzeSentiment(title + " " + description),
            keywords: isUpdate ? existingItem.keywords : extractKeywords(title + " " + description, 3),
            readingTimeSeconds: calculateReadingTime(description),
            // Initialize advanced fields as null/empty
            summary: isUpdate ? existingItem.summary : null,
            llmSentiment: isUpdate ? existingItem.llmSentiment : null,
            llmKeywords: isUpdate ? existingItem.llmKeywords : [],
            isSummarized: isUpdate ? existingItem.isSummarized : false,
            isSummarizing: false,
            cached: false
          };
          
          newParsedItems.push(newItem);
          
          // If it's new or wasn't summarized before, add to the queue
          if (!isUpdate || !newItem.isSummarized) {
            itemsToSummarize.push(id);
          }
        }
      });
      
      // Update state with new items (UI component will handle sorting)
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

  // Define a function to sort news items for display prioritization
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
            disabled={loading || summarizingCount > 0}
          >
            <Loader2 className={`h-3 w-3 mr-1 ${(loading || summarizingCount > 0) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {summarizingCount > 0 && (
        <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-md mb-4 flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Generating summaries for {summarizingCount} articles in the background...</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
        {sortedNewsItems.map((item, index) => (
          <NewsItem 
            key={item.id || index} 
            {...item} 
          />
        ))}
      </div>
    </div>
  );
};

export default NewsList;
