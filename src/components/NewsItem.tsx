
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export interface NewsItemProps {
  title: string;
  description: string;
  pubDate: string;
  link: string;
  imageUrl?: string;
  sourceName?: string;
}

const NewsItem = ({ title, description, pubDate, link, imageUrl, sourceName }: NewsItemProps) => {
  const formattedDate = formatDistanceToNow(new Date(pubDate), { addSuffix: true });
  
  // Clean description by removing HTML tags
  const cleanDescription = description.replace(/<[^>]*>?/gm, '');
  
  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-200">
      <a href={link} target="_blank" rel="noopener noreferrer" className="h-full flex flex-col">
        {imageUrl && (
          <div className="h-48 overflow-hidden">
            <img 
              src={imageUrl} 
              alt={title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Remove image on error
                (e.target as HTMLImageElement).style.display = 'none';
              }} 
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold line-clamp-2">{title}</CardTitle>
          {sourceName && (
            <div className="text-xs text-blue-600 font-medium mt-1">
              {sourceName}
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-grow pb-2">
          <CardDescription className="line-clamp-3">{cleanDescription}</CardDescription>
        </CardContent>
        <CardFooter className="pt-0 text-xs text-gray-500">
          {formattedDate}
        </CardFooter>
      </a>
    </Card>
  );
};

export default NewsItem;
