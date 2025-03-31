
import { useState, useEffect } from "react";
import NewsHeader from "@/components/NewsHeader";
import CategorizedNewsList from "@/components/CategorizedNewsList";
import PromptModal from "@/components/PromptModal";
import { useCustomPrompt } from "@/hooks/use-custom-prompt";
import { setCustomPrompt } from "@/utils/llmService";

const Index = () => {
  // Always use summarized as the category
  const [selectedCategory, setSelectedCategory] = useState<string>("summarized");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  const { 
    customPrompt, 
    showPromptModal, 
    handlePromptSubmit, 
    resetPrompt,
    DEFAULT_PROMPT
  } = useCustomPrompt();

  // Set summarized category on component mount
  useEffect(() => {
    setSelectedCategory("summarized");
  }, []);

  // Apply custom prompt to LLM service when it changes
  useEffect(() => {
    setCustomPrompt(customPrompt);
  }, [customPrompt]);

  const handleClearCache = () => {
    // Increment refresh trigger to force re-fetch
    setRefreshTrigger(prev => prev + 1);
  };

  const handlePromptUpdate = (prompt?: string) => {
    handlePromptSubmit(prompt);
    if (prompt) {
      // Force refresh of news to apply the new prompt
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader 
        onClearCache={handleClearCache} 
        onResetPrompt={resetPrompt}
      />
      <main className="container mx-auto px-4 py-4 flex-grow">
        <CategorizedNewsList 
          selectedCategory={selectedCategory}
          refreshTrigger={refreshTrigger}
        />
      </main>
      <footer className="bg-gray-100 border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} ANA - AI News Agency
        </div>
      </footer>
      
      <PromptModal
        open={showPromptModal}
        onClose={handlePromptUpdate}
        defaultPrompt={DEFAULT_PROMPT}
      />
    </div>
  );
};

export default Index;
