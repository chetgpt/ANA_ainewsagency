
import { useState } from "react";
import NewsHeader from "@/components/NewsHeader";
import NewsList from "@/components/NewsList";
import NewsSourceSelector, { NEWS_SOURCES, NewsSource } from "@/components/NewsSourceSelector";

const Index = () => {
  const [currentSource, setCurrentSource] = useState<NewsSource>(NEWS_SOURCES[0]);

  const handleSourceChange = (newSource: NewsSource) => {
    setCurrentSource(newSource);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader sourceName={currentSource.name} sourceUrl={currentSource.url} />
      <div className="container mx-auto px-4 pt-4">
        <NewsSourceSelector 
          currentSource={currentSource} 
          onSourceChange={handleSourceChange} 
        />
      </div>
      <main className="container mx-auto px-4 py-4 flex-grow">
        <NewsList feedUrl={currentSource.feedUrl} />
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
