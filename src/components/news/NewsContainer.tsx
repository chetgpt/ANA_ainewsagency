
import React from "react";
import NewsLoadingState from "@/components/news/NewsLoadingState";
import NewsCarousel from "@/components/news/NewsCarousel";
import PreloadIndicator from "@/components/news/PreloadIndicator";
import { NewsScript } from "@/hooks/useNewsLoader";

interface NewsContainerProps {
  loading: boolean;
  scripts: NewsScript[];
  preloadedCount: number;
  onLoadMore: () => Promise<void>;
}

const NewsContainer: React.FC<NewsContainerProps> = ({ 
  loading, 
  scripts, 
  preloadedCount,
  onLoadMore 
}) => {
  if (loading) {
    return <NewsLoadingState />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">News Summary</h2>
        <PreloadIndicator preloadedCount={preloadedCount} />
      </div>
      
      {scripts.length === 0 ? (
        <NewsLoadingState message="Generating news summary..." />
      ) : (
        <NewsCarousel scripts={scripts} onLoadMore={onLoadMore} />
      )}
    </div>
  );
};

export default NewsContainer;
