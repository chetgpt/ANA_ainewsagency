
import React from "react";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import NewsScriptCard from "@/components/news/NewsScriptCard";
import CarouselCounter from "@/components/news/CarouselCounter";
import LoadingCarouselItem from "@/components/news/LoadingCarouselItem";
import { useCarouselNavigation } from "@/hooks/useCarouselNavigation";

interface NewsCarouselProps {
  scripts: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    summary?: {
      description: string;
      sentiment: "positive" | "negative" | "neutral";
      keywords: string[];
      readingTimeSeconds: number;
      pubDate: string;
      sourceName: string;
    }
  }>;
  onLoadMore: () => Promise<void>;
}

const NewsCarousel = ({ scripts, onLoadMore }: NewsCarouselProps) => {
  const {
    emblaRef,
    currentIndex,
    isLoading
  } = useCarouselNavigation({ scripts, onLoadMore });

  return (
    <div className="relative">
      <Carousel className="w-full">
        <CarouselCounter 
          currentIndex={currentIndex} 
          totalItems={scripts.length} 
        />
        
        <CarouselContent ref={emblaRef}>
          {scripts.map((script) => (
            <CarouselItem key={script.id} className="flex justify-center md:px-4">
              <div className="w-full max-w-4xl px-2">
                <NewsScriptCard script={script} />
              </div>
            </CarouselItem>
          ))}
          
          {isLoading && <LoadingCarouselItem />}
        </CarouselContent>
      </Carousel>
      
      {/* Debug info - helps with troubleshooting */}
      <div className="hidden">
        <p>Current Index: {currentIndex}</p>
        <p>Total Items: {scripts.length}</p>
        <p>Loading: {isLoading ? 'true' : 'false'}</p>
      </div>
    </div>
  );
};

export default NewsCarousel;
