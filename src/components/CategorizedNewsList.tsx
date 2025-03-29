
import React from "react";
import { useNewsLoader } from "@/hooks/useNewsLoader";
import NewsContainer from "@/components/news/NewsContainer";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

const CategorizedNewsList: React.FC<CategorizedNewsListProps> = ({ selectedCategory }) => {
  const { loading, scripts, preloadedNews, loadNextNews } = useNewsLoader();

  return (
    <NewsContainer
      loading={loading}
      scripts={scripts}
      preloadedCount={preloadedNews.length}
      onLoadMore={loadNextNews}
    />
  );
};

export default CategorizedNewsList;
