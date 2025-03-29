
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
  // Empty component as we no longer need to display the source
  return null;
};

export default NewsSourceSelector;
