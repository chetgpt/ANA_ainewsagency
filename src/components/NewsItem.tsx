
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

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
}

const NewsItem = ({ 
  title, 
  description, 
  pubDate, 
  link, 
  sourceName,
  sentiment,
  keywords,
  readingTimeSeconds
}: NewsItemProps) => {
  const formattedDate = formatDistanceToNow(new Date(pubDate), { addSuffix: true });
  
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
            <Badge variant="outline" className={sentimentColor}>
              {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
            </Badge>
            
            <Badge variant="outline" className="bg-purple-100 text-purple-800">
              Web-enriched
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
