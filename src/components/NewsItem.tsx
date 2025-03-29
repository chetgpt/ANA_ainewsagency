
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { analyzeSentiment, extractKeywords, calculateReadingTime, fetchArticleContent } from "@/utils/textAnalysis";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export interface NewsItemProps {
  title: string;
  description: string;
  pubDate: string;
  link: string;
  imageUrl?: string;
  sourceName?: string;
}

const NewsItem = ({ title, description, pubDate, link, sourceName }: NewsItemProps) => {
  const formattedDate = formatDistanceToNow(new Date(pubDate), { addSuffix: true });
  const [isFullContentLoaded, setIsFullContentLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fullContent, setFullContent] = useState("");
  const [sentiment, setSentiment] = useState<"positive" | "negative" | "neutral">("neutral");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [readingTimeSeconds, setReadingTimeSeconds] = useState(0);
  
  // Initial analysis with title and description only
  useEffect(() => {
    const initialSentiment = analyzeSentiment(title + " " + description);
    const initialKeywords = extractKeywords(title + " " + description, 3);
    const initialReadingTime = calculateReadingTime(description);
    
    setSentiment(initialSentiment);
    setKeywords(initialKeywords);
    setReadingTimeSeconds(initialReadingTime);
  }, [title, description]);
  
  // Function to load and analyze full content
  const loadFullContent = async () => {
    if (isFullContentLoaded || isLoading) return;
    
    setIsLoading(true);
    try {
      const content = await fetchArticleContent(link);
      setFullContent(content);
      
      if (content) {
        // Re-analyze with full content
        const fullSentiment = analyzeSentiment(title + " " + content);
        const fullKeywords = extractKeywords(title + " " + content, 3);
        const fullReadingTime = calculateReadingTime(content);
        
        setSentiment(fullSentiment);
        setKeywords(fullKeywords);
        setReadingTimeSeconds(fullReadingTime);
        setIsFullContentLoaded(true);
      }
    } catch (error) {
      console.error("Error loading full content:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Define sentiment color
  const sentimentColor = {
    positive: "bg-green-100 text-green-800",
    negative: "bg-red-100 text-red-800",
    neutral: "bg-blue-100 text-blue-800"
  }[sentiment];
  
  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-200">
      <a 
        href={link} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="h-full flex flex-col"
        onMouseEnter={loadFullContent} // Load full content on hover
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold line-clamp-2">{title}</CardTitle>
          {sourceName && (
            <div className="text-xs text-blue-600 font-medium mt-1">
              {sourceName}
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-grow pb-2">
          <CardDescription className="line-clamp-3">{description}</CardDescription>
          
          <div className="mt-3 flex flex-wrap gap-1">
            {isLoading ? (
              <Badge variant="outline" className="bg-gray-100 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing...
              </Badge>
            ) : (
              <>
                <Badge variant="outline" className={sentimentColor}>
                  {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                  {isFullContentLoaded && " (Full)"}
                </Badge>
                
                {keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="bg-gray-100">
                    {keyword}
                  </Badge>
                ))}
                
                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                  {readingTimeSeconds < 60 
                    ? `${readingTimeSeconds}s read` 
                    : `${Math.floor(readingTimeSeconds / 60)}m read`}
                  {isFullContentLoaded && " (Full)"}
                </Badge>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-0 text-xs text-gray-500">
          {formattedDate}
        </CardFooter>
      </a>
    </Card>
  );
};

export default NewsItem;
