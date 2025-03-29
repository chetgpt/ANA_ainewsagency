
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
  description,
  isSummarized = false,
  isSummarizing = false
}: NewsItemProps) => {
  const formattedDate = formatDistanceToNow(new Date(pubDate), { addSuffix: true });
  
  // Clean up title for Google News (remove source name in brackets if present)
  const cleanTitle = title.replace(/\s*\[[^\]]+\]\s*$/, '');
  
  // Extract source from Google News format (typically appears as [Source] at the end)
  const extractedSource = title.match(/\[([^\]]+)\]\s*$/)?.[1] || sourceName;
  
  // Check if summary is a valid AI-generated summary or just the article description
  const hasValidSummary = summary && summary !== description && summary.length > 50;
  
  // Determine card styling based on summarization status
  const cardClasses = `h-full transition-shadow duration-200 ${
    isSummarizing ? 'border-blue-300 shadow-sm' : 
    isSummarized && hasValidSummary ? 'hover:shadow-md border-green-200' : 
    isSummarized && !hasValidSummary ? 'hover:shadow-md border-red-100' : 
    'hover:shadow-md border-gray-100'
  }`;
  
  return (
    <Card className={cardClasses}>
      <div className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold line-clamp-2">{cleanTitle || "No content available"}</CardTitle>
          {extractedSource && (
            <div className="text-xs text-blue-600 font-medium mt-1">
              {extractedSource}
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
          
          {hasValidSummary ? (
            <div className="mb-3">
              <div className="text-xs font-medium text-green-700 mb-1">AI Summary:</div>
              <CardDescription className="line-clamp-4">{summary}</CardDescription>
            </div>
          ) : (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">
                {isSummarized ? "No content available" : "No RSS feeds configured"}
              </div>
              <CardDescription className="line-clamp-3 text-gray-500 italic">
                {isSummarized ? 
                  "No content is available to display." : 
                  "Please add RSS feeds to begin seeing content."
                }
              </CardDescription>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0 text-xs text-gray-500">
          {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Read more</a> : formattedDate}
        </CardFooter>
      </div>
    </Card>
  );
};

export default NewsItem;
