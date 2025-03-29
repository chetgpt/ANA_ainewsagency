
import { useState, useEffect } from "react";
import NewsItem, { NewsItemProps } from "./NewsItem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { analyzeSentiment, extractKeywords, calculateReadingTime } from "@/utils/textAnalysis";
import { useToast } from "@/hooks/use-toast";

interface NewsListProps {
  feedUrl: string;
}

interface CachedNewsItem extends NewsItemProps {
  id: string; // Unique identifier for caching
  cached: boolean; // Flag to indicate if this item is from cache
}

const NewsList = ({ feedUrl }: NewsListProps) => {
  const [newsItems, setNewsItems] = useState<CachedNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  // Generate a unique ID for a news item based on its content
  const generateNewsItemId = (title: string, pubDate: string, link: string): string => {
    return `${title}-${pubDate}-${link}`.replace(/[^a-zA-Z0-9]/g, '');
  };

  // Load cached news items from localStorage
  const loadCachedNews = () => {
    try {
      const cachedData = localStorage.getItem(`news-cache-${feedUrl}`);
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

  // Save news items to localStorage
  const saveCachedNews = (items: CachedNewsItem[]) => {
    try {
      const cacheData = {
        items,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`news-cache-${feedUrl}`, JSON.stringify(cacheData));
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

  const fetchRssFeed = async (forceRefresh = false) => {
    // Try to load from cache first, unless force refresh is requested
    if (!forceRefresh && loadCachedNews()) {
      return;
    }

    try {
      setLoading(true);
      
      // Use a CORS proxy to fetch the RSS feed
      const corsProxy = "https://api.allorigins.win/raw?url=";
      const response = await fetch(`${corsProxy}${encodeURIComponent(feedUrl)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status}`);
      }
      
      const data = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, "text/xml");
      
      const items = xmlDoc.querySelectorAll("item");
      const newParsedItems: CachedNewsItem[] = [];
      
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
        const existingItem = newsItems.find(item => item.id === id);
        
        if (existingItem && !forceRefresh) {
          // We already have this item, reuse it
          newParsedItems.push(existingItem);
        } else {
          // This is a new item or we're forcing refresh, analyze it
          const combinedText = title + " " + description;
          const sentiment = analyzeSentiment(combinedText);
          const keywords = extractKeywords(combinedText, 3);
          const readingTimeSeconds = calculateReadingTime(description);
          
          newParsedItems.push({
            id,
            title,
            description,
            pubDate,
            link,
            imageUrl: imageUrl || undefined,
            sourceName: "",
            sentiment,
            keywords,
            readingTimeSeconds,
            cached: false
          });
        }
      });
      
      // Update state and save to cache
      setNewsItems(newParsedItems);
      saveCachedNews(newParsedItems);
      setLoading(false);
      setError("");
      
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
    fetchRssFeed();
  }, [feedUrl]);

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
          {lastUpdated && (
            <span className="text-sm text-gray-500 mr-4">
              Last updated: {lastUpdated.toLocaleString()}
            </span>
          )}
        </div>
        <button
          onClick={refreshNews}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
        >
          <Loader2 className="h-3 w-3 mr-1" />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
        {newsItems.map((item, index) => (
          <NewsItem key={item.id || index} {...item} />
        ))}
      </div>
    </div>
  );
};

export default NewsList;
