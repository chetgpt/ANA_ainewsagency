
import { useState, useEffect } from "react";
import NewsHeader from "@/components/NewsHeader";
import NewsList from "@/components/NewsList";

const Index = () => {
  const [summarizingCount, setSummarizingCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Function to receive updates from NewsList
  const handleStatusUpdate = (count: number, lastUpdate: Date | null) => {
    setSummarizingCount(count);
    if (lastUpdate) {
      setLastUpdated(lastUpdate);
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
        <h2 className="text-2xl font-bold mb-6">Latest News</h2>
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
