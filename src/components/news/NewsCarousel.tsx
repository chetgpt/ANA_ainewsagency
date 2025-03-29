
import React, { useCallback } from "react";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import NewsScriptCard from "@/components/news/NewsScriptCard";
import CarouselCounter from "@/components/news/CarouselCounter";
import LoadingCarouselItem from "@/components/news/LoadingCarouselItem";
import { useCarouselNavigation } from "@/hooks/useCarouselNavigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    isLoading,
    handlePrevious,
    handleNext
  } = useCarouselNavigation({ scripts, onLoadMore });

  return (
    <div className="relative">
      <Carousel className="w-full">
        <CarouselCounter 
          currentIndex={currentIndex} 
          totalItems={scripts.length} 
        />
        
        <div className="relative">
          <CarouselContent ref={emblaRef} className="cursor-grab active:cursor-grabbing">
            {scripts.map((script) => (
              <CarouselItem key={script.id} className="flex justify-center md:px-4">
                <div className="w-full max-w-4xl px-2">
                  <NewsScriptCard script={script} />
                </div>
              </CarouselItem>
            ))}
            
            {isLoading && <LoadingCarouselItem />}
          </CarouselContent>
          
          <Button 
            onClick={handlePrevious}
            variant="outline" 
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full opacity-70 hover:opacity-100 bg-white shadow-md"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous</span>
          </Button>
          
          <Button
            onClick={handleNext}
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full opacity-70 hover:opacity-100 bg-white shadow-md"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next</span>
          </Button>
        </div>
      </Carousel>
      
      {/* Visual indicator for swipe functionality */}
      <div className="text-xs text-gray-500 text-center mt-2">
        ← Swipe or use arrows →
      </div>
      
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
