
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
  // Empty component as we no longer need to display the source
  return null;
};

export default NewsSourceSelector;
