
import { useState, useEffect } from "react";
import { Loader2, FileText, Copy, Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { generateNewsScript, analyzeSentiment, extractKeywords, calculateReadingTime, fetchArticleContent } from "@/utils/textAnalysis";
import { Button } from "@/components/ui/button";
import { checkApiAvailability } from "@/utils/llmService";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

// Define the script type outside the component to improve readability
interface NewsScript {
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
    link: string;
  }
}

const MAX_NEWS_ITEMS = 10; // Increased from 5 to 10 maximum news items to fetch and process

const CategorizedNewsList = ({ selectedCategory }: CategorizedNewsListProps) => {
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<{
    geminiAvailable: boolean;
    perplexityAvailable: boolean;
  }>({ geminiAvailable: false, perplexityAvailable: false });
  // Now we store an array of scripts instead of a single one
  const [scripts, setScripts] = useState<NewsScript[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const { toast } = useToast();

  // Calculate the total number of pages - show 2 news items per page
  const totalPages = Math.max(1, Math.ceil(scripts.length / 2));
  // Get items for the current page (2 per page)
  const currentScripts = scripts.slice(currentPage * 2, (currentPage + 1) * 2);

  useEffect(() => {
    const status = checkApiAvailability();
    setApiStatus(status);
    console.log("API Status:", status);
  }, []);

  useEffect(() => {
    const fetchMultipleNewsItems = async () => {
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
        
        // Get all items from the feed
        const allItems = xmlDoc.querySelectorAll("item");
        console.log(`Found ${allItems.length} items in the RSS feed`);
        
        // Sort items by date (newest first) if they have pubDate
        const sortedItems: Element[] = [];
        allItems.forEach(item => sortedItems.push(item));
        
        sortedItems.sort((a, b) => {
          const dateA = new Date(a.querySelector("pubDate")?.textContent || "").getTime();
          const dateB = new Date(b.querySelector("pubDate")?.textContent || "").getTime();
          return dateB - dateA; // Sort in descending order (newest first)
        });
        
        // Process multiple items (limited to MAX_NEWS_ITEMS)
        const itemsToProcess = Math.min(sortedItems.length, MAX_NEWS_ITEMS);
        const newsScripts: NewsScript[] = [];
        
        for (let i = 0; i < itemsToProcess; i++) {
          const item = sortedItems[i];
          
          // Extract the item data
          const title = item.querySelector("title")?.textContent || "No title";
          const description = item.querySelector("description")?.textContent || "";
          const pubDate = item.querySelector("pubDate")?.textContent || new Date().toUTCString();
          const link = item.querySelector("link")?.textContent || "#";
          
          console.log(`Processing news item ${i+1}:`, { 
            title, 
            description: description.substring(0, 50) + "...", 
            pubDate 
          });
          
          // Use description for analysis (simplified for multiple items)
          const contentToAnalyze = description;
          const combinedText = title + " " + contentToAnalyze;
          
          // Perform simple analysis
          const sentiment = analyzeSentiment(combinedText);
          const keywords = extractKeywords(combinedText, 3);
          const readingTimeSeconds = calculateReadingTime(contentToAnalyze);
          
          // Create a news item object with the required information
          const newsItem = {
            title,
            description,
            fullContent: description, // Use description as full content to speed up processing
            sentiment,
            keywords,
            readingTimeSeconds,
            pubDate,
            link,
            sourceName: "ABC News",
          };
          
          // Generate a script for the news item
          const newsScript = await generateNewsScript(newsItem);
          
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
              sourceName: newsItem.sourceName,
              link: newsItem.link
            }
          };
          
          newsScripts.push(scriptData);
        }
        
        setScripts(newsScripts);
        
        toast({
          title: "News Summaries Generated",
          description: `${newsScripts.length} latest news summaries have been created`,
        });
      } catch (error) {
        console.error("Error fetching news:", error);
        
        // Fallback to sample data if fetching fails
        const sampleNewsScripts: NewsScript[] = [];
        
        for (let i = 0; i < 3; i++) {
          const sampleNewsItem = {
            title: `Sample News ${i + 1} from ABC News`,
            description: `This is sample news article ${i + 1} to demonstrate the functionality when the actual feed cannot be fetched.`,
            fullContent: `This is sample news article ${i + 1} from ABC News to demonstrate the functionality when the actual feed cannot be fetched. The content is shown here as a placeholder.`,
            sentiment: "neutral" as const,
            keywords: ["ABC News", "sample", "news"],
            readingTimeSeconds: 60 + i * 30,
            pubDate: new Date().toUTCString(),
            link: "#",
            sourceName: "ABC News",
          };
          
          const newsScript = await generateNewsScript(sampleNewsItem);
          
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
              sourceName: sampleNewsItem.sourceName,
              link: sampleNewsItem.link
            }
          };
          
          sampleNewsScripts.push(scriptData);
        }
        
        setScripts(sampleNewsScripts);
        
        toast({
          title: "Using Sample Data",
          description: "Couldn't fetch news, using sample data instead",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMultipleNewsItems();
  }, [toast]);

  const formatReadingTime = (seconds: number) => {
    return seconds < 60 
      ? `${seconds}s read` 
      : `${Math.floor(seconds / 60)}m read`;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add refresh function to get the latest news
  const refreshNews = async () => {
    setLoading(true);
    toast({
      title: "Refreshing News",
      description: "Fetching the latest news updates...",
    });
    
    try {
      // Fetch the latest news again
      const corsProxy = "https://api.allorigins.win/raw?url=";
      const rssUrl = "https://abcnews.go.com/abcnews/topstories";
      const response = await fetch(`${corsProxy}${encodeURIComponent(rssUrl)}`, {
        cache: "no-store" // Ensure we don't use cached data
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status}`);
      }
      
      const data = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, "text/xml");
      
      const allItems = xmlDoc.querySelectorAll("item");
      
      // Sort items by date (newest first)
      const sortedItems: Element[] = [];
      allItems.forEach(item => sortedItems.push(item));
      
      sortedItems.sort((a, b) => {
        const dateA = new Date(a.querySelector("pubDate")?.textContent || "").getTime();
        const dateB = new Date(b.querySelector("pubDate")?.textContent || "").getTime();
        return dateB - dateA;
      });
      
      const itemsToProcess = Math.min(sortedItems.length, MAX_NEWS_ITEMS);
      const newsScripts: NewsScript[] = [];
      
      for (let i = 0; i < itemsToProcess; i++) {
        const item = sortedItems[i];
        
        const title = item.querySelector("title")?.textContent || "No title";
        const description = item.querySelector("description")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || new Date().toUTCString();
        const link = item.querySelector("link")?.textContent || "#";
        
        const contentToAnalyze = description;
        const combinedText = title + " " + contentToAnalyze;
        
        const sentiment = analyzeSentiment(combinedText);
        const keywords = extractKeywords(combinedText, 3);
        const readingTimeSeconds = calculateReadingTime(contentToAnalyze);
        
        const newsItem = {
          title,
          description,
          fullContent: description,
          sentiment,
          keywords,
          readingTimeSeconds,
          pubDate,
          link,
          sourceName: "ABC News",
        };
        
        const newsScript = await generateNewsScript(newsItem);
        
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
            sourceName: newsItem.sourceName,
            link: newsItem.link
          }
        };
        
        newsScripts.push(scriptData);
      }
      
      setScripts(newsScripts);
      setCurrentPage(0); // Reset to first page
      
      toast({
        title: "News Updated",
        description: `${newsScripts.length} latest news summaries have been refreshed`,
      });
    } catch (error) {
      console.error("Error refreshing news:", error);
      toast({
        title: "Refresh Failed",
        description: "Couldn't refresh the news feed. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Generating news summaries...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">News Summaries</h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Showing {scripts.length} latest articles from ABC News
          </div>
          <button
            onClick={refreshNews}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <Loader2 className="h-3 w-3 mr-1" />
            Refresh Latest
          </button>
        </div>
      </div>
      
      {scripts.length === 0 ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mr-2" />
          <span className="text-gray-600">No news available at the moment</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 py-4">
            {currentScripts.map((script, index) => (
              <Card key={index} className="h-full hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {script.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{new Date(script.summary?.pubDate || "").toLocaleDateString()}</span>
                    {script.summary?.readingTimeSeconds && (
                      <span>• {formatReadingTime(script.summary.readingTimeSeconds)}</span>
                    )}
                    {script.summary?.link && script.summary.link !== "#" && (
                      <a 
                        href={script.summary.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline ml-auto"
                      >
                        Read original
                      </a>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-md border mb-4">
                    <div className="whitespace-pre-wrap text-sm">{script.content}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {script.summary?.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline">{keyword}</Badge>
                    ))}
                    {script.summary?.sentiment && (
                      <Badge 
                        variant={
                          script.summary.sentiment === "positive" ? "default" : 
                          script.summary.sentiment === "negative" ? "destructive" : 
                          "outline"
                        }
                      >
                        {script.summary.sentiment}
                      </Badge>
                    )}
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
            ))}
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <Pagination className="my-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                    className={currentPage === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink 
                      onClick={() => handlePageChange(i)}
                      isActive={currentPage === i}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                    className={currentPage === totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
};

export default CategorizedNewsList;
