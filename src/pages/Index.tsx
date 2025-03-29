
import { useState, useEffect } from "react";
import NewsHeader from "@/components/NewsHeader";
import CategorizedNewsList from "@/components/CategorizedNewsList";

const Index = () => {
  // Always use summarized as the category
  const [selectedCategory, setSelectedCategory] = useState<string>("summarized");

  // Set summarized category on component mount
  useEffect(() => {
    setSelectedCategory("summarized");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader sourceName="ABC News" sourceUrl="https://abcnews.go.com" />
      <main className="container mx-auto px-4 py-4 flex-grow">
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
