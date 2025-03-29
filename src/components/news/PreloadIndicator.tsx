
import React from "react";

interface PreloadIndicatorProps {
  preloadedCount: number;
}

const PreloadIndicator: React.FC<PreloadIndicatorProps> = ({ preloadedCount }) => {
  if (preloadedCount === 0) return null;
  
  return (
    <div className="text-sm text-gray-500">
      <span>{preloadedCount} article{preloadedCount !== 1 ? 's' : ''} ready</span>
    </div>
  );
};

export default PreloadIndicator;
