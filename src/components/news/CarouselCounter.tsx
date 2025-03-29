
import React from "react";

interface CarouselCounterProps {
  currentIndex: number;
  totalItems: number;
}

const CarouselCounter: React.FC<CarouselCounterProps> = ({ currentIndex, totalItems }) => {
  return (
    <div className="flex items-center justify-center mb-4">
      <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full">
        {currentIndex + 1} / {totalItems}
      </span>
    </div>
  );
};

export default CarouselCounter;
