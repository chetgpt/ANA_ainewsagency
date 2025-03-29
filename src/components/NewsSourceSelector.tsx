
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rss } from "lucide-react";

export interface NewsSource {
  name: string;
  url: string;
  feedUrl: string;
}

// Empty news sources array
export const NEWS_SOURCES: NewsSource[] = [];

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
          <SelectValue placeholder="No news sources available" />
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
