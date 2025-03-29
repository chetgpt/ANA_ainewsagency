
import { useState, useEffect } from "react";
import NewsItem, { NewsItemProps } from "./NewsItem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { NEWS_SOURCES } from "./NewsSourceSelector";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

const CategorizedNewsList = ({ selectedCategory }: CategorizedNewsListProps) => {
  const [newsItems, setNewsItems] = useState<(NewsItemProps & { category: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAllRssFeeds = async () => {
      try {
        setLoading(true);
        const corsProxy = "https://api.allorigins.win/raw?url=";
        
        // Create promises for all RSS feeds
        const feedPromises = NEWS_SOURCES.map(async (source) => {
          try {
            const response = await fetch(`${corsProxy}${encodeURIComponent(source.feedUrl)}`);
            
            if (!response.ok) {
              console.error(`Failed to fetch ${source.name} RSS feed: ${response.status}`);
              return [];
            }
            
            const data = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");
            
            const items = xmlDoc.querySelectorAll("item");
            const parsedItems = [];
            
            for (const item of items) {
              const title = item.querySelector("title")?.textContent || "No title";
              const description = item.querySelector("description")?.textContent || "";
              const pubDate = item.querySelector("pubDate")?.textContent || new Date().toUTCString();
              const link = item.querySelector("link")?.textContent || "#";
              const sourceName = source.name;
              
              const newsItem = {
                title,
                description,
                pubDate,
                link,
                sourceName,
                category: "summarized" // Set all items to summarized category
              };
              
              parsedItems.push(newsItem);
            }
            
            return parsedItems;
          } catch (error) {
            console.error(`Error fetching ${source.name} RSS feed:`, error);
            return [];
          }
        });
        
        // Wait for all feeds to be fetched
        const allItemsArrays = await Promise.all(feedPromises);
        
        // Flatten array of arrays into a single array
        const allItems = allItemsArrays.flat();
        
        // Sort by publication date (newest first)
        allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        
        setNewsItems(allItems);
        setLoading(false);
        setError("");
      } catch (err) {
        console.error("Error fetching RSS feeds:", err);
        setError("Failed to load news. Please try again later.");
        setLoading(false);
      }
    };

    fetchAllRssFeeds();
  }, []);

  /**
   * Processes news items for display based on desired text length.
   * Removes HTML tags from descriptions and truncates them.
   */
  const getDisplayItems = () => {
    // Make sure newsItems is an array before processing
    if (!Array.isArray(newsItems)) {
      console.error("getDisplayItems: newsItems is not an array.");
      return [];
    }

    // Create a list with HTML stripped from descriptions and truncated
    return newsItems.map(item => {
      // Ensure description exists and is a string before trying to replace
      const descriptionText = (typeof item.description === 'string')
        ? item.description.replace(/<[^>]*>?/gm, '') // Remove HTML tags
        : ''; // Use empty string if description is missing or not a string
      
      // Always truncate to 100 characters
      const finalDescription = descriptionText.length > 100
        ? descriptionText.substring(0, 100) + "..."
        : descriptionText;
      
      return {
        ...item,
        description: finalDescription
      };
    });
  };

  const displayItems = getDisplayItems();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading news from all sources...</span>
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

  if (displayItems.length === 0) {
    return (
      <Alert className="my-4">
        <AlertDescription>No news articles found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Summarized News</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
        {displayItems.map((item, index) => (
          <NewsItem key={index} {...item} sourceName={item.sourceName} />
        ))}
      </div>
    </div>
  );
};

export default CategorizedNewsList;
