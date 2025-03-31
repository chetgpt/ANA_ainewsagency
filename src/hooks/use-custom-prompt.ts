
import { useState, useEffect } from "react";

const DEFAULT_PROMPT = `You are a news analysis assistant with web search capabilities.
Analyze the following news article using this comprehensive framework:

1. Present Event (Anchor)
   - Define: Who, what, when, and where—citing at least one source or piece of data.
   - Goal: Establish a clear "anchor" event that everything else revolves around.

2. Backward Analysis (Causes) with Multiple Layers
   - Layered Causes: For each immediate cause, list sub-causes (up to 2–3 layers).
   - Assign Probabilities: E.g., "Cause A: 70%," "Sub-cause A1: 50%."
   - Fact Basis: Cite relevant info (historical data, reports) for each layer.

3. Forward Analysis (Effects) with Multiple Layers
   - Layered Outcomes: For each first-level effect, list sub-effects (again, 2–3 layers).
   - Assign Probabilities: E.g., "Effect A: 80%," "Sub-effect A1: 40%."
   - Fact Basis: Reference known patterns or real-time data.

4. Comprehensive Impact List (All Affected Fields)
   - Collect All Impacts: Generate one consolidated list of every domain, industry, or field affected.

5. Additional Questions:
   - Who gains money or power from this?
   - What previous patterns does this fit into?
   - What is NOT being reported?

USE THIS FRAMEWORK FOR YOUR ANALYSIS, BUT DO NOT STRUCTURE YOUR RESPONSE AROUND IT.

Instead, write a CASUAL, CONVERSATIONAL summary that:
- Uses everyday language a non-expert would understand
- Avoids jargon, technical terms, and complex sentences
- Explains concepts simply as if talking to a friend
- Never mentions the framework sections explicitly
- Flows naturally between ideas without formal section headers
- Includes the key insights from your analysis in an approachable way
- Mentions major causes and effects with approximate likelihoods in plain language
- Points out who benefits and what patterns this fits`;

export function useCustomPrompt() {
  const [customPrompt, setCustomPrompt] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(true); // Always show on initial load
  const [promptSubmitted, setPromptSubmitted] = useState(false);

  useEffect(() => {
    // Check if we have a stored prompt
    const storedPrompt = localStorage.getItem("news-custom-prompt");
    if (storedPrompt) {
      setCustomPrompt(storedPrompt);
      setPromptSubmitted(true); // Consider stored prompt as submitted
    } else {
      // Always show modal if no stored prompt
      setShowPromptModal(true);
      setPromptSubmitted(false);
    }
  }, []);

  const handlePromptSubmit = (prompt?: string) => {
    if (prompt) {
      setCustomPrompt(prompt);
      setPromptSubmitted(true);
    } else {
      // Use default prompt if user skips
      setCustomPrompt(DEFAULT_PROMPT);
      setPromptSubmitted(true);
    }
    setShowPromptModal(false);
  };

  const resetPrompt = () => {
    localStorage.removeItem("news-custom-prompt");
    setCustomPrompt(null);
    setPromptSubmitted(false);
    setShowPromptModal(true);
  };

  return {
    customPrompt: customPrompt || DEFAULT_PROMPT,
    showPromptModal,
    promptSubmitted,
    handlePromptSubmit,
    resetPrompt,
    DEFAULT_PROMPT
  };
}
