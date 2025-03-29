
import React from "react";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
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
          <CarouselPrevious 
            className="relative left-0 right-0 h-8 w-8 border-gray-200"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </CarouselPrevious>
          
          <CarouselNext 
            className="relative left-0 right-0 h-8 w-8 border-gray-200"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </CarouselNext>
        </div>
      </Carousel>
    </div>
  );
};

export default NewsCarousel;
