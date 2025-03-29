
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { checkApiAvailability } from "@/utils/llmService";
import { Loader2 } from "lucide-react";

const ApiKeyForm = () => {
  const [geminiKey, setGeminiKey] = useState("");
  const [perplexityKey, setPerplexityKey] = useState("");
  const [apiStatus, setApiStatus] = useState({ geminiAvailable: false, perplexityAvailable: false });
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const { toast } = useToast();

  // Load saved keys on component mount
  useEffect(() => {
    // First check environment variables
    const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const envPerplexityKey = import.meta.env.VITE_LLM_API_KEY || "";
    
    console.log("Environment GEMINI_API_KEY:", envGeminiKey ? "Found (length: " + envGeminiKey.length + ")" : "Not found");
    console.log("Environment VITE_GEMINI_API_KEY:", import.meta.env.VITE_GEMINI_API_KEY ? "Found" : "Not found");
    console.log("Raw env value:", import.meta.env.VITE_GEMINI_API_KEY);
    
    // Then check localStorage as fallback
    const savedGeminiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || "";
    const savedPerplexityKey = localStorage.getItem("VITE_LLM_API_KEY") || "";
    
    // Use environment variable if available, otherwise use localStorage
    setGeminiKey(envGeminiKey || savedGeminiKey);
    setPerplexityKey(envPerplexityKey || savedPerplexityKey);
    
    // Check API availability
    const status = checkApiAvailability();
    setApiStatus(status);
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
    
    // Update API status
    const newStatus = {
      geminiAvailable: !!geminiKey,
      perplexityAvailable: !!perplexityKey
    };
    setApiStatus(newStatus);
    
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved to local storage",
    });
    
    // Reload the page to apply the new API keys
    window.location.reload();
  };

  const testGeminiApiKey = async () => {
    setIsTestingApi(true);
    setTestResult(null);
    
    try {
      // Updated to use gemini-2.0-flash model
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Hello, please respond with a simple 'API is working' if you receive this message."
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 50,
          },
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log("Gemini API test successful:", data);
        setTestResult({
          success: true,
          message: "API key is working correctly!"
        });
        toast({
          title: "API Test Successful",
          description: "Your Gemini API key is working correctly",
          variant: "default"
        });
      } else {
        console.error("Gemini API test failed:", data);
        setTestResult({
          success: false,
          message: `Error: ${data.error?.message || "Unknown error"}`
        });
        toast({
          title: "API Test Failed",
          description: data.error?.message || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error testing Gemini API:", error);
      setTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      });
      toast({
        title: "API Test Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsTestingApi(false);
    }
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
            <Label htmlFor="gemini-api-key">
              Gemini API Key (Recommended)
              {apiStatus.geminiAvailable && (
                <span className="ml-2 text-green-600 text-xs">✓ Configured</span>
              )}
            </Label>
            <Input
              id="gemini-api-key"
              type="password"
              placeholder="Enter your Google Gemini API key"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Get a free API key from Google AI Studio
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testGeminiApiKey}
                disabled={!geminiKey || isTestingApi}
                className="text-xs"
              >
                {isTestingApi ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Testing...
                  </>
                ) : "Test API Key"}
              </Button>
            </div>
            {testResult && (
              <div className={`mt-2 p-2 text-sm rounded ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {testResult.message}
              </div>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="perplexity-api-key">
              Perplexity API Key (Optional)
              {apiStatus.perplexityAvailable && (
                <span className="ml-2 text-green-600 text-xs">✓ Configured</span>
              )}
            </Label>
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
