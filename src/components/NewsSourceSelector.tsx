
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rss } from "lucide-react";

export interface NewsSource {
  name: string;
  url: string;
  feedUrl: string;
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    name: "CBS News World",
    url: "https://www.cbsnews.com/world/",
    feedUrl: "https://www.cbsnews.com/latest/rss/world",
  }
];

interface NewsSourceSelectorProps {
  currentSource: NewsSource;
  onSourceChange: (source: NewsSource) => void;
}

const NewsSourceSelector = ({ currentSource, onSourceChange }: NewsSourceSelectorProps) => {
  // Since we only have one source now, no need for a dropdown
  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg p-2 shadow-sm">
      <Rss className="h-5 w-5 text-blue-600" />
      <span className="text-gray-800 font-medium">{currentSource.name}</span>
    </div>
  );
};

export default NewsSourceSelector;
