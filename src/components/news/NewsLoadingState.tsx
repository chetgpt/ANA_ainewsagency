
import { Loader2 } from "lucide-react";

interface NewsLoadingStateProps {
  message?: string;
}

const NewsLoadingState = ({ message = "Generating news summary..." }: NewsLoadingStateProps) => {
  return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      <span className="ml-2 text-gray-600">{message}</span>
    </div>
  );
};

export default NewsLoadingState;
