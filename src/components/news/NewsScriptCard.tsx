
import { FileText, Copy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface NewsScriptCardProps {
  script: {
    title: string;
    content: string;
    type: string;
    summary?: {
      description: string;
      sentiment: "positive" | "negative" | "neutral";
      keywords: string[];
      readingTimeSeconds: number;
      pubDate: string;
      sourceName: string;
    }
  }
}

const NewsScriptCard = ({ script }: NewsScriptCardProps) => {
  const { toast } = useToast();

  const handleCopyClick = () => {
    if (script?.content) {
      navigator.clipboard.writeText(script.content);
      toast({
        title: "Copied to clipboard",
        description: "The news summary has been copied to your clipboard",
      });
    }
  };

  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {script.title}
        </CardTitle>
        <div className="text-xs text-gray-500 mt-1">
          {script.type === 'group' ? 'Multiple Related Articles' : 'Complete Summary'}
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-4 rounded-md border mb-4">
          <div className="whitespace-pre-wrap text-sm">{script.content}</div>
        </div>
        <div className="flex justify-end">
          <button 
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-md transition-colors"
            onClick={handleCopyClick}
          >
            <Copy className="h-4 w-4" />
            Copy summary
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsScriptCard;
