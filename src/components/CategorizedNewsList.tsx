
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { checkApiAvailability } from "@/utils/llmService";
import NewsLoadingState from "@/components/news/NewsLoadingState";
import NewsCarousel from "@/components/news/NewsCarousel";
import { fetchNewsArticle, processNewsArticle, getSampleNewsData } from "@/services/newsService";

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
  const { toast } = useToast();

  useEffect(() => {
    const status = checkApiAvailability();
    setApiStatus(status);
    console.log("API Status:", status);
  }, []);

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
        
        toast({
          title: "News Summary Generated",
          description: "A comprehensive news summary has been created using AI",
        });
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
          toast({
            title: "Error Loading News",
            description: "Could not generate news summary. Please try again later.",
            variant: "destructive"
          });
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialNewsItem();
  }, [toast]);

  const loadNextNews = async () => {
    try {
      // Show loading state for the next item
      toast({
        title: "Loading next news...",
        description: "Please wait while we fetch the next article",
      });
      
      // Fetch next news article
      const article = await fetchNewsArticle();
      
      // Process the article
      const scriptData = await processNewsArticle(article);
      
      // Add the new script to our collection
      setScripts(prev => [...prev, {
        id: crypto.randomUUID(),
        ...scriptData
      }]);
      
      toast({
        title: "New Article Loaded",
        description: "Swipe to view the new article",
      });
    } catch (error) {
      console.error("Error loading next news:", error);
      toast({
        title: "Error Loading Next Article",
        description: "Could not load the next article. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <NewsLoadingState />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">News Summary</h2>
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
