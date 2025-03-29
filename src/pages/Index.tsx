
import NewsHeader from "@/components/NewsHeader";
import NewsList from "@/components/NewsList";

const Index = () => {
  // Default RSS feed (CNN Top Stories)
  const defaultFeedUrl = "http://rss.cnn.com/rss/cnn_topstories.rss";
  const sourceName = "CNN Top Stories";
  const sourceUrl = "https://cnn.com";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NewsHeader sourceName={sourceName} sourceUrl={sourceUrl} />
      <main className="container mx-auto px-4 py-4 flex-grow">
        <NewsList feedUrl={defaultFeedUrl} />
      </main>
      <footer className="bg-gray-100 border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} NewsHub - Your RSS News Reader
        </div>
      </footer>
    </div>
  );
};

export default Index;
