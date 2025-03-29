
import { useState, useEffect } from "react";
import { Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateNewsScript, analyzeSentiment, extractKeywords, calculateReadingTime } from "@/utils/textAnalysis";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

const CategorizedNewsList = ({ selectedCategory }: CategorizedNewsListProps) => {
  const [loading, setLoading] = useState(true);
  const [script, setScript] = useState<{title: string, content: string, type: string} | null>(null);
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
        console.log("RSS data fetched:", data.substring(0, 200) + "..."); // Log a preview
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        
        // Get the first item from the feed
        const firstItem = xmlDoc.querySelector("item");
        
        if (!firstItem) {
          throw new Error("No items found in RSS feed");
        }
        
        console.log("First item found in RSS feed");
        
        // Extract the item data
        const title = firstItem.querySelector("title")?.textContent || "No title";
        const description = firstItem.querySelector("description")?.textContent || "";
        const pubDate = firstItem.querySelector("pubDate")?.textContent || new Date().toUTCString();
        const link = firstItem.querySelector("link")?.textContent || "#";
        
        console.log("Extracted data:", { title, description: description.substring(0, 50) + "..." });
        
        // Perform simple analysis
        const combinedText = title + " " + description;
        const sentiment = analyzeSentiment(combinedText);
        const keywords = extractKeywords(combinedText, 3);
        const readingTimeSeconds = calculateReadingTime(description);
        
        console.log("Analysis results:", { sentiment, keywords, readingTimeSeconds });
        
        // Create a news item object with the required information
        const newsItem = {
          title,
          description,
          sentiment,
          keywords,
          readingTimeSeconds,
          pubDate,
          link,
          sourceName: "CNN",
        };
        
        // Generate a script for the news item
        const newsScript = generateNewsScript(newsItem);
        console.log("Generated script:", newsScript.substring(0, 100) + "...");
        
        const scriptData = {
          title: newsItem.title,
          content: newsScript,
          type: 'single'
        };
        
        setScript(scriptData);
        
        toast({
          title: "Script Generated",
          description: "News script has been created from CNN feed",
        });
      } catch (error) {
        console.error("Error fetching news:", error);
        
        // Fallback to sample data if fetching fails
        const sampleNewsItem = {
          title: "Sample Technology News Story",
          description: "This is a sample news story about recent developments in technology that is meant to demonstrate the script generation feature.",
          sentiment: "positive" as const,
          keywords: ["technology", "innovation", "development"],
          readingTimeSeconds: 180,
          pubDate: new Date().toUTCString(),
          link: "#",
          sourceName: "NewsHub",
        };
        
        const newsScript = generateNewsScript(sampleNewsItem);
        
        const scriptData = {
          title: sampleNewsItem.title,
          content: newsScript,
          type: 'single'
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Generating news script...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">News Script</h2>
      </div>
      
      {!script ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mr-2" />
          <span className="text-gray-600">Generating news script...</span>
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
                {script.type === 'group' ? 'Multiple Related Articles' : 'Single Article'}
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-md border mb-4">
                <pre className="whitespace-pre-wrap text-sm">{script.content}</pre>
              </div>
              <button 
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                onClick={() => {
                  if (script?.content) {
                    navigator.clipboard.writeText(script.content);
                    toast({
                      title: "Copied to clipboard",
                      description: "The script has been copied to your clipboard",
                    });
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard">
                  <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                </svg>
                Copy to clipboard
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CategorizedNewsList;
