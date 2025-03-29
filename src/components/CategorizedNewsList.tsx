
import { useState, useEffect } from "react";
import { Loader2, FileText, Copy, Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { generateNewsScript, analyzeSentiment, extractKeywords, calculateReadingTime, fetchArticleContent } from "@/utils/textAnalysis";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

const CategorizedNewsList = ({ selectedCategory }: CategorizedNewsListProps) => {
  const [loading, setLoading] = useState(true);
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
    const fetchSingleNewsItem = async () => {
      setLoading(true);
      
      try {
        // Use CNN's top stories RSS feed with a CORS proxy
        const corsProxy = "https://api.allorigins.win/raw?url=";
        const rssUrl = "http://rss.cnn.com/rss/cnn_topstories.rss";
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
          sourceName: "CNN",
        };
        
        // Generate a script for the news item
        const newsScript = generateNewsScript(newsItem);
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
          description: "A comprehensive news summary has been created",
        });
      } catch (error) {
        console.error("Error fetching news:", error);
        
        // Fallback to sample data if fetching fails
        const sampleNewsItem = {
          title: "Fox News to pay $787 million in Dominion settlement",
          description: "Fox News will pay more than $787 million to Dominion Voting Systems after the sides hammered out a last-minute settlement Tuesday in the explosive defamation case launched against the right-wing network. Fox acknowledged the court's rulings finding 'certain claims about Dominion to be false.' However, the network will not have to admit on air that it spread election lies.",
          fullContent: "Fox News will pay more than $787 million to Dominion Voting Systems after the sides hammered out a last-minute settlement Tuesday in the explosive defamation case launched against the right-wing network. Fox acknowledged the court's rulings finding 'certain claims about Dominion to be false.' However, the network will not have to admit on air that it spread election lies. The settlement was announced just as opening statements were about to begin in the high-profile case. Fox was facing the possibility of having to pay $1.6 billion in damages. The settlement means top Fox executives like Rupert Murdoch will not have to testify in the case. Dominion had alleged that Fox knowingly spread false claims that its voting machines were rigged in the 2020 presidential election in order to boost ratings and prevent viewers from defecting to other networks.",
          sentiment: "negative" as const,
          keywords: ["Fox News", "Dominion", "settlement"],
          readingTimeSeconds: 240,
          pubDate: new Date().toUTCString(),
          link: "#",
          sourceName: "NewsHub",
        };
        
        const newsScript = generateNewsScript(sampleNewsItem);
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
          {script.summary && (
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Newspaper className="h-5 w-5" />
                  News Summary
                </CardTitle>
                <div className="text-xs text-gray-500 mt-1">
                  Source: {script.summary.sourceName}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-gray-700 mb-4">
                  {script.summary.description}
                </CardDescription>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className={
                    script.summary.sentiment === "positive" ? "bg-green-100 text-green-800" :
                    script.summary.sentiment === "negative" ? "bg-red-100 text-red-800" :
                    "bg-blue-100 text-blue-800"
                  }>
                    {script.summary.sentiment.charAt(0).toUpperCase() + script.summary.sentiment.slice(1)}
                  </Badge>
                  
                  {script.summary.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="bg-gray-100">
                      {keyword}
                    </Badge>
                  ))}
                  
                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                    {formatReadingTime(script.summary.readingTimeSeconds)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
          
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
