import { useState, useEffect } from "react";
import { Loader2, FileText, Copy, Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { generateNewsScript, analyzeSentiment, extractKeywords, calculateReadingTime, fetchArticleContent, groupSimilarNews } from "@/utils/textAnalysis";
import { Button } from "@/components/ui/button";
import { checkApiAvailability } from "@/utils/llmService";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { NEWS_SOURCES } from "./NewsSourceSelector";

interface CategorizedNewsListProps {
  selectedCategory: string;
  refreshTrigger?: number;
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
    mediaUrl?: string;
    mediaType?: "image" | "video";
  }
}

const MAX_NEWS_ITEMS_PER_SOURCE = 3; // Get 3 items from each source
const MAX_TOTAL_NEWS_ITEMS = 20; // Max total items to process

// Rate limiting - 13 requests per minute
const MAX_REQUESTS_PER_MINUTE = 13;
let requestsThisMinute = 0;
let lastRequestResetTime = Date.now();

const resetRequestCounter = () => {
  const now = Date.now();
  if (now - lastRequestResetTime >= 60000) {
    requestsThisMinute = 0;
    lastRequestResetTime = now;
  }
};

const CategorizedNewsList = ({ selectedCategory, refreshTrigger = 0 }: CategorizedNewsListProps) => {
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
    fetchAllNewsSources();
  }, [toast, refreshTrigger]);

  // Check rate limit before making LLM API calls
  const checkRateLimit = () => {
    resetRequestCounter();
    
    if (requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
      toast({
        title: "Rate limit reached",
        description: "Please try again in a minute",
        variant: "destructive",
      });
      return false;
    }
    
    requestsThisMinute++;
    return true;
  };

  // Fetch news from all sources
  const fetchAllNewsSources = async () => {
    setLoading(true);
    toast({
      title: "Fetching News",
      description: "Getting the latest news from multiple sources...",
    });
    
    try {
      // Array to store all news items from different sources
      let allNewsItems: any[] = [];
      
      // Fetch from each news source
      for (const source of NEWS_SOURCES) {
        try {
          const items = await fetchNewsFromSource(source.feedUrl, source.name);
          allNewsItems = [...allNewsItems, ...items];
        } catch (error) {
          console.error(`Error fetching from ${source.name}:`, error);
          // Continue with other sources if one fails
        }
      }
      
      // Sort all items by date (newest first)
      allNewsItems.sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime();
        const dateB = new Date(b.pubDate).getTime();
        return dateB - dateA;
      });
      
      // Limit to max total items
      allNewsItems = allNewsItems.slice(0, MAX_TOTAL_NEWS_ITEMS);
      
      // Check rate limit before proceeding with LLM operations
      if (!checkRateLimit()) {
        setLoading(false);
        return;
      }
      
      // Group similar news items using LLM
      const groupedItems = groupSimilarNews(allNewsItems);
      
      // Process grouped items into scripts
      const newsScripts: NewsScript[] = [];
      
      for (const item of groupedItems) {
        try {
          // Check rate limit before each LLM operation
          if (!checkRateLimit()) {
            break;
          }
          
          // Check if this is a group or individual item
          if (item.type === 'group') {
            // Handle group of similar news
            const groupScript = await generateNewsScript(item);
            
            const scriptData: NewsScript = {
              title: `Combined: ${item.items[0].title}`,
              content: groupScript,
              type: 'group',
              summary: {
                description: groupScript.substring(0, 150) + "...",
                sentiment: item.sentiment,
                keywords: item.keywords,
                readingTimeSeconds: item.readingTimeSeconds,
                pubDate: item.items[0].pubDate,
                sourceName: item.items.map((i: any) => i.sourceName).join(', '),
                link: item.items[0].link,
              }
            };
            
            // Add first item's media if available
            if (item.items[0].mediaUrl) {
              scriptData.summary!.mediaUrl = item.items[0].mediaUrl;
              scriptData.summary!.mediaType = item.items[0].mediaType;
            }
            
            newsScripts.push(scriptData);
          } else {
            // Handle individual news item
            const newsScript = await generateNewsScript(item);
            
            const scriptData: NewsScript = {
              title: item.title,
              content: newsScript,
              type: 'single',
              summary: {
                description: item.description,
                sentiment: item.sentiment,
                keywords: item.keywords,
                readingTimeSeconds: item.readingTimeSeconds,
                pubDate: item.pubDate,
                sourceName: item.sourceName,
                link: item.link
              }
            };
            
            // Add media if available
            if (item.mediaUrl) {
              scriptData.summary!.mediaUrl = item.mediaUrl;
              scriptData.summary!.mediaType = item.mediaType;
            }
            
            newsScripts.push(scriptData);
          }
        } catch (error) {
          console.error("Error processing news item:", error);
        }
      }
      
      setScripts(newsScripts);
      
      toast({
        title: "News Summaries Generated",
        description: `${newsScripts.length} latest news summaries have been created`,
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      
      setScripts([]);
      toast({
        title: "Error Fetching News",
        description: "Couldn't fetch news from sources. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to fetch news from a single source
  const fetchNewsFromSource = async (feedUrl: string, sourceName: string) => {
    try {
      // Try to get from cache first
      const cacheKey = `news-cache-${feedUrl}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { items, timestamp } = JSON.parse(cachedData);
        const cacheTime = new Date(timestamp);
        const now = new Date();
        
        // If cache is less than 30 minutes old, use it
        if ((now.getTime() - cacheTime.getTime()) < 30 * 60 * 1000) {
          console.log(`Using cached data for ${sourceName}`);
          return items;
        }
      }
      
      // Otherwise fetch fresh data
      const corsProxy = "https://api.allorigins.win/raw?url=";
      const response = await fetch(`${corsProxy}${encodeURIComponent(feedUrl)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status}`);
      }
      
      const data = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, "text/xml");
      
      const items = xmlDoc.querySelectorAll("item");
      const parsedItems: any[] = [];
      
      // Process only a limited number of items per source
      const itemsToProcess = Math.min(items.length, MAX_NEWS_ITEMS_PER_SOURCE);
      
      for (let i = 0; i < itemsToProcess; i++) {
        const item = items[i];
        
        // Extract basic information
        const title = item.querySelector("title")?.textContent || "No title";
        const description = item.querySelector("description")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || new Date().toUTCString();
        const link = item.querySelector("link")?.textContent || "#";
        
        // Find images or videos in the content
        let mediaUrl;
        let mediaType: "image" | "video" | undefined;
        
        // Check for media:content or enclosure tags
        const mediaContent = item.querySelector("media\\:content, content");
        const enclosure = item.querySelector("enclosure");
        
        if (mediaContent && mediaContent.getAttribute("url")) {
          mediaUrl = mediaContent.getAttribute("url") || "";
          const contentType = mediaContent.getAttribute("type") || "";
          mediaType = contentType.startsWith("video/") ? "video" : "image";
        } else if (enclosure && enclosure.getAttribute("url")) {
          mediaUrl = enclosure.getAttribute("url") || "";
          const contentType = enclosure.getAttribute("type") || "";
          mediaType = contentType.startsWith("video/") ? "video" : "image";
        } else {
          // Try to extract image from description
          const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch && imgMatch[1]) {
            mediaUrl = imgMatch[1];
            mediaType = "image";
          }
          
          // Try to extract video from description
          const videoMatch = description.match(/<video[^>]+src="([^">]+)"|<iframe[^>]+src="([^">]+)"/);
          if (videoMatch && (videoMatch[1] || videoMatch[2])) {
            mediaUrl = videoMatch[1] || videoMatch[2];
            mediaType = "video";
          }
        }
        
        // Analyze content
        const combinedText = title + " " + description;
        const sentiment = analyzeSentiment(combinedText);
        const keywords = extractKeywords(combinedText, 3);
        const readingTimeSeconds = calculateReadingTime(description);
        
        // Check if this is actually news content using keywords
        const newsKeywords = ["news", "report", "update", "latest", "breaking", "today", "yesterday", "announces", "announced", "published"];
        const isNewsContent = keywords.some(keyword => newsKeywords.includes(keyword.toLowerCase())) || 
          title.toLowerCase().includes("news") || 
          newsKeywords.some(kw => title.toLowerCase().includes(kw));
        
        // Only include if it seems like news content
        if (isNewsContent || true) { // For now include all, LLM will filter later
          const newsItem = {
            title,
            description,
            fullContent: description,
            sentiment,
            keywords,
            readingTimeSeconds,
            pubDate,
            link,
            sourceName,
            mediaUrl,
            mediaType
          };
          
          parsedItems.push(newsItem);
        }
      }
      
      // Save to cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          items: parsedItems,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error("Error saving to cache:", error);
      }
      
      return parsedItems;
    } catch (error) {
      console.error(`Error fetching from ${sourceName}:`, error);
      throw error;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add refresh function to get the latest news
  const refreshNews = () => {
    fetchAllNewsSources();
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
                  {/* Display media if available */}
                  {script.summary?.mediaUrl && script.summary.mediaType === "image" && (
                    <div className="mb-4">
                      <img 
                        src={script.summary.mediaUrl} 
                        alt={script.title} 
                        className="w-full h-auto rounded-md object-cover max-h-64"
                        onError={(e) => {
                          // Hide image on error
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {script.summary?.mediaUrl && script.summary.mediaType === "video" && (
                    <div className="mb-4">
                      <div className="relative pt-[56.25%]">
                        <iframe 
                          src={script.summary.mediaUrl}
                          className="absolute top-0 left-0 w-full h-full rounded-md"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          onError={(e) => {
                            // Hide video on error
                            (e.target as HTMLIFrameElement).style.display = 'none';
                          }}
                        ></iframe>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-4 rounded-md border mb-4">
                    <div className="whitespace-pre-wrap text-sm">{script.content}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {script.summary?.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline">{keyword}</Badge>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <div className="flex gap-2">
                      <Button
                        variant="outline" 
                        size="sm"
                        className="text-sm flex items-center gap-1 bg-blue-50 text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-colors"
                        onClick={() => {
                          // Stop any ongoing speech
                          window.speechSynthesis.cancel();
                          
                          // Start speech synthesis for this article
                          const utterance = new SpeechSynthesisUtterance(script.content);
                          utterance.rate = 1.0;
                          utterance.pitch = 1.0;
                          window.speechSynthesis.speak(utterance);
                          
                          toast({
                            title: "Text-to-Speech",
                            description: "Reading the summary...",
                          });
                        }}
                      >
                        <Speaker className="h-4 w-4" />
                        TL;DR
                      </Button>
                      
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
                        Copy
                      </button>
                    </div>
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
