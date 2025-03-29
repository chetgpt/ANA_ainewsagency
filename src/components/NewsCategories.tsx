import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

// Keep only the summarized category
export const NEWS_CATEGORIES = [
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
