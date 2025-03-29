
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
  keywords
}: NewsItemProps) => {
  const formattedDate = formatDistanceToNow(new Date(pubDate), { addSuffix: true });
  
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
            {keywords.map((keyword, index) => (
              <Badge key={index} variant="outline" className="bg-gray-100">
                {keyword}
              </Badge>
            ))}
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
