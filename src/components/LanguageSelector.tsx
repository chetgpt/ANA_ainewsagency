
import React, { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { Language, getCurrentLanguage } from "@/utils/llmService";
import { useToast } from "@/hooks/use-toast";

interface LanguageSelectorProps {
  onLanguageChange?: (language: Language) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onLanguageChange }) => {
  const [language, setLanguage] = useState<Language>(() => getCurrentLanguage());
  const { toast } = useToast();

  // Set language on first load
  useEffect(() => {
    const currentLanguage = getCurrentLanguage();
    setLanguage(currentLanguage);
  }, []);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('preferred-language', newLanguage);
    
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
    
    toast({
      title: "Language Changed",
      description: `The language has been changed to ${newLanguage === "english" ? "English" : "Indonesian"}`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
          <Globe className="h-4 w-4" />
          <span className="capitalize">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleLanguageChange("english")}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLanguageChange("indonesian")}>
          Indonesian
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
