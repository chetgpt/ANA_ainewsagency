
import { Newspaper, Settings, Trash, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useCustomPrompt } from "@/hooks/use-custom-prompt";
import { setCustomPrompt } from "@/utils/llmService";

interface NewsHeaderProps {
  onClearCache?: () => void;
  onResetPrompt?: () => void;
}

const NewsHeader = ({ onClearCache, onResetPrompt }: NewsHeaderProps) => {
  const { toast } = useToast();
  const { customPrompt: storedPrompt, DEFAULT_PROMPT } = useCustomPrompt();
  
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [prompt, setPrompt] = useState(storedPrompt);

  const handleClearCache = () => {
    // Clear all news cache from localStorage
    const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('news-cache-'));
    cacheKeys.forEach(key => localStorage.removeItem(key));
    
    if (onClearCache) {
      onClearCache();
    }
    
    toast({
      title: "Cache cleared",
      description: "All cached news have been cleared",
    });
  };
  
  const handleResetPrompt = () => {
    if (onResetPrompt) {
      onResetPrompt();
    }
    
    localStorage.removeItem("news-custom-prompt");
    setPrompt(DEFAULT_PROMPT);
    setCustomPrompt(null);
    
    toast({
      title: "Prompt reset",
      description: "News style has been reset to default",
    });
  };
  
  const handleOpenPromptDialog = () => {
    setPrompt(storedPrompt);
    setShowPromptDialog(true);
  };
  
  const handleSavePrompt = () => {
    if (prompt && prompt.trim()) {
      localStorage.setItem("news-custom-prompt", prompt);
      setCustomPrompt(prompt);
      
      if (onClearCache) {
        onClearCache(); // Refresh news with new prompt
      }
      
      toast({
        title: "Prompt updated",
        description: "Your custom news style has been applied",
      });
    }
    
    setShowPromptDialog(false);
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Newspaper className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">SumNews</h1>
          </div>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-gray-100">
                  <Settings className="h-5 w-5 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleOpenPromptDialog} className="cursor-pointer">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Customize news style
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleResetPrompt} className="cursor-pointer">
                  <MessageCircle className="h-4 w-4 mr-2 text-orange-500" />
                  Reset news style
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleClearCache} className="text-red-600 cursor-pointer">
                  <Trash className="h-4 w-4 mr-2" />
                  Clear news cache
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Customize News Style</DialogTitle>
            <DialogDescription>
              Enter a prompt to customize how AI processes and presents news articles.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Summarize news in a casual, friendly tone with key facts highlighted"
              className="min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Your prompt will be used by our AI to style all news summaries.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromptDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrompt}>
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewsHeader;
