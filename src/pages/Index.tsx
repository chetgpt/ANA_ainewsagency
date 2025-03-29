
import { useState, useEffect } from "react";
import NewsHeader from "@/components/NewsHeader";
import CategorizedNewsList from "@/components/CategorizedNewsList";
import LanguageSelector from "@/components/LanguageSelector";
import { Language } from "@/utils/llmService";

const Index = () => {
  // Always use summarized as the category
  const [selectedCategory, setSelectedCategory] = useState<string>("summarized");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [language, setLanguage] = useState<Language>("english");

  // Set summarized category on component mount
  useEffect(() => {
    setSelectedCategory("summarized");
  }, []);

  const handleClearCache = () => {
    // Increment refresh trigger to force re-fetch
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    // Refresh news to get them in the new language
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader onClearCache={handleClearCache} />
      <main className="container mx-auto px-4 py-4 flex-grow">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">News Summary</h1>
          <LanguageSelector onLanguageChange={handleLanguageChange} />
        </div>
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
