
import { useState, useEffect } from "react";
import NewsItem, { NewsItemProps } from "./NewsItem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, BarChart } from "lucide-react";
import { NEWS_SOURCES } from "./NewsSourceSelector";
import { analyzeSentiment, fullAnalyzeArticle } from "@/utils/textAnalysis";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

interface NewsItemFullProps extends NewsItemProps {
  category: string;
  isFullyAnalyzed: boolean;
}

const CategorizedNewsList = ({ selectedCategory }: CategorizedNewsListProps) => {
  const [rawNewsItems, setRawNewsItems] = useState<any[]>([]);
  const [processedNewsItems, setProcessedNewsItems] = useState<NewsItemFullProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState({ total: 0, completed: 0 });
  const [error, setError] = useState("");
  const [analysisStats, setAnalysisStats] = useState({
    positive: 0,
    negative: 0,
    neutral: 0
  });

  // Fetch all RSS feeds
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
              
              // Strip HTML from description
              const descriptionText = description.replace(/<[^>]*>?/gm, '');
              const truncatedDescription = descriptionText.length > 100
                ? descriptionText.substring(0, 100) + "..."
                : descriptionText;
              
              const newsItem = {
                title,
                description: truncatedDescription,
                pubDate,
                link,
                sourceName,
                category: "summarized",
                isFullyAnalyzed: false
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
        
        setRawNewsItems(allItems);
        setAnalysisProgress({ total: allItems.length, completed: 0 });
        setLoading(false);
      } catch (err) {
        console.error("Error fetching RSS feeds:", err);
        setError("Failed to load news. Please try again later.");
        setLoading(false);
      }
    };

    fetchAllRssFeeds();
  }, []);

  // Process news items - analyze full content in the background
  useEffect(() => {
    if (rawNewsItems.length === 0 || loading) return;

    // Start with an empty array of processed items
    const processedItems: NewsItemFullProps[] = [];
    setProcessedNewsItems(processedItems);
    
    // Process each news item sequentially to avoid overloading
    const processNewsItems = async () => {
      const tempSentimentCounts = { positive: 0, negative: 0, neutral: 0 };
      
      for (let i = 0; i < rawNewsItems.length; i++) {
        const item = rawNewsItems[i];
        try {
          // Full analysis
          const analysis = await fullAnalyzeArticle({
            title: item.title,
            description: item.description,
            link: item.link
          });
          
          const fullyAnalyzedItem: NewsItemFullProps = {
            ...item,
            sentiment: analysis.sentiment,
            keywords: analysis.keywords,
            readingTimeSeconds: analysis.readingTimeSeconds,
            isFullyAnalyzed: true
          };
          
          // Update sentiment counts
          tempSentimentCounts[analysis.sentiment]++;
          
          // Add to processed items
          processedItems.push(fullyAnalyzedItem);
          
          // Update state
          setProcessedNewsItems([...processedItems]);
          setAnalysisProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
          setAnalysisStats({ ...tempSentimentCounts });
        } catch (error) {
          console.error(`Error analyzing article ${item.title}:`, error);
          // Skip this item, don't add to processed items
        }
      }
    };
    
    processNewsItems();
  }, [rawNewsItems, loading]);

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

  if (processedNewsItems.length === 0 && analysisProgress.completed === 0) {
    return (
      <div className="flex flex-col items-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <span className="text-gray-600">Analyzing full articles...</span>
        <span className="text-sm text-gray-500 mt-2">
          This may take a while. Full articles will appear as they are processed.
        </span>
      </div>
    );
  }

  const totalProcessed = processedNewsItems.length;
  const percentComplete = analysisProgress.total 
    ? Math.round((analysisProgress.completed / analysisProgress.total) * 100) 
    : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Fully Analyzed News</h2>
        <div className="flex items-center gap-1 text-sm bg-gray-100 px-3 py-1 rounded-full">
          <BarChart className="h-4 w-4 text-gray-600" />
          <span>{totalProcessed} of {analysisProgress.total} Articles ({percentComplete}%)</span>
          <span className="mx-1">•</span>
          <span className="text-green-600">{analysisStats.positive} Positive</span>
          <span className="mx-1">•</span>
          <span className="text-red-600">{analysisStats.negative} Negative</span>
          <span className="mx-1">•</span>
          <span className="text-blue-600">{analysisStats.neutral} Neutral</span>
        </div>
      </div>
      
      {processedNewsItems.length === 0 ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mr-2" />
          <span className="text-gray-600">Processing articles in the background...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
          {processedNewsItems.map((item, index) => (
            <NewsItem 
              key={index} 
              title={item.title}
              description={item.description}
              pubDate={item.pubDate}
              link={item.link}
              sourceName={item.sourceName}
              sentiment={item.sentiment}
              keywords={item.keywords}
              readingTimeSeconds={item.readingTimeSeconds}
            />
          ))}
        </div>
      )}
      
      {analysisProgress.completed < analysisProgress.total && (
        <div className="flex justify-center mt-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin mr-2" />
          Processing {analysisProgress.completed} of {analysisProgress.total} articles...
        </div>
      )}
    </div>
  );
};

export default CategorizedNewsList;
