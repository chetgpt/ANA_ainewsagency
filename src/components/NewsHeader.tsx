
import { Newspaper } from "lucide-react";
import { ReactNode } from "react";

interface NewsHeaderProps {
  sourceName: string;
  sourceUrl: string;
  children?: ReactNode;
}

const NewsHeader = ({ sourceName, sourceUrl, children }: NewsHeaderProps) => {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Newspaper className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">NewsHub</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Source: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 font-medium">{sourceName}</a>
          </div>
          {children}
        </div>
      </div>
    </header>
  );
};

export default NewsHeader;
