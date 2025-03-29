
import { useState, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";

interface UseCarouselNavigationProps {
  scripts: any[];
  onLoadMore: () => Promise<void>;
}

export function useCarouselNavigation({ scripts, onLoadMore }: UseCarouselNavigationProps) {
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

  return {
    emblaRef,
    currentIndex,
    isLoading,
    handlePrevious,
    handleNext
  };
}
