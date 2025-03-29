
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
    name: "BBC World",
    url: "https://www.bbc.com/news/world",
    feedUrl: "http://feeds.bbci.co.uk/news/world/rss.xml",
  },
  {
    name: "NPR News",
    url: "https://www.npr.org/sections/news/",
    feedUrl: "https://feeds.npr.org/1001/rss.xml",
  },
  {
    name: "Reuters Top News",
    url: "https://www.reuters.com",
    feedUrl: "http://feeds.reuters.com/reuters/topNews",
  },
  {
    name: "The Guardian",
    url: "https://www.theguardian.com/international",
    feedUrl: "https://www.theguardian.com/world/rss",
  },
  {
    name: "ABC News",
    url: "https://abcnews.go.com",
    feedUrl: "https://abcnews.go.com/abcnews/topstories",
  },
  {
    name: "Washington Post",
    url: "https://www.washingtonpost.com",
    feedUrl: "https://feeds.washingtonpost.com/rss/world",
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com",
    feedUrl: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  {
    name: "New York Times",
    url: "https://www.nytimes.com",
    feedUrl: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  }
];

interface NewsSourceSelectorProps {
  currentSource: NewsSource;
  onSourceChange: (source: NewsSource) => void;
}

const NewsSourceSelector = ({ currentSource, onSourceChange }: NewsSourceSelectorProps) => {
  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg p-2 shadow-sm">
      <Rss className="h-5 w-5 text-blue-600" />
      <Select 
        defaultValue={currentSource.name}
        onValueChange={(value) => {
          const selectedSource = NEWS_SOURCES.find(source => source.name === value);
          if (selectedSource) {
            onSourceChange(selectedSource);
          }
        }}
      >
        <SelectTrigger className="w-[180px] border-none focus:ring-0">
          <SelectValue placeholder="Select source" />
        </SelectTrigger>
        <SelectContent>
          {NEWS_SOURCES.map((source) => (
            <SelectItem key={source.name} value={source.name}>
              {source.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default NewsSourceSelector;
