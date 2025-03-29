
import { useState, useEffect, useRef } from "react";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";
import NewsScriptCard from "@/components/news/NewsScriptCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [isLoading, setIsLoading] = useState(false);
  const previousScriptsLength = useRef(scripts.length);
  
  // Function to handle when the user reaches the end of available content
  const handleReachEnd = async (index: number) => {
    if (index === scripts.length - 1 && !isLoading) {
      setIsLoading(true);
      try {
        await onLoadMore();
      } catch (error) {
        console.error("Error loading more content:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Initialize carousel and set up event listeners when component mounts
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const newIndex = emblaApi.selectedScrollSnap();
      setCurrentIndex(newIndex);
      handleReachEnd(newIndex);
    };

    emblaApi.on("select", onSelect);
    
    // Force update carousel state on first load
    emblaApi.reInit();
    
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, scripts.length]);

  // Handle updates to scripts array
  useEffect(() => {
    if (!emblaApi) return;
    
    // Check if new scripts were added
    if (scripts.length > previousScriptsLength.current) {
      console.log(`NewsCarousel: Scripts updated from ${previousScriptsLength.current} to ${scripts.length}`);
      
      // We need to reinitialize the carousel when new slides are added
      setTimeout(() => {
        if (emblaApi) {
          emblaApi.reInit();
          console.log("Carousel reinitialized");
        }
      }, 10);
    }
    
    // Update the ref with current scripts length
    previousScriptsLength.current = scripts.length;
  }, [scripts.length, emblaApi]);

  // Manually handle next/previous navigation
  const handlePrevious = () => {
    if (emblaApi) {
      emblaApi.scrollPrev();
    }
  };

  const handleNext = () => {
    if (emblaApi) {
      emblaApi.scrollNext();
      
      // If we're moving to the last slide, preload more content
      const newIndex = emblaApi.selectedScrollSnap();
      if (newIndex === scripts.length - 1) {
        handleReachEnd(newIndex);
      }
    }
  };

  return (
    <div className="relative">
      <Carousel className="w-full">
        <div className="flex items-center justify-center mb-4">
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {scripts.length}
          </span>
        </div>
        
        <CarouselContent ref={emblaRef}>
          {scripts.map((script) => (
            <CarouselItem key={script.id} className="flex justify-center">
              <div className="w-full max-w-4xl px-2">
                <NewsScriptCard script={script} />
              </div>
            </CarouselItem>
          ))}
          
          {isLoading && (
            <CarouselItem className="flex flex-col justify-center items-center">
              <div className="flex flex-col items-center justify-center h-72 w-full bg-gray-50 rounded-lg border border-dashed border-gray-300 p-8">
                <div className="animate-pulse">
                  <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-40 bg-gray-200 rounded"></div>
                </div>
                <p className="mt-6 text-gray-500">Loading next article...</p>
              </div>
            </CarouselItem>
          )}
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
