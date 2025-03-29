import { useState, useEffect } from "react";
import NewsItem, { NewsItemProps } from "./NewsItem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, BarChart } from "lucide-react";
import { NEWS_SOURCES } from "./NewsSourceSelector";
import { analyzeSentiment } from "@/utils/textAnalysis";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

const CategorizedNewsList = ({ selectedCategory }: CategorizedNewsListProps) => {
  const [newsItems, setNewsItems] = useState<(NewsItemProps & { category: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysisStats, setAnalysisStats] = useState({
    positive: 0,
    negative: 0,
    neutral: 0
  });

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
        
        // Calculate sentiment distribution
        const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
        allItems.forEach(item => {
          const sentiment = analyzeSentiment(item.title + " " + item.description);
          sentimentCounts[sentiment]++;
        });
        setAnalysisStats(sentimentCounts);
        
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
  const totalArticles = displayItems.length;

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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Summarized News</h2>
        <div className="flex items-center gap-1 text-sm bg-gray-100 px-3 py-1 rounded-full">
          <BarChart className="h-4 w-4 text-gray-600" />
          <span>{totalArticles} Articles</span>
          <span className="mx-1">•</span>
          <span className="text-green-600">{analysisStats.positive} Positive</span>
          <span className="mx-1">•</span>
          <span className="text-red-600">{analysisStats.negative} Negative</span>
          <span className="mx-1">•</span>
          <span className="text-blue-600">{analysisStats.neutral} Neutral</span>
          <span className="mx-1">•</span>
          <span className="text-gray-600">Hover for full analysis</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
        {displayItems.map((item, index) => (
          <NewsItem key={index} {...item} sourceName={item.sourceName} />
        ))}
      </div>
    </div>
  );
};

export default CategorizedNewsList;
