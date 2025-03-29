
import { useState } from "react";
import NewsHeader from "@/components/NewsHeader";
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
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">RSS Feed Selected</h2>
          <p className="text-gray-700 mb-2">
            <span className="font-medium">Source:</span> {currentSource.name}
          </p>
          <p className="text-gray-700 mb-2">
            <span className="font-medium">Feed URL:</span> {currentSource.feedUrl}
          </p>
          <p className="text-gray-500 text-sm italic mt-4">
            News display has been removed as requested, but the RSS feed selection functionality is still active.
          </p>
        </div>
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
