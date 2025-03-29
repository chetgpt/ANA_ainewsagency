
import { useState, useEffect } from "react";
import NewsHeader from "@/components/NewsHeader";
import NewsList from "@/components/NewsList";
import { Rss, Bug } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [summarizingCount, setSummarizingCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showDebug, setShowDebug] = useState(true); // Default to showing debug
  const [lastError, setLastError] = useState<string | null>(null);

  // Add a state to track network activity
  const [networkActivity, setNetworkActivity] = useState<{url: string, status: string}[]>([]);

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

  // Monitor for network errors
  useEffect(() => {
    // Capture error events
    const errorHandler = (event: ErrorEvent) => {
      console.log("Error detected:", event.message);
      setLastError(event.message);
    };

    // Capture network requests
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'unknown';
      
      setNetworkActivity(prev => [...prev.slice(-6), {url, status: 'pending'}]);
      
      try {
        const response = await originalFetch(input, init);
        
        setNetworkActivity(prev => 
          prev.map(item => 
            item.url === url ? {...item, status: `${response.status} ${response.statusText}`} : item
          )
        );
        
        return response;
      } catch (error) {
        setNetworkActivity(prev => 
          prev.map(item => 
            item.url === url ? {...item, status: `Error: ${error instanceof Error ? error.message : 'Unknown'}`} : item
          )
        );
        throw error;
      }
    };

    window.addEventListener('error', errorHandler);
    return () => {
      window.removeEventListener('error', errorHandler);
      window.fetch = originalFetch;
    };
  }, []);

  // Force a console.log of debug info
  useEffect(() => {
    console.log("NewsHub Application Starting - CBS News Only Version");
    console.log("User Agent:", navigator.userAgent);
    console.log("Window Size:", window.innerWidth, "x", window.innerHeight);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader 
        sourceName="CBS News World" 
        sourceUrl="https://www.cbsnews.com/world/" 
        isProcessing={summarizingCount > 0}
        processingCount={summarizingCount}
        lastUpdated={lastUpdated}
      />
      <main className="container mx-auto px-4 py-4 flex-grow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Latest World News</h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">Showing news from the last 24 hours</div>
            <button 
              onClick={toggleDebug}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded flex items-center"
              title="Show debug info"
            >
              <Bug className="h-3 w-3 mr-1" />
              Debug
            </button>
          </div>
        </div>
        
        {showDebug && (
          <div className="mb-4 p-4 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-80">
            <h3 className="font-bold mb-2">RSS Debug Info:</h3>
            
            {lastError && (
              <Alert variant="destructive" className="mb-2">
                <AlertTitle>Last Error:</AlertTitle>
                <AlertDescription>{lastError}</AlertDescription>
              </Alert>
            )}
            
            <div className="mb-2">
              <p className="font-semibold">Network Activity:</p>
              {networkActivity.length > 0 ? (
                <ul className="pl-4 list-disc">
                  {networkActivity.map((activity, i) => (
                    <li key={i} className="mb-1 break-all">
                      <span className={activity.status.includes('Error') ? 'text-red-500' : 'text-green-600'}>
                        {activity.status}
                      </span>: {activity.url.substring(0, 80)}...
                      {activity.url.includes('cbsnews.com') && <strong className="text-blue-600"> (CBS Feed)</strong>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No network requests captured yet</p>
              )}
            </div>
            
            <p>Current RSS Source: <strong>https://www.cbsnews.com/latest/rss/world</strong></p>
            <p>Check the browser console (F12) for detailed RSS fetch logs.</p>
            
            <Button
              variant="destructive"
              size="sm"
              className="mt-2"
              onClick={() => {
                console.clear();
                setNetworkActivity([]);
                setLastError(null);
                console.log("Debug logs cleared");
              }}
            >
              Clear Logs
            </Button>
          </div>
        )}
        
        <NewsList 
          onStatusUpdate={handleStatusUpdate} 
          feedUrl="https://www.cbsnews.com/latest/rss/world" 
        />
      </main>
      <footer className="bg-gray-100 border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} CBS News World - RSS News Reader
        </div>
      </footer>
    </div>
  );
};

export default Index;
