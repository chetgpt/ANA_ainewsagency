
import { useState, useEffect } from "react";
import NewsItem, { NewsItemProps } from "./NewsItem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { analyzeSentiment, extractKeywords, calculateReadingTime } from "@/utils/textAnalysis";

interface NewsListProps {
  feedUrl: string;
}

const NewsList = ({ feedUrl }: NewsListProps) => {
  const [newsItems, setNewsItems] = useState<NewsItemProps[]>([]);
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
        const parsedItems: NewsItemProps[] = [];
        
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
          const description = item.querySelector("description")?.textContent || "";
          
          // Perform basic analysis on the title and description
          const combinedText = title + " " + description;
          const sentiment = analyzeSentiment(combinedText);
          const keywords = extractKeywords(combinedText, 3);
          const readingTimeSeconds = calculateReadingTime(description);
          
          parsedItems.push({
            title,
            description,
            pubDate: item.querySelector("pubDate")?.textContent || new Date().toUTCString(),
            link: item.querySelector("link")?.textContent || "#",
            imageUrl: imageUrl || undefined,
            sourceName: "", // No source name in this component
            sentiment,
            keywords,
            readingTimeSeconds
          });
        });
        
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
      {newsItems.map((item, index) => (
        <NewsItem key={index} {...item} />
      ))}
    </div>
  );
};

export default NewsList;
