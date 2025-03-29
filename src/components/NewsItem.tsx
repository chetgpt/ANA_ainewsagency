
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export interface NewsItemProps {
  title: string;
  description: string;
  pubDate: string;
  link: string;
  imageUrl?: string;
  sourceName?: string;
  sentiment: "positive" | "negative" | "neutral";
  keywords: string[];
  readingTimeSeconds: number;
  summary?: string | null;
  llmSentiment?: "positive" | "negative" | "neutral" | null;
  llmKeywords?: string[];
  isSummarized?: boolean;
  isSummarizing?: boolean;
}

const NewsItem = ({ 
  title, 
  description, 
  pubDate, 
  link, 
  sourceName,
  sentiment,
  keywords,
  readingTimeSeconds,
  summary,
  llmSentiment,
  llmKeywords,
  isSummarized = true,
  isSummarizing = false
}: NewsItemProps) => {
  const formattedDate = formatDistanceToNow(new Date(pubDate), { addSuffix: true });
  
  // Define sentiment color - prefer LLM sentiment if available
  const activeSentiment = llmSentiment || sentiment;
  const sentimentColor = {
    positive: "bg-green-100 text-green-800",
    negative: "bg-red-100 text-red-800",
    neutral: "bg-blue-100 text-blue-800"
  }[activeSentiment];
  
  // Use LLM keywords if available, otherwise use basic keywords
  const activeKeywords = (llmKeywords && llmKeywords.length > 0) ? llmKeywords : keywords;
  
  // Format display text
  const sentimentLabel = activeSentiment.charAt(0).toUpperCase() + activeSentiment.slice(1);
  const sentimentSource = llmSentiment ? "AI" : "Basic";
  
  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-200">
      <a 
        href={link} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="h-full flex flex-col"
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
          {isSummarizing ? (
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              <span>Generating enhanced summary...</span>
            </div>
          ) : null}
          
          {summary ? (
            <div className="mb-3">
              <div className="text-xs font-medium text-green-700 mb-1">AI Summary:</div>
              <CardDescription className="line-clamp-3">{summary}</CardDescription>
            </div>
          ) : null}
          
          <CardDescription className={`line-clamp-3 ${summary ? 'text-xs text-gray-500' : ''}`}>
            {description}
          </CardDescription>
          
          <div className="mt-3 flex flex-wrap gap-1">
            <Badge variant="outline" className={sentimentColor}>
              {sentimentLabel} ({sentimentSource})
            </Badge>
            
            {activeKeywords.map((keyword, index) => (
              <Badge key={index} variant="outline" className="bg-gray-100">
                {keyword}
              </Badge>
            ))}
            
            <Badge variant="outline" className="bg-gray-100 text-gray-800">
              {readingTimeSeconds < 60 
                ? `${readingTimeSeconds}s read` 
                : `${Math.floor(readingTimeSeconds / 60)}m read`}
            </Badge>
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
