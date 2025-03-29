
import { useState } from "react";
import NewsHeader from "@/components/NewsHeader";
import NewsSourceSelector, { NEWS_SOURCES, NewsSource } from "@/components/NewsSourceSelector";
import CategorizedNewsList from "@/components/CategorizedNewsList";
import NewsCategories from "@/components/NewsCategories";

const Index = () => {
  const [currentSource, setCurrentSource] = useState<NewsSource>(NEWS_SOURCES[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const handleSourceChange = (newSource: NewsSource) => {
    setCurrentSource(newSource);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader sourceName={currentSource.name} sourceUrl={currentSource.url} />
      <div className="container mx-auto px-4 pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <NewsSourceSelector 
            currentSource={currentSource} 
            onSourceChange={handleSourceChange} 
          />
          <NewsCategories 
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>
      </div>
      <main className="container mx-auto px-4 py-4 flex-grow">
        <CategorizedNewsList 
          feedUrl={currentSource.feedUrl}
          selectedCategory={selectedCategory}
        />
      </main>
      <footer className="bg-gray-100 border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} NewsHub - Your RSS News Reader
        </div>
      </footer>
    </div>
  );
};

export default Index;
