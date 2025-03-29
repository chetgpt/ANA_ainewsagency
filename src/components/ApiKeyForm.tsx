
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ApiKeyForm = () => {
  const [geminiKey, setGeminiKey] = useState("");
  const [perplexityKey, setPerplexityKey] = useState("");
  const { toast } = useToast();

  // Load saved keys on component mount
  useEffect(() => {
    const savedGeminiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || "";
    const savedPerplexityKey = localStorage.getItem("VITE_LLM_API_KEY") || "";
    
    setGeminiKey(savedGeminiKey);
    setPerplexityKey(savedPerplexityKey);
  }, []);

  const saveApiKeys = () => {
    if (geminiKey) {
      localStorage.setItem("VITE_GEMINI_API_KEY", geminiKey);
    } else {
      localStorage.removeItem("VITE_GEMINI_API_KEY");
    }
    
    if (perplexityKey) {
      localStorage.setItem("VITE_LLM_API_KEY", perplexityKey);
    } else {
      localStorage.removeItem("VITE_LLM_API_KEY");
    }
    
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved to local storage",
    });
    
    // Reload the page to apply the new API keys
    window.location.reload();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Configure AI Settings</CardTitle>
        <CardDescription>
          Enter your API keys for enhanced news summaries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="gemini-api-key">Gemini API Key (Recommended)</Label>
            <Input
              id="gemini-api-key"
              type="password"
              placeholder="Enter your Google Gemini API key"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Get a free API key from Google AI Studio
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="perplexity-api-key">Perplexity API Key (Optional)</Label>
            <Input
              id="perplexity-api-key"
              type="password"
              placeholder="Enter your Perplexity API key"
              value={perplexityKey}
              onChange={(e) => setPerplexityKey(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={saveApiKeys} className="w-full">Save API Keys</Button>
      </CardFooter>
    </Card>
  );
};

export default ApiKeyForm;
