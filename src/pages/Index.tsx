
import { useState, useEffect } from "react";
import NewsHeader from "@/components/NewsHeader";
import CategorizedNewsList from "@/components/CategorizedNewsList";
import NewsList from "@/components/NewsList";

const Index = () => {
  // Always use summarized as the category
  const [selectedCategory, setSelectedCategory] = useState<string>("summarized");

  // Set summarized category on component mount
  useEffect(() => {
    setSelectedCategory("summarized");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader sourceName="NewsHub" sourceUrl="#" />
      <main className="container mx-auto px-4 py-4 flex-grow">
        <h2 className="text-2xl font-bold mb-6">Latest News</h2>
        <NewsList />
        
        <h2 className="text-2xl font-bold mt-10 mb-6">Categorized News</h2>
        <CategorizedNewsList 
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
