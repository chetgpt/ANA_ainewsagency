
import React from "react";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import NewsScriptCard from "@/components/news/NewsScriptCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
        
        <CarouselContent ref={emblaRef}>
          {scripts.map((script) => (
            <CarouselItem key={script.id} className="flex justify-center">
              <div className="w-full max-w-4xl px-2">
                <NewsScriptCard script={script} />
              </div>
            </CarouselItem>
          ))}
          
          {isLoading && <LoadingCarouselItem />}
        </CarouselContent>
        
        <div className="flex justify-center mt-4 gap-2">
          <button 
            className="flex items-center justify-center h-10 w-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
            onClick={() => {
              console.log("Previous button clicked");
              handlePrevious();
            }}
            aria-label="Previous slide"
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button 
            className="flex items-center justify-center h-10 w-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
            onClick={() => {
              console.log("Next button clicked");
              handleNext();
            }}
            aria-label="Next slide"
            type="button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </Carousel>
    </div>
  );
};

export default NewsCarousel;
