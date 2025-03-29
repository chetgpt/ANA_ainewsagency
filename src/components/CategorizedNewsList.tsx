
import { useState, useEffect } from "react";
import { Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateNewsScript } from "@/utils/textAnalysis";

interface CategorizedNewsListProps {
  selectedCategory: string;
}

const CategorizedNewsList = ({ selectedCategory }: CategorizedNewsListProps) => {
  const [loading, setLoading] = useState(true);
  const [script, setScript] = useState<{title: string, content: string, type: string} | null>(null);
  const { toast } = useToast();

  // Generate a sample news script
  useEffect(() => {
    const generateSampleScript = () => {
      setLoading(true);
      
      // Sample news item with predefined data
      const sampleNewsItem = {
        title: "Sample Technology News Story",
        description: "This is a sample news story about recent developments in technology that is meant to demonstrate the script generation feature.",
        sentiment: "positive" as const,
        keywords: ["technology", "innovation", "development"],
        readingTimeSeconds: 180,
        pubDate: new Date().toUTCString(),
        link: "#",
        sourceName: "NewsHub",
      };
      
      // Generate script for the sample news item
      const newsScript = generateNewsScript(sampleNewsItem);
      
      const scriptData = {
        title: sampleNewsItem.title,
        content: newsScript,
        type: 'single'
      };
      
      setScript(scriptData);
      setLoading(false);
      
      toast({
        title: "Script Generated",
        description: "A sample news script has been created",
      });
    };
    
    // Generate the sample script
    generateSampleScript();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Generating sample news script...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">News Script</h2>
      </div>
      
      {!script ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mr-2" />
          <span className="text-gray-600">Generating news script...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 py-4">
          <Card className="h-full hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {script.title}
              </CardTitle>
              <div className="text-xs text-gray-500 mt-1">
                {script.type === 'group' ? 'Multiple Related Articles' : 'Single Article'}
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-md border mb-4">
                <pre className="whitespace-pre-wrap text-sm">{script.content}</pre>
              </div>
              <button 
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(script.content);
                  toast({
                    title: "Copied to clipboard",
                    description: "The script has been copied to your clipboard",
                  });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard">
                  <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                </svg>
                Copy to clipboard
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CategorizedNewsList;
