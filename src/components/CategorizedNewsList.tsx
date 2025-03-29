
import { useState, useEffect } from "react";
import NewsItem, { NewsItemProps } from "./NewsItem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { categorizeNewsItem } from "@/utils/newsCategories";
import { NEWS_SOURCES } from "./NewsSourceSelector";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

const CategorizedNewsList = ({ selectedCategory }: CategorizedNewsListProps) => {
  const [newsItems, setNewsItems] = useState<(NewsItemProps & { category: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summarizedItems, setSummarizedItems] = useState<(NewsItemProps & { category: string })[]>([]);

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
              const description = item.querySelector("description")?.textContent || "";
              const pubDate = item.querySelector("pubDate")?.textContent || new Date().toUTCString();
              const link = item.querySelector("link")?.textContent || "#";
              const sourceName = source.name;
              
              const newsItem = {
                title,
                description,
                pubDate,
                link,
                imageUrl: imageUrl || undefined,
                sourceName,
                category: categorizeNewsItem(title, description)
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

        // Create summarized versions of each item
        const summaries = allItems.map(item => {
          // Create a shorter version of the description (first ~100 characters)
          const cleanDescription = item.description.replace(/<[^>]*>?/gm, '');
          const summarizedDescription = cleanDescription.length > 100 
            ? cleanDescription.substring(0, 100) + "..." 
            : cleanDescription;
          
          return {
            ...item,
            description: summarizedDescription,
            category: "summarized"
          };
        });
        
        setNewsItems(allItems);
        setSummarizedItems(summaries);
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

  const getDisplayItems = () => {
    if (selectedCategory === "summarized") {
      return summarizedItems;
    } else if (selectedCategory === "all") {
      return newsItems;
    } else {
      return newsItems.filter(item => item.category === selectedCategory);
    }
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
        <AlertDescription>
          {selectedCategory === "all" 
            ? "No news articles found." 
            : `No news articles found in the ${selectedCategory} category.`}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {selectedCategory === "all" 
          ? "All News" 
          : selectedCategory === "summarized"
            ? "Summarized News"
            : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
        {displayItems.map((item, index) => (
          <NewsItem key={index} {...item} sourceName={item.sourceName} />
        ))}
      </div>
    </div>
  );
};

export default CategorizedNewsList;
