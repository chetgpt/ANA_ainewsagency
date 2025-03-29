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

// Define the shape of our cache
interface NewsCache {
  items: CachedNewsItem[];
  timestamp: string;
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
  const loadCachedNews = (): { items: CachedNewsItem[], timestamp: string } | null => {
    try {
      console.log("Attempting to load cache for:", activeFeedUrl);
      const cachedData = localStorage.getItem(`news-cache-${activeFeedUrl}`);
      if (cachedData) {
        // Parse the cached data and validate it has the expected structure
        const parsedData = JSON.parse(cachedData) as NewsCache;
        
        if (!parsedData || !Array.isArray(parsedData.items) || !parsedData.timestamp) {
          console.warn("Invalid cache structure, clearing cache");
          localStorage.removeItem(`news-cache-${activeFeedUrl}`);
          return null;
        }
        
        // Type guard to validate each item in the array
        const isValidCachedItem = (item: any): item is CachedNewsItem => {
          return (
            typeof item === 'object' &&
            item !== null &&
            typeof item.id === 'string' &&
            typeof item.title === 'string' &&
            typeof item.description === 'string' &&
            typeof item.pubDate === 'string' &&
            typeof item.link === 'string' &&
            typeof item.sentiment === 'string' &&
            Array.isArray(item.keywords) &&
            typeof item.readingTimeSeconds === 'number' &&
            typeof item.isSummarized === 'boolean'
          );
        };
        
        // Filter out invalid items
        const validItems = parsedData.items.filter(isValidCachedItem);
        
        if (validItems.length !== parsedData.items.length) {
          console.warn(`Found ${parsedData.items.length - validItems.length} invalid items in cache`);
        }
        
        // Ensure loaded items have the necessary flags
        const validatedItems = validItems.map((item: CachedNewsItem) => ({
          ...item,
          isSummarized: item.isSummarized || false,
          isSummarizing: false // Reset summarizing status on load
        }));
        
        setNewsItems(validatedItems);
        const timestamp = new Date(parsedData.timestamp);
        setLastUpdated(timestamp);
        setLoading(false);
        
        console.log(`Loaded ${validatedItems.length} items from cache, timestamp: ${timestamp.toLocaleString()}`);
        
        toast({
          title: "Loaded from cache",
          description: `Showing cached news from ${timestamp.toLocaleString()}`,
        });
        
        return { items: validatedItems, timestamp: parsedData.timestamp };
      } else {
        console.log("No cache found for this feed URL");
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
      console.log(`Saved ${itemsToSave.length} items to cache`);
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

  // Background summarization function - fixed to properly check item status
  const summarizeItemInBackground = async (itemId: string, currentItems: CachedNewsItem[]): Promise<CachedNewsItem | null> => {
    const item = currentItems.find(i => i.id === itemId);
    
    if (!item) {
      console.log(`Skipping summarization for item ${itemId}: Item not found.`);
      return null;
    }
    
    if (item.isSummarizing) {
      console.log(`Skipping summarization for item ${itemId}: Already in progress.`);
      return null;
    }
    
    // Only skip if the item has already been summarized AND has a summary
    if (item.isSummarized && item.summary) {
      console.log(`Skipping summarization for item ${itemId}: Already has a summary.`);
      return null;
    }
    
    // Force summarization for items that are marked as summarized but have no summary
    if (item.isSummarized && !item.summary) {
      console.log(`Item ${itemId} was marked as summarized but has no summary. Retrying.`);
    }

    try {
      console.log(`Summarizing item ${itemId}: ${item.title}`);
      
      // Set item as summarizing before starting the process
      updateNewsItem({ ...item, isSummarizing: true });
      
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
        console.log(`Starting LLM analysis for item ${itemId} with content length: ${contentToAnalyze.length}`);
        const llmResult = await analyzeLLM(item.title, contentToAnalyze);
        
        console.log(`LLM summarization successful for item ${itemId}. Summary: ${llmResult.summary.substring(0, 50)}...`);
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
        
        console.log(`Generated fallback summary for item ${itemId}: ${fallbackSummary.substring(0, 50)}...`);
        
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

  // Process summarization queue with limited concurrency - fixed to properly update state
  const processSummarizationQueue = async (
    itemIds: string[],
    currentItems: CachedNewsItem[]
  ) => {
    const MAX_CONCURRENT = 2; // Process up to 2 items at once
    console.log(`Starting summarization queue for ${itemIds.length} items.`);
    
    // Filter out IDs that are already being summarized
    const itemsToProcess = itemIds.filter(id => {
      const item = currentItems.find(i => i.id === id);
      // Process if item exists and is not already being summarized
      // Include items that are marked as summarized but have no summary (needs retry)
      return item && !item.isSummarizing && (!item.isSummarized || (item.isSummarized && !item.summary));
    });
    
    if (itemsToProcess.length === 0) {
      console.log("No items need summarization in the current queue.");
      return;
    }
    
    console.log(`Processing ${itemsToProcess.length} items in batches of ${MAX_CONCURRENT}.`);
    
    // Update status to isSummarizing = true before starting the batch
    for (const itemId of itemsToProcess) {
      const item = currentItems.find(i => i.id === itemId);
      if (item) {
        console.log(`Marking item ${itemId} as summarizing...`);
        // Update each item's status individually to ensure state is correctly set
        setNewsItems(prevItems => {
          const updatedItems = prevItems.map(prevItem => 
            prevItem.id === itemId ? { ...prevItem, isSummarizing: true } : prevItem
          );
          return updatedItems;
        });
        setSummarizingCount(prev => prev + 1);
      }
    }
    
    // Small delay to ensure React state updates properly
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Process in batches
    for (let i = 0; i < itemsToProcess.length; i += MAX_CONCURRENT) {
      const batchIds = itemsToProcess.slice(i, i + MAX_CONCURRENT);
      console.log(`Processing batch: ${batchIds.join(', ')}`);
      
      // Get the latest state for each call to summarizeItemInBackground
      const latestItems = await new Promise<CachedNewsItem[]>(resolve => {
        setNewsItems(current => {
          resolve(current);
          return current;
        });
      });
      
      // Process the batch
      const promises = batchIds.map(itemId => summarizeItemInBackground(itemId, latestItems));
      const results = await Promise.all(promises);
      
      // Update state for items that were successfully processed
      for (const updatedItem of results) {
        if (updatedItem) {
          console.log(`Updating state for summarized item ${updatedItem.id}`);
          updateNewsItem(updatedItem);
          setSummarizingCount(prev => Math.max(0, prev - 1));
        }
      }
      
      // Small delay between batches to avoid overwhelming the API
      if (i + MAX_CONCURRENT < itemsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log("Finished summarization queue.");
  };

  // Force a refresh on initial load - don't use cache
  useEffect(() => {
    console.log("*** INITIAL LOAD: Forcing refresh of RSS feed ***");
    fetchRssFeed(true); // Force refresh on initial load
  }, []); // Empty dependency array means this only runs once

  // When activeFeedUrl changes, fetch the new feed
  useEffect(() => {
    if (activeFeedUrl) {
      console.log(`Feed URL changed to: ${activeFeedUrl}, fetching new data...`);
      fetchRssFeed();
    }
  }, [activeFeedUrl]);

  const fetchRssFeed = async (forceRefresh = false) => {
    // Try to load from cache first, unless force refresh is requested
    const cachedNews = !forceRefresh ? loadCachedNews() : null;
    console.log("Cache status:", cachedNews ? "Using cache" : "No cache or force refresh");
    
    if (cachedNews) {
      // Filter cached news to only include items from the last day
      const filteredItems = cachedNews.items.filter((item: CachedNewsItem) => isWithinLastDay(item.pubDate));
      console.log(`Filtered cached items: ${filteredItems.length} items from the last 24 hours`);
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
      console.log(`Fetching RSS from: ${activeFeedUrl}`);
      
      // Use a CORS proxy to fetch the RSS feed with cache busting
      const corsProxy = "https://api.allorigins.win/raw?url=";
      const fullUrl = `${corsProxy}${encodeURIComponent(activeFeedUrl)}?_=${Date.now()}`;
      console.log(`Full request URL: ${fullUrl}`);
      
      // Add timeout to fetch to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Debug fetch status with clearer logs
      console.log("Starting fetch request...");
      const response = await fetch(fullUrl, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      clearTimeout(timeoutId);
      
      console.log(`RSS Feed Response status: ${response.status}, statusText: ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.text();
      console.log(`RSS data received, length: ${data.length} characters`);
      
      if (data.length < 100) {
        console.warn(`Suspiciously short RSS data: "${data}"`);
        throw new Error("Received invalid or empty RSS feed data");
      }
      
      // Log the first part of the response for debugging
      console.log(`RSS data preview: "${data.substring(0, 200)}..."`);
      
      // Try parsing as XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, "text/xml");
      
      // Check if there was an XML parsing error
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        console.error("XML parsing error:", parserError.textContent);
        console.log("First 200 chars of received data:", data.substring(0, 200));
        throw new Error("Failed to parse RSS feed: Invalid XML format");
      }
      
      // Check if we have a real RSS feed
      const channelTitle = xmlDoc.querySelector("channel > title")?.textContent;
      console.log(`RSS Channel title: ${channelTitle || "Not found"}`);
      
      // Check if we have any items
      const items = xmlDoc.querySelectorAll("item");
      console.log(`Found ${items.length} items in the RSS feed`);
      
      if (items.length === 0) {
        // Try to detect if we're dealing with Atom format instead of RSS
        const atomEntries = xmlDoc.querySelectorAll("entry");
        if (atomEntries.length > 0) {
          console.log(`Detected Atom format with ${atomEntries.length} entries`);
          // Process Atom entries here if needed
        } else {
          console.warn("No items found in the feed - not a valid RSS or Atom feed?");
          throw new Error("No news items found in the feed");
        }
      }
      
      const newParsedItems: CachedNewsItem[] = [];
      const itemsToSummarize: string[] = []; // Store IDs of new items needing summarization
      
      // Use existing state for comparison
      const currentItemsState = newsItems.length > 0 ? newsItems : (cachedNews?.items || []);
      const currentItemsMap = new Map(currentItemsState.map(item => [item.id, item],));
      
      // Process each RSS item
      items.forEach((item, index) => {
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
        
        console.log(`Item ${index + 1}: "${title}" (${pubDateStr})`);
        
        // Skip items that are older than one day
        if (!isWithinLastDay(pubDateStr)) {
          console.log(`Skipping item "${title}" - older than 24 hours`);
          return;
        }
        
        // Generate a unique ID for this news item
        const id = generateNewsItemId(title, pubDateStr, link);
        
        // Check if we already have this item
        const existingItem = currentItemsMap.get(id);
        
        if (existingItem && !forceRefresh) {
          // We already have this item, reuse it
          console.log(`Reusing existing item: "${title}"`);
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
          
          console.log(`Added ${isUpdate ? "updated" : "new"} item: "${title}"`);
          newParsedItems.push(newItem);
          
          // If it's new or wasn't summarized before, add to the queue
          if (!isUpdate || !newItem.isSummarized) {
            itemsToSummarize.push(id);
          }
        }
      });
      
      console.log(`Total processed items: ${newParsedItems.length} for display`);
      
      // Update state with new items (UI component will handle sorting)
      setNewsItems(newParsedItems);
      
      if (newParsedItems.length > 0) {
        saveCachedNews(newParsedItems);
      } else {
        console.warn("No items found within the last 24 hours - check the feed content");
      }
      
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
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to load news: ${errorMessage}`);
      setLoading(false);
      
      toast({
        title: "Error loading news",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Define a function to sort news items for display prioritization - improved to better prioritize summarized items
  const sortedNewsItems = [...newsItems].sort((a, b) => {
    // First, prioritize items with summaries
    if (a.summary && !b.summary) return -1;
    if (!a.summary && b.summary) return 1;
    
    // Then prioritize summarized items
    if (a.isSummarized && !b.isSummarized) return -1;
    if (!a.isSummarized && b.isSummarized) return 1;
    
    // Then sort by date (newest first)
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });
  
  // Force a resummary of all items - improved to catch more items needing summaries
  const resummaryAllItems = () => {
    const itemsToProcess = newsItems
      .filter(item => !item.isSummarizing && (!item.summary || !item.isSummarized))
      .map(item => item.id);
      
    if (itemsToProcess.length > 0) {
      toast({
        title: "Generating summaries",
        description: `Summarizing ${itemsToProcess.length} news items...`,
      });
      processSummarizationQueue(itemsToProcess, newsItems);
    } else {
      toast({
        title: "No items to summarize",
        description: "All news items already have summaries or are being summarized.",
      });
    }
  };

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
            onClick={resummaryAllItems}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
          >
            Generate Summaries
          </button>
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
      
      {newsItems.length === 0 && !loading && !error && (
        <Alert className="my-4">
          <AlertDescription>
            No news articles found for the last 24 hours. 
            Try selecting a different source or clearing the cache.
          </AlertDescription>
        </Alert>
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
