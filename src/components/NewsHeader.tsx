
import { Newspaper, RefreshCw } from "lucide-react";

interface NewsHeaderProps {
  sourceName: string;
  sourceUrl: string;
  lastUpdated?: Date | null;
  isProcessing?: boolean;
  processingCount?: number;
}

const NewsHeader = ({ 
  sourceName, 
  sourceUrl, 
  lastUpdated,
  isProcessing = false,
  processingCount = 0
}: NewsHeaderProps) => {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Newspaper className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">NewsHub</h1>
        </div>
        <div className="flex items-center">
          {isProcessing && (
            <div className="flex items-center mr-4 text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              <span className="text-xs">
                {processingCount > 0 ? `Processing ${processingCount} articles` : 'Processing'}
              </span>
            </div>
          )}
          {lastUpdated && (
            <div className="text-xs text-gray-500 mr-4">
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
          <div className="text-sm text-gray-600">
            Source: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 font-medium">{sourceName}</a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NewsHeader;
