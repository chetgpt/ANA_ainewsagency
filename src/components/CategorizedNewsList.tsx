import { useState, useEffect } from "react";
import { Loader2, FileText, Copy, Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { generateNewsScript, analyzeSentiment, extractKeywords, calculateReadingTime, fetchArticleContent } from "@/utils/textAnalysis";
import { Button } from "@/components/ui/button";
import { checkApiAvailability } from "@/utils/llmService";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

const CategorizedNewsList = ({ selectedCategory }: CategorizedNewsListProps) => {
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<{
    geminiAvailable: boolean;
    perplexityAvailable: boolean;
  }>({ geminiAvailable: false, perplexityAvailable: false });
  const [script, setScript<{
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
        // Use ABC News RSS feed with a CORS proxy
        const corsProxy = "https://api.allorigins.win/raw?url=";
        const rssUrl = "https://abcnews.go.com/abcnews/topstories";
        const response = await fetch(`${corsProxy}${encodeURIComponent(rssUrl)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch RSS feed: ${response.status}`);
        }
        
        const data = await response.text();
        console.log("RSS data fetched successfully with length:", data.length);
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        
        // Get all items from the feed for debugging
        const allItems = xmlDoc.querySelectorAll("item");
        console.log(`Found ${allItems.length} items in the RSS feed`);
        
        // Get the first item from the feed
        const firstItem = xmlDoc.querySelector("item");
        
        if (!firstItem) {
          throw new Error("No items found in RSS feed");
        }
        
        // Extract the item data
        const title = firstItem.querySelector("title")?.textContent || "No title";
        const description = firstItem.querySelector("description")?.textContent || "";
        const pubDate = firstItem.querySelector("pubDate")?.textContent || new Date().toUTCString();
        const link = firstItem.querySelector("link")?.textContent || "#";
        
        console.log("Extracted news item data:", { 
          title, 
          description: description.substring(0, 100) + "...", 
          pubDate, 
          link 
        });
        
        // Fetch full article content
        console.log("Fetching full article content from link:", link);
        let articleContent = "";
        try {
          articleContent = await fetchArticleContent(link);
          console.log("Fetched article content length:", articleContent.length);
        } catch (err) {
          console.error("Error fetching article content:", err);
          articleContent = description; // Fallback to description
        }
        
        // Use either full article content or description for analysis
        const contentToAnalyze = articleContent || description;
        const combinedText = title + " " + contentToAnalyze;
        
        // Perform simple analysis
        const sentiment = analyzeSentiment(combinedText);
        const keywords = extractKeywords(combinedText, 3);
        const readingTimeSeconds = calculateReadingTime(contentToAnalyze);
        
        console.log("Analysis results:", { sentiment, keywords, readingTimeSeconds });
        
        // Create a news item object with the required information
        const newsItem = {
          title,
          description,
          fullContent: articleContent,
          sentiment,
          keywords,
          readingTimeSeconds,
          pubDate,
          link,
          sourceName: "ABC News",
        };
        
        // Generate a script for the news item - now async function
        const newsScript = await generateNewsScript(newsItem);
        console.log("Generated script with length:", newsScript.length);
        
        const scriptData = {
          title: newsItem.title,
          content: newsScript,
          type: 'single',
          summary: {
            description: newsItem.description,
            sentiment: newsItem.sentiment,
            keywords: newsItem.keywords,
            readingTimeSeconds: newsItem.readingTimeSeconds,
            pubDate: newsItem.pubDate,
            sourceName: newsItem.sourceName
          }
        };
        
        setScript(scriptData);
        
        toast({
          title: "News Summary Generated",
          description: "A comprehensive news summary has been created using AI",
        });
      } catch (error) {
        console.error("Error fetching news:", error);
        
        // Fallback to sample data if fetching fails
        const sampleNewsItem = {
          title: "Breaking news from ABC News",
          description: "This is a sample news article from ABC News to demonstrate the functionality when the actual feed cannot be fetched.",
          fullContent: "This is a sample news article from ABC News to demonstrate the functionality when the actual feed cannot be fetched. The content is shown here as a placeholder. In a real scenario, this would contain the full article text that would be analyzed and summarized.",
          sentiment: "neutral" as const,
          keywords: ["ABC News", "sample", "news"],
          readingTimeSeconds: 120,
          pubDate: new Date().toUTCString(),
          link: "#",
          sourceName: "ABC News",
        };
        
        // Generate script - now async function
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

  const formatReadingTime = (seconds: number) => {
    return seconds < 60 
      ? `${seconds}s read` 
      : `${Math.floor(seconds / 60)}m read`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Generating news summary...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">News Summary</h2>
      </div>
      
      {!script ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mr-2" />
          <span className="text-gray-600">Generating news summary...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 py-4">
          <Card className="h-full hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {script.title}
              </CardTitle>
              <div className="text-xs text-gray-500 mt-1">
                {script.type === 'group' ? 'Multiple Related Articles' : 'Complete Summary'}
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-md border mb-4">
                <div className="whitespace-pre-wrap text-sm">{script.content}</div>
              </div>
              <div className="flex justify-end">
                <button 
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-md transition-colors"
                  onClick={() => {
                    if (script?.content) {
                      navigator.clipboard.writeText(script.content);
                      toast({
                        title: "Copied to clipboard",
                        description: "The news summary has been copied to your clipboard",
                      });
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy summary
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CategorizedNewsList;
