
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
   * Processes news items for display based on category and desired text length.
   * Always removes HTML tags from descriptions.
   * Allows specifying a maximum length for truncation (primarily for 'summarized' view).
   *
   * @param {number} [maxLength=Infinity] - The maximum number of characters for the description
   * in the 'summarized' view. Defaults to Infinity (no truncation)
   * if not provided or if not in 'summarized' view.
   * @returns {Array} An array of processed news items.
   */
  const getDisplayItems = (maxLength = Infinity) => { // Use Infinity for default "no limit"
    // --- Make sure newsItems is an array before processing ---
    if (!Array.isArray(newsItems)) {
      console.error("getDisplayItems: newsItems is not an array.");
      return []; // Return empty array if newsItems isn't valid
    }

    // 1. Create a base list with HTML stripped from descriptions
    const textOnlyItems = newsItems.map(item => {
      // Ensure description exists and is a string before trying to replace
      const descriptionText = (typeof item.description === 'string')
        ? item.description.replace(/<[^>]*>?/gm, '') // Remove HTML tags
        : ''; // Use empty string if description is missing or not a string
      return {
        ...item,
        description: descriptionText // Store the plain text description
      };
    });

    // 2. Apply category filtering or summarization logic
    if (selectedCategory === "summarized") {
      // Summarized view: Truncate the text-only descriptions if they exceed maxLength
      return textOnlyItems.map(item => {
        const needsTruncation = maxLength !== Infinity && item.description.length > maxLength;
        const finalDescription = needsTruncation
          ? item.description.substring(0, maxLength) + "..." // Truncate
          : item.description; // Use full text-only description

        return {
          ...item,
          description: finalDescription
        };
      });
    } else if (selectedCategory === "all") {
      // All view: Return all items with their full text-only descriptions
      return textOnlyItems;
    } else {
      // Specific category view: Filter the text-only items by category
      return textOnlyItems.filter(item => item.category === selectedCategory);
    }
  };

  // Use a 100-character limit for summarized view
  const displayItems = selectedCategory === "summarized" 
    ? getDisplayItems(100) 
    : getDisplayItems();

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
