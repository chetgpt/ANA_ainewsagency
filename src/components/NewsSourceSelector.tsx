
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
    name: "BBC News",
    url: "https://www.bbc.co.uk/news",
    feedUrl: "https://feeds.bbci.co.uk/news/rss.xml",
  },
  {
    name: "New York Times",
    url: "https://www.nytimes.com",
    feedUrl: "https://www.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  },
  {
    name: "Time",
    url: "https://time.com",
    feedUrl: "https://time.com/feed/",
  },
  {
    name: "Yahoo News",
    url: "https://news.yahoo.com",
    feedUrl: "https://rss.news.yahoo.com/rss/topstories",
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com",
    feedUrl: "https://www.aljazeera.com/Services/Rss/?PostingId=2007731105943979989",
  },
  {
    name: "ABC News",
    url: "https://abcnews.go.com",
    feedUrl: "https://feeds.abcnews.com/abcnews/topstories",
  },
  {
    name: "The Telegraph",
    url: "https://www.telegraph.co.uk",
    feedUrl: "https://www.telegraph.co.uk/rss",
  },
  {
    name: "NBC News",
    url: "https://www.nbcnews.com",
    feedUrl: "https://feeds.nbcnews.com/nbcnews/public/news",
  },
  {
    name: "Financial Times",
    url: "https://www.ft.com",
    feedUrl: "https://www.ft.com/rss/world",
  },
  {
    name: "NPR",
    url: "https://www.npr.org",
    feedUrl: "https://www.npr.org/rss/rss.php?id=1002",
  },
  {
    name: "The Guardian",
    url: "https://www.theguardian.com",
    feedUrl: "https://feeds.guardian.co.uk/theguardian/world/rss",
  },
  {
    name: "The Independent",
    url: "https://www.independent.co.uk",
    feedUrl: "https://www.independent.co.uk/rss",
  },
  {
    name: "Google News - Search",
    url: "https://news.google.com",
    feedUrl: "https://news.google.com/news/rss/search?q=news&hl=en",
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
        value={currentSource.feedUrl}
        onValueChange={(value) => {
          const source = NEWS_SOURCES.find(s => s.feedUrl === value);
          if (source) {
            onSourceChange(source);
          }
        }}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select news source" />
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
