
import { useState, useEffect } from "react";
import { checkApiAvailability } from "@/utils/llmService";
import NewsLoadingState from "@/components/news/NewsLoadingState";
import NewsCarousel from "@/components/news/NewsCarousel";
import { fetchNewsArticle, processNewsArticle, getSampleNewsData, preloadMultipleNews } from "@/services/newsService";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

const CategorizedNewsList = ({ selectedCategory }: CategorizedNewsListProps) => {
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<{
    geminiAvailable: boolean;
    perplexityAvailable: boolean;
  }>({ geminiAvailable: false, perplexityAvailable: false });
  const [scripts, setScripts] = useState<Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    summary?: {
      description: string;
      sentiment: "positive" | "negative" | "neutral";
      keywords: string[];
      readingTimeSeconds: number;
      pubDate: string;
      sourceName: string;
    }
  }>>([]);
  // Queue of pre-loaded news items ready to be displayed
  const [preloadedNews, setPreloadedNews] = useState<Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    summary?: {
      description: string;
      sentiment: "positive" | "negative" | "neutral";
      keywords: string[];
      readingTimeSeconds: number;
      pubDate: string;
      sourceName: string;
    }
  }>>([]);
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    const status = checkApiAvailability();
    setApiStatus(status);
    console.log("API Status:", status);
  }, []);

  // Function to pre-fetch multiple news articles
  const preloadNextBatchOfNews = async () => {
    if (isPreloading) return; // Don't start another preload if one is already in progress
    
    try {
      setIsPreloading(true);
      console.log("Preloading next batch of news articles...");
      
      // Get multiple articles from the queue
      const articles = await preloadMultipleNews(3);
      console.log(`Got ${articles.length} articles to process`);
      
      // Process each article in parallel
      const processPromises = articles.map(async (article) => {
        try {
          const scriptData = await processNewsArticle(article);
          return {
            id: crypto.randomUUID(),
            ...scriptData
          };
        } catch (error) {
          console.error("Error processing article:", error);
          return null;
        }
      });
      
      // Wait for all articles to be processed
      const processedArticles = await Promise.all(processPromises);
      
      // Filter out any failed articles
      const validArticles = processedArticles.filter(article => article !== null) as Array<{
        id: string;
        title: string;
        content: string;
        type: string;
        summary?: {
          description: string;
          sentiment: "positive" | "negative" | "neutral";
          keywords: string[];
          readingTimeSeconds: number;
          pubDate: string;
          sourceName: string;
        }
      }>;
      
      // Add the processed articles to our queue
      setPreloadedNews(prev => [...prev, ...validArticles]);
      
      console.log(`${validArticles.length} news articles preloaded successfully`);
    } catch (error) {
      console.error("Error preloading news batch:", error);
    } finally {
      setIsPreloading(false);
    }
  };

  useEffect(() => {
    const fetchInitialNewsItem = async () => {
      setLoading(true);
      
      try {
        // Fetch first news article from RSS feed
        const article = await fetchNewsArticle();
        
        // Process the article to generate script
        const scriptData = await processNewsArticle(article);
        
        setScripts([{
          id: crypto.randomUUID(),
          ...scriptData
        }]);
        
        // Start preloading the next batch of news articles
        preloadNextBatchOfNews();
      } catch (error) {
        console.error("Error fetching news:", error);
        
        // Fallback to sample data if fetching fails
        const sampleNewsItem = getSampleNewsData();
        
        // Generate script with sample data
        try {
          const scriptData = await processNewsArticle(sampleNewsItem);
          
          setScripts([{
            id: crypto.randomUUID(),
            ...scriptData
          }]);
        } catch (fallbackError) {
          console.error("Error with fallback data:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialNewsItem();
  }, []);

  const loadNextNews = async () => {
    console.log(`Loading next news. Preloaded: ${preloadedNews.length}, Current: ${scripts.length}`);
    
    // If we have preloaded news, use it
    if (preloadedNews.length > 0) {
      // Get the first preloaded news item
      const nextNews = preloadedNews[0];
      
      // Remove it from the preloaded queue
      setPreloadedNews(prev => prev.slice(1));
      
      // Add it to the displayed scripts
      setScripts(prev => [...prev, nextNews]);
      
      // If our preloaded queue is getting low, preload more
      if (preloadedNews.length < 3 && !isPreloading) {
        preloadNextBatchOfNews();
      }
    } else {
      // If no preloaded news is available, fetch it on demand
      try {
        // Fetch next news article
        const article = await fetchNewsArticle();
        
        // Process the article
        const scriptData = await processNewsArticle(article);
        
        // Add the new script to our collection
        setScripts(prev => [...prev, {
          id: crypto.randomUUID(),
          ...scriptData
        }]);
        
        // Start preloading more articles for future use
        preloadNextBatchOfNews();
      } catch (error) {
        console.error("Error loading next news:", error);
      }
    }
  };

  if (loading) {
    return <NewsLoadingState />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">News Summary</h2>
        <div className="text-sm text-gray-500">
          {preloadedNews.length > 0 && (
            <span>{preloadedNews.length} articles ready</span>
          )}
        </div>
      </div>
      
      {scripts.length === 0 ? (
        <NewsLoadingState message="Generating news summary..." />
      ) : (
        <NewsCarousel scripts={scripts} onLoadMore={loadNextNews} />
      )}
    </div>
  );
};

export default CategorizedNewsList;
