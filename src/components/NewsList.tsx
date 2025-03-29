import { useState, useEffect, useRef } from "react";
import NewsItem, { NewsItemProps } from "./NewsItem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { analyzeSentiment, extractKeywords, calculateReadingTime, fetchArticleContent } from "@/utils/textAnalysis";
import { analyzeLLM } from "@/utils/llmService";
import { useToast } from "@/hooks/use-toast";
import { NEWS_SOURCES } from "./NewsSourceSelector";

interface NewsListProps {
  feedUrl?: string;
  onStatusUpdate?: (summarizingCount: number, lastUpdated: Date | null) => void;
  combineAllSources?: boolean;
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

const NewsList = ({ feedUrl, onStatusUpdate, combineAllSources = false }: NewsListProps) => {
  const [newsItems, setNewsItems] = useState<CachedNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [summarizingCount, setSummarizingCount] = useState(0);
  const { toast } = useToast();
  
  // Keep track of actively summarizing items to prevent duplicates
  const [activeSummarizations, setActiveSummarizations] = useState<Set<string>>(new Set());
  
  // Reference to track mounted state for async operations
  const isMounted = useRef(true);
  
  // AbortController ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Load cached news items from localStorage for the given feed
  const loadCachedNews = (feed: string): { items: CachedNewsItem[], timestamp: string } | null => {
    try {
      console.log("Attempting to load cache for:", feed);
      const cachedData = localStorage.getItem(`news-cache-${feed}`);
      if (cachedData) {
        // Parse the cached data and validate it has the expected structure
        const parsedData = JSON.parse(cachedData) as NewsCache;
        
        if (!parsedData || !Array.isArray(parsedData.items) || !parsedData.timestamp) {
          console.warn("Invalid cache structure, clearing cache");
          localStorage.removeItem(`news-cache-${feed}`);
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
        
        console.log(`Loaded ${validatedItems.length} items from cache, timestamp: ${parsedData.timestamp}`);
        
        return {
          items: validatedItems,
          timestamp: parsedData.timestamp
        };
      }
    } catch (err) {
      console.error("Error loading cached news:", err);
      localStorage.removeItem(`news-cache-${feed}`); // Clear corrupted cache
    }
    return null;
  };

  // Save news items to localStorage for a specific feed
  const saveCachedNews = (items: CachedNewsItem[], feed: string) => {
    try {
      // Ensure isSummarizing is not persisted to cache
      const itemsToSave = items.map(({ isSummarizing, ...rest }) => rest);
      const cacheData = {
        items: itemsToSave,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`news-cache-${feed}`, JSON.stringify(cacheData));
      setLastUpdated(new Date());
      console.log(`Saved ${itemsToSave.length} items to cache for ${feed}`);
    } catch (err) {
      console.error("Error saving news to cache:", err);
      // Handle potential storage quota errors
    }
  };

  // Force refresh news from all sources
  const refreshNews = () => {
    setLoading(true);
    setNewsItems([]);
    if (combineAllSources) {
      fetchAllRssFeeds(true);
    } else {
      fetchRssFeed(feedUrl!, true);
    }
    toast({
      title: "Refreshing news",
      description: "Fetching the latest updates...",
    });
  };

  // Clear all news cache
  const clearCache = () => {
    try {
      if (combineAllSources) {
        // Clear cache for all sources
        for (const source of NEWS_SOURCES) {
          localStorage.removeItem(`news-cache-${source.feedUrl}`);
        }
      } else if (feedUrl) {
        // Clear specific feed cache
        localStorage.removeItem(`news-cache-${feedUrl}`);
      }
      
      setNewsItems([]);
      setLastUpdated(null);
      setLoading(true);
      
      toast({
        title: "Cache cleared",
        description: "All cached news has been removed.",
      });
      
      // Fetch fresh news
      if (combineAllSources) {
        fetchAllRssFeeds(true);
      } else if (feedUrl) {
        fetchRssFeed(feedUrl, true);
      }
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
      return newItems;
    });
  };

  // Background summarization function
  const summarizeItemInBackground = async (itemId: string): Promise<void> => {
    // Get the latest item state
    const item = newsItems.find(i => i.id === itemId);
    
    if (!item) {
      console.log(`Skipping summarization for item ${itemId}: Item not found.`);
      return;
    }
    
    // Skip if the item is already being summarized by another process
    if (activeSummarizations.has(itemId)) {
      console.log(`Skipping summarization for item ${itemId}: Already in progress by another process.`);
      return;
    }
    
    // Skip if the item has already been successfully summarized
    if (item.isSummarized && item.summary && item.summary.length > 50 && item.summary !== item.description) {
      console.log(`Skipping summarization for item ${itemId}: Already has a valid summary.`);
      return;
    }
    
    try {
      console.log(`Starting summarization for item ${itemId}: ${item.title}`);
      
      // Mark item as summarizing in UI state
      updateNewsItem({ ...item, isSummarizing: true });
      setSummarizingCount(prev => prev + 1);
      
      // Add to active summarizations set to prevent duplicate processing
      setActiveSummarizations(prev => {
        const newSet = new Set(prev);
        newSet.add(itemId);
        return newSet;
      });
      
      // Create a separate AbortController for this summarization
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort(); 
        console.log(`Summarization timed out for item ${itemId}`);
      }, 45000); // Increase timeout to 45 seconds for better chance of completion
      
      try {
        console.log(`Fetching article content for item ${itemId}`);
        const fullContent = await fetchArticleContent(item.link, abortController.signal);
        const contentToAnalyze = fullContent || item.description;
        
        // Ensure content exists before calling LLM
        if (!contentToAnalyze) {
          console.warn(`No content found to analyze for item ${itemId}`);
          updateNewsItem({ 
            ...item, 
            isSummarized: true, 
            isSummarizing: false, 
            summary: "No content to summarize." 
          });
          return;
        }
        
        // Try LLM analysis with explicit logging
        try {
          console.log(`Starting LLM analysis for item ${itemId} with content length: ${contentToAnalyze.length}`);
          
          // Force console log to see exactly what's being sent to LLM
          console.log(`LLM input - Title: ${item.title}`);
          console.log(`LLM input - Content preview: ${contentToAnalyze.substring(0, 200)}...`);
          
          const llmResult = await analyzeLLM(item.title, contentToAnalyze);
          
          // Validate that we got a real summary back
          if (!llmResult.summary || llmResult.summary.length < 50) {
            throw new Error("LLM returned an insufficient summary");
          }
          
          // Log the summary to verify it's a real summary and not just echoing the input
          console.log(`LLM summary for item ${itemId}: ${llmResult.summary.substring(0, 100)}...`);
          
          // Update the item with the summary
          updateNewsItem({
            ...item,
            summary: llmResult.summary,
            llmSentiment: llmResult.sentiment,
            llmKeywords: llmResult.keywords,
            isSummarized: true,
            isSummarizing: false,
            readingTimeSeconds: fullContent ? calculateReadingTime(fullContent) : item.readingTimeSeconds,
          });
          
          console.log(`Successfully updated item ${itemId} with LLM summary`);
          
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
          
          updateNewsItem({
            ...item,
            summary: fallbackSummary, 
            sentiment: fallbackSentiment,
            keywords: fallbackKeywords,
            llmSentiment: null,
            llmKeywords: [],
            isSummarized: true,
            isSummarizing: false,
            readingTimeSeconds: fullContent ? calculateReadingTime(fullContent) : item.readingTimeSeconds,
          });
        }
      } finally {
        clearTimeout(timeoutId);
        if (!abortController.signal.aborted) {
          abortController.abort(); // Clean up
        }
      }
      
    } catch (error) {
      console.error(`Error summarizing item ${itemId}:`, error);
      // Mark item as failed summarization
      updateNewsItem({
        ...item,
        isSummarized: true,
        isSummarizing: false,
        summary: "Could not summarize content."
      });
    } finally {
      // Always clean up status
      setSummarizingCount(prev => Math.max(0, prev - 1));
      setActiveSummarizations(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // Process summarization queue with improved concurrency handling
  const processSummarizationQueue = async (itemIds: string[]) => {
    const MAX_CONCURRENT = 2; // Process up to 2 items at once
    console.log(`Starting summarization queue for ${itemIds.length} items.`);
    
    // Delay startup to ensure state is settled
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reset activeSummarizations to ensure we don't have stale entries
    setActiveSummarizations(new Set());
    
    // Get the latest newsItems state
    const currentNewsItems = [...newsItems];
    
    // Filter out IDs that are already being summarized or have summaries
    const itemsToProcess = itemIds.filter(id => {
      const item = currentNewsItems.find(i => i.id === id);
      
      if (!item) {
        console.log(`Item ${id} not found in news items`);
        return false;
      }
      
      // Skip items that already have valid summaries
      if (item.isSummarized && item.summary && item.summary.length > 50 && item.summary !== item.description) {
        console.log(`Item ${id} already has a valid summary`);
        return false;
      }
      
      // Include this item in processing
      return true;
    });
    
    if (itemsToProcess.length === 0) {
      console.log("No items need summarization in the current queue.");
      return;
    }
    
    console.log(`Processing ${itemsToProcess.length} items in batches of ${MAX_CONCURRENT}.`);
    
    // Process in batches
    for (let i = 0; i < itemsToProcess.length; i += MAX_CONCURRENT) {
      const batchIds = itemsToProcess.slice(i, i + MAX_CONCURRENT);
      console.log(`Processing batch: ${batchIds.join(', ')}`);
      
      // Process the batch in parallel
      await Promise.all(batchIds.map(itemId => summarizeItemInBackground(itemId)));
      
      // Small delay between batches to avoid overwhelming the API
      if (i + MAX_CONCURRENT < itemsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log("Finished summarization queue.");
  };

  // Cleanup function for unmounting
  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Abort any ongoing fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Initial load effect
  useEffect(() => {
    if (combineAllSources) {
      console.log("*** INITIAL LOAD: Fetching from all RSS sources ***");
      fetchAllRssFeeds(true);
    } else if (feedUrl) {
      console.log(`*** INITIAL LOAD: Forcing refresh of RSS feed: ${feedUrl} ***`);
      fetchRssFeed(feedUrl, true);
    }
    
    return () => {
      // Ensure cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Empty dependency array for initial load only

  // React to feedUrl or combineAllSources changes
  useEffect(() => {
    if (!combineAllSources && feedUrl) {
      console.log(`Feed URL changed to: ${feedUrl}, fetching new data...`);
      fetchRssFeed(feedUrl);
    } else if (combineAllSources) {
      console.log("Combining all sources mode activated, fetching all sources...");
      fetchAllRssFeeds();
    }
    
    return () => {
      // Ensure cleanup when feed URL changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [feedUrl, combineAllSources]);

  // Update parent component with status
  useEffect(() => {
    if (onStatusUpdate) {
      onStatusUpdate(summarizingCount, lastUpdated);
    }
  }, [summarizingCount, lastUpdated, onStatusUpdate]);

  // New function to fetch from all RSS sources
  const fetchAllRssFeeds = async (forceRefresh = false) => {
    setLoading(true);
    setError("");
    
    let allItems: CachedNewsItem[] = [];
    let hasErrors = false;
    let sourcesToProcess = [...NEWS_SOURCES];
    
    // If not forcing a refresh, try to load from cache first
    if (!forceRefresh) {
      let anyNewItems = false;
      const allCachedItems: CachedNewsItem[] = [];
      
      // Load items from cache for each source
      for (const source of NEWS_SOURCES) {
        const cachedNews = loadCachedNews(source.feedUrl);
        if (cachedNews) {
          // Filter to only include items from the last day
          const filteredItems = cachedNews.items
            .filter(item => isWithinLastDay(item.pubDate))
            .map(item => ({
              ...item,
              sourceName: source.name // Ensure source name is included
            }));
          
          if (filteredItems.length > 0) {
            allCachedItems.push(...filteredItems);
            anyNewItems = true;
          }
        }
      }
      
      if (anyNewItems) {
        console.log(`Loaded ${allCachedItems.length} cached items from all sources`);
        setNewsItems(allCachedItems);
        
        // Find items that need summarization
        const itemsToSummarize = allCachedItems
          .filter(item => !item.summary || !item.isSummarized)
          .map(item => item.id);
        
        if (itemsToSummarize.length > 0) {
          console.log(`Found ${itemsToSummarize.length} cached items needing summarization`);
          setTimeout(() => processSummarizationQueue(itemsToSummarize), 1000);
        }
        
        setLoading(false);
        setLastUpdated(new Date());
        return;
      }
    }
    
    setNewsItems([]); // Clear existing items before fetching
    
    // Process each RSS source
    for (const source of sourcesToProcess) {
      try {
        console.log(`Fetching from source: ${source.name}`);
        
        // Abort any ongoing fetch
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        // Create a new AbortController for this fetch
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        // Use a CORS proxy to fetch the RSS feed with cache busting
        const corsProxy = "https://api.allorigins.win/raw?url=";
        const fullUrl = `${corsProxy}${encodeURIComponent(source.feedUrl)}?_=${Date.now()}`;
        
        // Add timeout to fetch to prevent hanging
        const timeoutId = setTimeout(() => {
          if (abortControllerRef.current) {
            console.log(`Fetch for ${source.name} timed out after 15 seconds`);
            abortControllerRef.current.abort();
          }
        }, 15000); // 15 second timeout
        
        console.log(`Starting fetch for ${source.name}...`);
        const response = await fetch(fullUrl, { 
          signal: signal,
          headers: {
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
          }
        });
        clearTimeout(timeoutId);
        
        console.log(`${source.name} RSS Feed Response status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch RSS feed from ${source.name}: ${response.status}`);
        }
        
        const data = await response.text();
        
        if (data.length < 100) {
          console.warn(`Suspiciously short RSS data from ${source.name}: "${data}"`);
          throw new Error(`Received invalid or empty RSS feed data from ${source.name}`);
        }
        
        // Try parsing as XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        
        // Check if there was an XML parsing error
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
          console.error(`XML parsing error for ${source.name}:`, parserError.textContent);
          throw new Error(`Failed to parse RSS feed from ${source.name}: Invalid XML format`);
        }
        
        // Check if we have any items
        const items = xmlDoc.querySelectorAll("item");
        console.log(`Found ${items.length} items in the ${source.name} RSS feed`);
        
        if (items.length === 0) {
          // Try to detect if we're dealing with Atom format instead of RSS
          const atomEntries = xmlDoc.querySelectorAll("entry");
          if (atomEntries.length > 0) {
            console.log(`Detected Atom format with ${atomEntries.length} entries for ${source.name}`);
            // We could process Atom entries here if needed
          } else {
            console.warn(`No items found in the ${source.name} feed - skipping source`);
            continue; // Skip to next source
          }
        }
        
        const sourceItems: CachedNewsItem[] = [];
        
        // Helper function to decode HTML entities
        const decodeHtmlEntities = (text: string): string => {
          const textArea = document.createElement('textarea');
          textArea.innerHTML = text;
          return textArea.value;
        };
        
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
            const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
            if (imgMatch && imgMatch[1]) {
              imageUrl = imgMatch[1];
            }
          }
          
          // Get and decode title
          const titleEl = item.querySelector("title");
          let title = titleEl?.textContent || "No title";
          title = decodeHtmlEntities(title);

          const pubDateStr = item.querySelector("pubDate")?.textContent || new Date().toUTCString();
          const link = item.querySelector("link")?.textContent || "#";
          
          // Get and decode description
          const descriptionEl = item.querySelector("description");
          let description = "";
          if (descriptionEl) {
            if (descriptionEl.firstChild && descriptionEl.firstChild.nodeType === Node.CDATA_SECTION_NODE) {
              description = descriptionEl.firstChild.textContent || "";
            } else {
              description = descriptionEl.textContent || "";
            }
            description = decodeHtmlEntities(description);
          }
          
          // Skip items that are older than one day
          if (!isWithinLastDay(pubDateStr)) {
            console.log(`Skipping item "${title}" from ${source.name} - older than 24 hours`);
            return;
          }
          
          // Generate a unique ID for this news item
          const id = generateNewsItemId(title, pubDateStr, link);
          
          // Create the news item
          const newsItem: CachedNewsItem = {
            id,
            title,
            description,
            pubDate: pubDateStr,
            link,
            imageUrl: imageUrl || undefined,
            sourceName: source.name,
            sentiment: analyzeSentiment(title + " " + description),
            keywords: extractKeywords(title + " " + description, 3),
            readingTimeSeconds: calculateReadingTime(description),
            summary: null,
            llmSentiment: null,
            llmKeywords: [],
            isSummarized: false,
            isSummarizing: false,
            cached: false
          };
          
          sourceItems.push(newsItem);
        });
        
        // Save these items to cache for this source
        if (sourceItems.length > 0) {
          saveCachedNews(sourceItems, source.feedUrl);
          allItems = [...allItems, ...sourceItems];
        }
        
      } catch (error) {
        console.error(`Error fetching RSS feed from ${source.name}:`, error);
        hasErrors = true;
        // Continue with next source even if this one failed
      }
    }
    
    // Set combined items in state
    if (allItems.length > 0) {
      console.log(`Processed a total of ${allItems.length} items from all sources`);
      setNewsItems(allItems);
      setLastUpdated(new Date());
      
      // Start background summarization for all new items
      const itemsToSummarize = allItems
        .filter(item => !item.isSummarized)
        .map(item => item.id);
      
      if (itemsToSummarize.length > 0) {
        toast({
          title: "Processing content",
          description: `Generating summaries for ${itemsToSummarize.length} new articles...`,
        });
        
        // Delay summarization queue to ensure state is updated
        setTimeout(() => processSummarizationQueue(itemsToSummarize), 1000);
      }
    } else if (hasErrors) {
      setError("Failed to load news from some sources. Please try again.");
    } else {
      setError("No news articles found for the last 24 hours.");
    }
    
    setLoading(false);
  };

  // Existing fetchRssFeed function for single source fetch
  const fetchRssFeed = async (activeFeedUrl: string, forceRefresh = false) => {
    // Abort any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new AbortController for this fetch
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Try to load from cache first, unless force refresh is requested
    const cachedNews = !forceRefresh ? loadCachedNews(activeFeedUrl) : null;
    console.log("Cache status:", cachedNews ? "Using cache" : "No cache or force refresh");
    
    if (cachedNews) {
      // Filter cached news to only include items from the last day
      const filteredItems = cachedNews.items.filter((item: CachedNewsItem) => isWithinLastDay(item.pubDate));
      console.log(`Filtered cached items: ${filteredItems.length} items from the last 24 hours`);
      setNewsItems(filteredItems);
      
      // Reset the activeSummarizations set to ensure we don't have stale entries
      setActiveSummarizations(new Set());
      
      // Check if there are any items that haven't been summarized yet from cache
      const itemsToSummarizeFromCache = filteredItems
        .filter(item => !item.isSummarized || (item.isSummarized && !item.summary))
        .map(item => item.id);
      
      if (itemsToSummarizeFromCache.length > 0) {
        console.log(`Found ${itemsToSummarizeFromCache.length} items in cache needing summarization.`);
        // Slight delay to ensure state is updated before processing
        setTimeout(() => processSummarizationQueue(itemsToSummarizeFromCache), 1000); 
      }
      
      setLoading(false);
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
      // Using both AbortController for cleanup and a timeout
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          console.log("Fetch timed out after 15 seconds");
          abortControllerRef.current.abort();
        }
      }, 15000); // 15 second timeout
      
      // Debug fetch status with clearer logs
      console.log("Starting fetch request...");
      const response = await fetch(fullUrl, { 
        signal: signal,
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
      const currentItemsMap = new Map(currentItemsState.map(item => [item.id, item]));

      // Helper function to decode HTML entities
      const decodeHtmlEntities = (text: string): string => {
        const textArea = document.createElement('textarea');
        textArea.innerHTML = text;
        return textArea.value;
      };
      
      // Find the source name based on the feed URL
      const source = NEWS_SOURCES.find(s => s.feedUrl === activeFeedUrl);
      const sourceName = source ? source.name : "Unknown Source";
      
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
          const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
        }
        
        // Get and decode title
        const titleEl = item.querySelector("title");
        let title = titleEl?.textContent || "No title";
        title = decodeHtmlEntities(title);

        const pubDateStr = item.querySelector("pubDate")?.textContent || new Date().toUTCString();
        const link = item.querySelector("link")?.textContent || "#";
        
        // Get and decode description
        const descriptionEl = item.querySelector("description");
        let description = "";
        if (descriptionEl) {
          if (descriptionEl.firstChild && descriptionEl.firstChild.nodeType === Node.CDATA_SECTION_NODE) {
            description = descriptionEl.firstChild.textContent || "";
          } else {
            description = descriptionEl.textContent || "";
          }
          description = decodeHtmlEntities(description);
        }
        
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
            sourceName,
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
      
      // Check if the component is still mounted before updating state
      if (isMounted.current) {
        // Reset active summarizations
        setActiveSummarizations(new Set());
        
        // Update state with new items (UI component will handle sorting)
        setNewsItems(newParsedItems);
        
        if (newParsedItems.length > 0) {
          saveCachedNews(newParsedItems, activeFeedUrl);
        } else {
          console.warn("NO items found within the last 24 hours - check the feed content");
        }
        
        setLoading(false);
        setError("");
        
        // Start background summarization for new items
        if (itemsToSummarize.length > 0) {
          toast({
            title: "Processing content",
            description: `Generating summaries for ${itemsToSummarize.length} new articles...`,
          });
          
          // Slight delay to ensure state is updated before processing
          setTimeout(() => processSummarizationQueue(itemsToSummarize), 1000);
        }
        
        if (forceRefresh) {
          toast({
            title: "News updated",
            description: "Latest news has been loaded.",
          });
        }
      }
    } catch (err) {
      // Only process errors if the component is still mounted
      if (isMounted.current) {
        // Don't show errors for aborted requests (expected during unmount)
        if (err instanceof Error && err.name === 'AbortError') {
          console.log("Fetch aborted - component likely unmounted or feed URL changed");
          return;
        }
        
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
    }
  };

  // Define a function to sort news items for display prioritization
  const sortedNewsItems = [...newsItems].sort((a, b) => {
    // First, prioritize items with summaries
    if (a.summary && !b.summary) return -1;
    if (!a.summary && b.summary) return 1;
    
    // Then prioritize summarized items that have no summary yet
    if (a.isSummarized && !b.isSummarized) return -1;
    if (!a.isSummarized && b.isSummarized) return 1;
    
    // Finally, sort by date (newest first)
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });
  
  // Force a resummary of all items - with better logic
  const resummaryAllItems = () => {
    // Reset active summarizations set to avoid stale entries
    setActiveSummarizations(new Set());
    
    const itemsToProcess = newsItems
      .filter(item => !item.summary) // Only try to summarize items without summaries
      .map(item => item.id);
    
    if (itemsToProcess.length > 0) {
      toast({
        title: "Generating summaries",
        description: `Summarizing ${itemsToProcess.length} news items...`,
      });
      // Slight delay to ensure state is updated before processing
      setTimeout(() => processSummarizationQueue(itemsToProcess), 1000);
    } else {
      toast({
        title: "No items to summarize",
        description: "All news items already have summaries or are being summarized.",
      });
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (newsItems.length === 0 && !loading && !error) {
    return (
      <Alert className="my-4">
        <AlertDescription>
          No news articles found for the last 24 hours. 
          Try clearing the cache and refreshing.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={resummaryAllItems}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center"
            disabled={summarizingCount > 0}
          >
            {summarizingCount > 0 ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Generating... ({summarizingCount})
              </>
            ) : (
              "Generate Summaries"
            )}
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
            <Loader2 className={`h-3 w-3 mr-1 ${(loading || summarizingCount > 0) ? 'animate-spin' : 'opacity-0'}`} />
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
      
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
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
