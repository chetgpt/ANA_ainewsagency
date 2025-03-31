
import { useState, useEffect } from "react";
import NewsHeader from "@/components/NewsHeader";
import CategorizedNewsList from "@/components/CategorizedNewsList";
import PromptModal from "@/components/PromptModal";
import { useCustomPrompt } from "@/hooks/use-custom-prompt";
import { setCustomPrompt } from "@/utils/llmService";
import { Progress } from "@/components/ui/progress";

const Index = () => {
  // Always use summarized as the category
  const [selectedCategory, setSelectedCategory] = useState<string>("summarized");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const { 
    customPrompt, 
    showPromptModal, 
    promptSubmitted,
    handlePromptSubmit, 
    resetPrompt,
    DEFAULT_PROMPT
  } = useCustomPrompt();

  // Set summarized category on component mount
  useEffect(() => {
    setSelectedCategory("summarized");
  }, []);

  // Apply custom prompt to LLM service when it changes and has been submitted
  useEffect(() => {
    if (promptSubmitted) {
      setCustomPrompt(customPrompt);
      // Start loading animation
      setIsLoading(true);
      setLoadingProgress(0);
      
      // Simulate progress while fetching news
      const timer = setInterval(() => {
        setLoadingProgress((oldProgress) => {
          // Slowly increase to 90%, the final 10% will complete when news actually loads
          const newProgress = Math.min(oldProgress + 2, 90);
          return newProgress;
        });
      }, 300);
      
      // Trigger refresh when prompt is submitted to start fetching news
      setRefreshTrigger(prev => prev + 1);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [customPrompt, promptSubmitted]);

  const handleClearCache = () => {
    // Increment refresh trigger to force re-fetch
    setRefreshTrigger(prev => prev + 1);
    setIsLoading(true);
    setLoadingProgress(0);
  };

  const handlePromptUpdate = (prompt?: string) => {
    handlePromptSubmit(prompt);
  };

  // When news finishes loading
  const handleNewsLoaded = () => {
    setIsLoading(false);
    setLoadingProgress(100);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader 
        onClearCache={handleClearCache} 
        onResetPrompt={resetPrompt}
      />
      <main className="container mx-auto px-4 py-4 flex-grow">
        {!promptSubmitted ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-lg text-gray-500">
              Please set your news style preferences to start loading news
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-6">
            <p className="text-xl text-blue-600 font-medium">
              Please wait while we curate your personalized news...
            </p>
            <div className="w-full max-w-md">
              <Progress value={loadingProgress} className="h-2" />
              <p className="text-sm text-gray-500 mt-2 text-center">
                Generating AI-powered summaries based on your preferences
              </p>
            </div>
          </div>
        ) : (
          <CategorizedNewsList 
            selectedCategory={selectedCategory}
            refreshTrigger={refreshTrigger}
            onLoadComplete={handleNewsLoaded}
          />
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
        defaultPrompt={DEFAULT_PROMPT}
      />
    </div>
  );
};

export default Index;
