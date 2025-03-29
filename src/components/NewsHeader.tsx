
import { Newspaper, Settings, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface NewsHeaderProps {
  onClearCache?: () => void;
}

const NewsHeader = ({ onClearCache }: NewsHeaderProps) => {
  const { toast } = useToast();

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

  return (
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
              <DropdownMenuItem onClick={handleClearCache} className="text-red-600 cursor-pointer">
                <Trash className="h-4 w-4 mr-2" />
                Clear news cache
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default NewsHeader;
