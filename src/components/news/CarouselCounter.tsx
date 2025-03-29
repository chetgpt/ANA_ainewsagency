
import React from "react";

interface CarouselCounterProps {
  currentIndex: number;
  totalItems: number;
}

const CarouselCounter: React.FC<CarouselCounterProps> = ({ currentIndex, totalItems }) => {
  return (
    <div className="flex items-center justify-center mb-4">
      <span className="text-sm text-gray-500">
        {currentIndex + 1} / {totalItems}
      </span>
    </div>
  );
};

export default CarouselCounter;
