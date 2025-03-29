
import { Newspaper } from "lucide-react";

interface NewsHeaderProps {
  sourceName: string;
  sourceUrl: string;
}

const NewsHeader = ({ sourceName, sourceUrl }: NewsHeaderProps) => {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Newspaper className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">NewsHub</h1>
        </div>
      </div>
    </header>
  );
};

export default NewsHeader;
