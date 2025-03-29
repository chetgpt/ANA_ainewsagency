
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
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
  pubDate, 
  link, 
  sourceName,
  summary,
  isSummarized = true,
  isSummarizing = false
}: NewsItemProps) => {
  const formattedDate = formatDistanceToNow(new Date(pubDate), { addSuffix: true });
  
  // Determine card styling based on summarization status
  const cardClasses = `h-full transition-shadow duration-200 ${
    isSummarizing ? 'border-blue-300 shadow-sm' : 
    isSummarized && summary ? 'hover:shadow-md border-green-200' : 'hover:shadow-md'
  }`;
  
  return (
    <Card className={cardClasses}>
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
            <div className="flex items-center text-sm text-blue-600 mb-2 animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              <span>Generating enhanced summary...</span>
            </div>
          ) : null}
          
          {summary ? (
            <div className="mb-3">
              <div className="text-xs font-medium text-green-700 mb-1">AI Summary:</div>
              <CardDescription className="line-clamp-3">{summary}</CardDescription>
            </div>
          ) : (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">No summary available yet</div>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0 text-xs text-gray-500">
          {formattedDate}
        </CardFooter>
      </a>
    </Card>
  );
};

export default NewsItem;
