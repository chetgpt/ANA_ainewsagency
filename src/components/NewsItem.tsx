
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Speaker, Square } from "lucide-react";
import { useState } from "react";

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
  keywords
}: NewsItemProps) => {
  const formattedDate = formatDistanceToNow(new Date(pubDate), { addSuffix: true });
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const handleTTS = () => {
    if (isSpeaking) {
      // Stop speech if currently speaking
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Start speech synthesis
    setIsSpeaking(true);
    
    const utterance = new SpeechSynthesisUtterance(description);
    utterance.rate = 1.0; // Normal speaking rate
    utterance.pitch = 1.0; // Normal pitch
    
    // Handle when speech has completed
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    // Handle any errors
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };
  
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
        <CardFooter className="pt-0 text-xs flex justify-between items-center">
          <span className="text-gray-500">{formattedDate}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.preventDefault(); // Prevent the link from being followed
              handleTTS();
            }}
            className="ml-auto flex items-center gap-1"
          >
            {isSpeaking ? <Square className="h-4 w-4" /> : <Speaker className="h-4 w-4" />}
            {isSpeaking ? "Stop" : "TL;DR"}
          </Button>
        </CardFooter>
      </a>
    </Card>
  );
};

export default NewsItem;
