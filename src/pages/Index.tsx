
import { useState, useEffect } from "react";
import NewsHeader from "@/components/NewsHeader";
import NewsList from "@/components/NewsList";
import { Rss } from "lucide-react";

const Index = () => {
  const [summarizingCount, setSummarizingCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Function to receive updates from NewsList
  const handleStatusUpdate = (count: number, lastUpdate: Date | null) => {
    setSummarizingCount(count);
    if (lastUpdate) {
      setLastUpdated(lastUpdate);
    }
  };

  // Toggle debug panel
  const toggleDebug = () => {
    setShowDebug(!showDebug);
    if (!showDebug) {
      console.log("Debug mode enabled - check console for detailed logs");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader 
        sourceName="NewsHub" 
        sourceUrl="#" 
        isProcessing={summarizingCount > 0}
        processingCount={summarizingCount}
        lastUpdated={lastUpdated}
      />
      <main className="container mx-auto px-4 py-4 flex-grow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Latest News</h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">Showing news from the last 24 hours</div>
            <button 
              onClick={toggleDebug}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
              title="Show debug info"
            >
              <Rss className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        {showDebug && (
          <div className="mb-4 p-4 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
            <h3 className="font-bold">RSS Debug Info:</h3>
            <p>Check the browser console (F12) for detailed RSS fetch logs.</p>
          </div>
        )}
        
        <NewsList onStatusUpdate={handleStatusUpdate} />
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
