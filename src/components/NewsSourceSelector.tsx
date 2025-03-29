
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rss } from "lucide-react";

export interface NewsSource {
  name: string;
  url: string;
  feedUrl: string;
}

// Add CNN as a reliable news source
export const NEWS_SOURCES: NewsSource[] = [
  {
    name: "CNN",
    url: "https://www.cnn.com",
    feedUrl: "http://rss.cnn.com/rss/cnn_topstories.rss"
  }
];

interface NewsSourceSelectorProps {
  currentSource: NewsSource;
  onSourceChange: (source: NewsSource) => void;
}

const NewsSourceSelector = ({ currentSource, onSourceChange }: NewsSourceSelectorProps) => {
  return (
    <div className="flex items-center">
      <Rss className="h-4 w-4 mr-2 text-blue-600" />
      <Select
        value={currentSource?.feedUrl}
        onValueChange={(value) => {
          const source = NEWS_SOURCES.find(s => s.feedUrl === value);
          if (source) {
            onSourceChange(source);
          }
        }}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select a news source" />
        </SelectTrigger>
        <SelectContent>
          {NEWS_SOURCES.map((source) => (
            <SelectItem key={source.feedUrl} value={source.feedUrl}>
              {source.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default NewsSourceSelector;
