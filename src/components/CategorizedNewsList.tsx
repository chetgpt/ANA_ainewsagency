
import { useState, useEffect } from "react";
import NewsItem, { NewsItemProps } from "./NewsItem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { categorizeNewsItem } from "@/utils/newsCategories";

interface CategorizedNewsListProps {
  feedUrl: string;
  selectedCategory: string;
}

const CategorizedNewsList = ({ feedUrl, selectedCategory }: CategorizedNewsListProps) => {
  const [newsItems, setNewsItems] = useState<(NewsItemProps & { category: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRssFeed = async () => {
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
          
          const newsItem = {
            title,
            description,
            pubDate,
            link,
            imageUrl: imageUrl || undefined,
            category: categorizeNewsItem(title, description)
          };
          
          parsedItems.push(newsItem);
        }
        
        setNewsItems(parsedItems);
        setLoading(false);
        setError("");
      } catch (err) {
        console.error("Error fetching RSS feed:", err);
        setError("Failed to load news. Please try again later.");
        setLoading(false);
      }
    };

    fetchRssFeed();
  }, [feedUrl]);

  const filteredNewsItems = selectedCategory === "all" 
    ? newsItems 
    : newsItems.filter(item => item.category === selectedCategory);

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

  if (filteredNewsItems.length === 0) {
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
        {selectedCategory === "all" ? "All News" : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
        {filteredNewsItems.map((item, index) => (
          <NewsItem key={index} {...item} />
        ))}
      </div>
    </div>
  );
};

export default CategorizedNewsList;
