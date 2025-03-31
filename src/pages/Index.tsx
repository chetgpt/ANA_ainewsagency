
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
    promptSubmitted,
    handlePromptSubmit, 
    resetPrompt,
    DEFAULT_PROMPT,
    displayEmptyField
  } = useCustomPrompt();

  // Set summarized category on component mount
  useEffect(() => {
    setSelectedCategory("summarized");
  }, []);

  // Apply custom prompt to LLM service when it changes and has been submitted
  useEffect(() => {
    if (promptSubmitted) {
      setCustomPrompt(customPrompt);
      // Trigger refresh when prompt is submitted to start fetching news
      setRefreshTrigger(prev => prev + 1);
    }
  }, [customPrompt, promptSubmitted]);

  const handleClearCache = () => {
    // Increment refresh trigger to force re-fetch
    setRefreshTrigger(prev => prev + 1);
  };

  const handlePromptUpdate = (prompt?: string) => {
    handlePromptSubmit(prompt);
    // No need to manually trigger refresh here as it will be handled by the useEffect above
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader 
        onClearCache={handleClearCache} 
        onResetPrompt={resetPrompt}
      />
      <main className="container mx-auto px-4 py-4 flex-grow">
        {promptSubmitted ? (
          <CategorizedNewsList 
            selectedCategory={selectedCategory}
            refreshTrigger={refreshTrigger}
            showToastOnInit={false} // Don't show toast on initial load
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-lg text-gray-500">
              Please set your news style preferences to start loading news
            </p>
          </div>
        )}
      </main>
      <footer className="bg-gray-100 border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} ANA - AI News Agency
        </div>
      </footer>
      
      <PromptModal
        open={showPromptModal}
        onClose={handlePromptUpdate}
        defaultPrompt={displayEmptyField ? "" : DEFAULT_PROMPT}
      />
    </div>
  );
};

export default Index;
