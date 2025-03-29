
import { useState, useEffect, useRef, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";

interface UseCarouselNavigationProps {
  scripts: any[];
  onLoadMore: () => Promise<void>;
}

export function useCarouselNavigation({ scripts, onLoadMore }: UseCarouselNavigationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    dragFree: false,
    containScroll: "keepSnaps",
    draggable: true, // Explicitly enable dragging/swiping
    align: "center"
  });
  const [isLoading, setIsLoading] = useState(false);
  const previousScriptsLength = useRef(scripts.length);

  // Function to handle when the user reaches the end of available content
  const handleReachEnd = useCallback(async (index: number) => {
    if (index === scripts.length - 1 && !isLoading) {
      setIsLoading(true);
      console.log("Reached end of content, loading more...");
      try {
        await onLoadMore();
      } catch (error) {
        console.error("Error loading more content:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [scripts.length, isLoading, onLoadMore]);

  // Initialize carousel and set up event listeners when component mounts
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const newIndex = emblaApi.selectedScrollSnap();
      console.log("Carousel selected index:", newIndex);
      setCurrentIndex(newIndex);
      handleReachEnd(newIndex);
    };

    console.log("Setting up Embla carousel event listeners");
    emblaApi.on("select", onSelect);
    
    // Force update carousel state on first load
    emblaApi.reInit();
    
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, handleReachEnd]);

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
  const handlePrevious = useCallback(() => {
    if (emblaApi) {
      console.log("Scrolling to previous slide");
      emblaApi.scrollPrev();
    }
  }, [emblaApi]);

  const handleNext = useCallback(() => {
    if (emblaApi) {
      console.log("Scrolling to next slide");
      emblaApi.scrollNext();
      
      // If we're moving to the last slide, preload more content
      const newIndex = emblaApi.selectedScrollSnap();
      if (newIndex === scripts.length - 1) {
        handleReachEnd(newIndex);
      }
    }
  }, [emblaApi, scripts.length, handleReachEnd]);

  return {
    emblaRef,
    currentIndex,
    isLoading,
    handlePrevious,
    handleNext
  };
}
