
import React from "react";
import { CarouselItem } from "@/components/ui/carousel";

const LoadingCarouselItem: React.FC = () => {
  return (
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
  );
};

export default LoadingCarouselItem;
