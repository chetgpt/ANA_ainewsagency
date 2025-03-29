
import { useState, useEffect } from "react";
import { Loader2, FileText, Copy, Newspaper, Image, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  generateNewsScript, 
  analyzeSentiment, 
  extractKeywords, 
  calculateReadingTime, 
  fetchArticleContent, 
  groupSimilarNews, 
  detectNonNewsContent,
  fullAnalyzeArticle 
} from "@/utils/textAnalysis";
import { Button } from "@/components/ui/button";
import { checkApiAvailability } from "@/utils/llmService";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface CategorizedNewsListProps {
  selectedCategory: string;
  feedUrl: string;
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
    media?: {
      hasImage: boolean;
      hasVideo: boolean;
      imageUrls?: string[];
      videoUrls?: string[];
    };
  }
}

const MAX_NEWS_ITEMS = 10; // Maximum news items to fetch and process

const CategorizedNewsList = ({ selectedCategory, feedUrl }: CategorizedNewsListProps) => {
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

  // Fetch news when the feed URL changes
  useEffect(() => {
    fetchMultipleNewsItems();
  }, [feedUrl, toast]);

  const fetchMultipleNewsItems = async () => {
    setLoading(true);
    
    try {
      // Use the provided RSS feed with a CORS proxy
      const corsProxy = "https://api.allorigins.win/raw?url=";
      const response = await fetch(`${corsProxy}${encodeURIComponent(feedUrl)}`);
      
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
      const newsItems = [];
      
      // Extract source name from the channel
      const sourceName = xmlDoc.querySelector("channel > title")?.textContent || 
                        feedUrl.split("/")[2] || "News Source";
      
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
        
        // Find image in media:content, enclosure, or description
        let imageUrl = "";
        const mediaContent = item.querySelector("media\\:content, content");
        const enclosure = item.querySelector("enclosure");
        
        if (mediaContent && mediaContent.getAttribute("url")) {
          imageUrl = mediaContent.getAttribute("url") || "";
        } else if (enclosure && enclosure.getAttribute("url") && 
                  enclosure.getAttribute("type")?.startsWith("image/")) {
          imageUrl = enclosure.getAttribute("url") || "";
        } else {
          // Try to extract image from description
          const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
        }
        
        // Check if this is news content using analyzers
        const isNewsContent = await detectNonNewsContent(title, description);
        
        if (!isNewsContent) {
          console.log(`Skipping non-news item: ${title}`);
          continue;
        }
        
        // Perform full analysis
        try {
          const analysisResult = await fullAnalyzeArticle({
            title,
            description,
            link
          });
          
          // Create a news item with the analysis results
          newsItems.push({
            title,
            description,
            fullContent: analysisResult.fullContent || description,
            sentiment: analysisResult.sentiment,
            keywords: analysisResult.keywords,
            readingTimeSeconds: analysisResult.readingTimeSeconds,
            pubDate,
            link,
            sourceName,
            isNewsContent: analysisResult.isNewsContent,
            media: analysisResult.media
          });
          
        } catch (error) {
          console.error("Error analyzing item:", error);
          
          // Use basic analysis if full analysis fails
          const combinedText = title + " " + description;
          const sentiment = analyzeSentiment(combinedText);
          const keywords = extractKeywords(combinedText, 3);
          const readingTimeSeconds = calculateReadingTime(description);
          
          newsItems.push({
            title,
            description,
            fullContent: description,
            sentiment,
            keywords,
            readingTimeSeconds,
            pubDate,
            link,
            sourceName,
            isNewsContent: true
          });
        }
      }
      
      if (newsItems.length === 0) {
        toast({
          title: "No news content found",
          description: "Couldn't find any valid news articles in this feed.",
          variant: "destructive"
        });
        setScripts([]);
        setLoading(false);
        return;
      }
      
      // Group similar news items
      const groupedItems = groupSimilarNews(newsItems);
      console.log("Grouped news items:", groupedItems.length);
      
      // Generate scripts for each group or individual item
      const newsScripts: NewsScript[] = [];
      
      for (const item of groupedItems) {
        const newsScript = await generateNewsScript(item);
        
        const scriptData = {
          title: item.type === 'group' ? `Group: ${item.items[0].title} + ${item.items.length - 1} more` : item.title,
          content: newsScript,
          type: item.type || 'single',
          summary: item.type === 'group' ? {
            description: `A group of ${item.items.length} related stories`,
            sentiment: item.sentiment,
            keywords: item.keywords,
            readingTimeSeconds: item.readingTimeSeconds,
            pubDate: item.items[0].pubDate,
            sourceName: item.items[0].sourceName,
            link: item.items[0].link,
            media: item.media
          } : {
            description: item.description,
            sentiment: item.sentiment,
            keywords: item.keywords,
            readingTimeSeconds: item.readingTimeSeconds,
            pubDate: item.pubDate,
            sourceName: item.sourceName,
            link: item.link,
            media: item.media
          }
        };
        
        newsScripts.push(scriptData);
      }
      
      setScripts(newsScripts);
      setCurrentPage(0); // Reset to first page
      
      toast({
        title: "News Summaries Generated",
        description: `${newsScripts.length} news summaries created from ${sourceName}`,
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      
      toast({
        title: "Error Fetching News",
        description: "Couldn't fetch news from the selected source. Please try another source.",
        variant: "destructive"
      });
      
      setScripts([]);
    } finally {
      setLoading(false);
    }
  };

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
    
    await fetchMultipleNewsItems();
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
            {scripts.length > 0 ? 
              `Showing ${scripts.length} latest articles` : 
              "No news articles found"
            }
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
          <Newspaper className="h-6 w-6 text-gray-400 mr-2" />
          <span className="text-gray-600">No news available from this source</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 py-4">
            {currentScripts.map((script, index) => (
              <Card key={index} className="h-full hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {script.type === 'group' ? (
                      <Newspaper className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
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
                  {/* Show media if available */}
                  {script.summary?.media?.hasImage && script.summary.media.imageUrls && script.summary.media.imageUrls.length > 0 && (
                    <div className="mb-4 relative">
                      <img 
                        src={script.summary.media.imageUrls[0]} 
                        alt={script.title}
                        className="w-full h-auto max-h-64 object-cover rounded" 
                        onError={(e) => {
                          // Hide the image on error
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {script.summary?.media?.hasVideo && script.summary.media.videoUrls && script.summary.media.videoUrls.length > 0 && (
                    <div className="mb-4 relative">
                      {script.summary.media.videoUrls[0].includes('youtube') ? (
                        <iframe
                          className="w-full h-64 rounded"
                          src={script.summary.media.videoUrls[0]}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      ) : (
                        <div className="flex items-center justify-center bg-gray-100 rounded h-16">
                          <Video className="h-6 w-6 text-gray-500 mr-2" />
                          <span className="text-gray-500">Video available in original article</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Show the news script content */}
                  <div className="bg-gray-50 p-4 rounded-md border mb-4">
                    <div className="whitespace-pre-wrap text-sm">{script.content}</div>
                  </div>
                  
                  {/* Show news metadata */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {script.summary?.keywords?.map((keyword, idx) => (
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
                    {script.summary?.media?.hasImage && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Image className="h-3 w-3" /> Images
                      </Badge>
                    )}
                    {script.summary?.media?.hasVideo && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Video className="h-3 w-3" /> Video
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
