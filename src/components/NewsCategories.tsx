
import { Button } from "@/components/ui/button";
import { Briefcase, Film, Globe, Music, Newspaper, Trophy, Star, FileText } from "lucide-react";

export const NEWS_CATEGORIES = [
  { id: "all", name: "All News", icon: Newspaper },
  { id: "world", name: "World", icon: Globe },
  { id: "business", name: "Business", icon: Briefcase },
  { id: "sports", name: "Sports", icon: Trophy },
  { id: "entertainment", name: "Entertainment", icon: Star },
  { id: "music", name: "Music", icon: Music },
  { id: "movies", name: "Movies", icon: Film },
  { id: "summarized", name: "Summarized", icon: FileText }
];

interface NewsCategoriesProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const NewsCategories = ({ selectedCategory, onCategoryChange }: NewsCategoriesProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {NEWS_CATEGORIES.map((category) => {
        const Icon = category.icon;
        return (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-1"
            onClick={() => onCategoryChange(category.id)}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{category.name}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default NewsCategories;
