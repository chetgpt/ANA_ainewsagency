
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PromptModalProps {
  open: boolean;
  onClose: (prompt?: string) => void;
  defaultPrompt: string;
}

const PromptModal = ({ open, onClose, defaultPrompt }: PromptModalProps) => {
  const [prompt, setPrompt] = useState(defaultPrompt);

  const handleSubmit = () => {
    if (prompt.trim()) {
      // Store the prompt in localStorage for persistence
      localStorage.setItem("news-custom-prompt", prompt);
      onClose(prompt);
    }
  };

  const handleSkip = () => {
    // Pass default prompt when skipping
    onClose(defaultPrompt);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize Your News Experience</DialogTitle>
          <DialogDescription>
            Enter a prompt to customize how AI summarizes and presents news articles.
            No news will be loaded until you submit your preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Summarize news in a casual, friendly tone with key facts highlighted"
            className="min-h-[150px]"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Your prompt will be used by our AI to style all news summaries.
          </p>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleSkip}>
            Use Default Style
          </Button>
          <Button onClick={handleSubmit}>
            Apply Custom Style
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromptModal;
