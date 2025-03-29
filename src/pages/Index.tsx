
import { useState } from "react";
import NewsHeader from "@/components/NewsHeader";
import CategorizedNewsList from "@/components/CategorizedNewsList";

const Index = () => {
  const [selectedCategory] = useState<string>("summarized");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleClearCache = () => {
    // Increment refresh trigger to force re-fetch
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader onClearCache={handleClearCache} />
      <main className="container mx-auto px-4 py-4 flex-grow">
        <CategorizedNewsList 
          selectedCategory={selectedCategory}
          refreshTrigger={refreshTrigger}
        />
      </main>
      <footer className="bg-gray-100 border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} SumNews - Your RSS News Reader
        </div>
      </footer>
    </div>
  );
};

export default Index;
