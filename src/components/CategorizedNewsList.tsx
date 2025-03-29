
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { checkApiAvailability } from "@/utils/llmService";
import { generateNewsScript } from "@/utils/textAnalysis";
import NewsLoadingState from "@/components/news/NewsLoadingState";
import NewsScriptCard from "@/components/news/NewsScriptCard";
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
  const [script, setScript] = useState<{
    title: string, 
    content: string, 
    type: string,
    summary?: {
      description: string;
      sentiment: "positive" | "negative" | "neutral";
      keywords: string[];
      readingTimeSeconds: number;
      pubDate: string;
      sourceName: string;
    }
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const status = checkApiAvailability();
    setApiStatus(status);
    console.log("API Status:", status);
  }, []);

  useEffect(() => {
    const fetchSingleNewsItem = async () => {
      setLoading(true);
      
      try {
        // Fetch news article from RSS feed
        const article = await fetchNewsArticle();
        
        // Process the article to generate script
        const scriptData = await processNewsArticle(article);
        
        setScript(scriptData);
        
        toast({
          title: "News Summary Generated",
          description: "A comprehensive news summary has been created using AI",
        });
      } catch (error) {
        console.error("Error fetching news:", error);
        
        // Fallback to sample data if fetching fails
        const sampleNewsItem = getSampleNewsData();
        
        // Generate script with sample data
        const generateFallbackScript = async () => {
          const newsScript = await generateNewsScript(sampleNewsItem);
          console.log("Generated fallback script with sample data");
          
          const scriptData = {
            title: sampleNewsItem.title,
            content: newsScript,
            type: 'single',
            summary: {
              description: sampleNewsItem.description,
              sentiment: sampleNewsItem.sentiment,
              keywords: sampleNewsItem.keywords,
              readingTimeSeconds: sampleNewsItem.readingTimeSeconds,
              pubDate: sampleNewsItem.pubDate,
              sourceName: sampleNewsItem.sourceName
            }
          };
          
          setScript(scriptData);
        };
        
        generateFallbackScript();
        
        toast({
          title: "Using Sample Data",
          description: "Couldn't fetch news, using sample data instead",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSingleNewsItem();
  }, [toast]);

  if (loading) {
    return <NewsLoadingState />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">News Summary</h2>
      </div>
      
      {!script ? (
        <NewsLoadingState message="Generating news summary..." />
      ) : (
        <div className="grid grid-cols-1 gap-6 py-4">
          <NewsScriptCard script={script} />
        </div>
      )}
    </div>
  );
};

export default CategorizedNewsList;
