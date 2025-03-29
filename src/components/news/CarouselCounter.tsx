
import React from "react";

interface CarouselCounterProps {
  currentIndex: number;
  totalItems: number;
}

const CarouselCounter: React.FC<CarouselCounterProps> = ({ currentIndex, totalItems }) => {
  return (
    <div className="flex items-center justify-center mb-6">
      <span className="text-sm font-medium bg-gray-100 px-4 py-2 rounded-full shadow-sm border border-gray-200">
        {currentIndex + 1} / {totalItems}
      </span>
    </div>
  );
};

export default CarouselCounter;
