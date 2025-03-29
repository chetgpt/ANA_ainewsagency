
import { Loader2 } from "lucide-react";

interface NewsLoadingStateProps {
  message?: string;
}

const NewsLoadingState = ({ message = "Generating news summary..." }: NewsLoadingStateProps) => {
  return (
    <div className="flex flex-col justify-center items-center py-20">
      <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
      <span className="text-gray-600 text-center">{message}</span>
    </div>
  );
};

export default NewsLoadingState;
