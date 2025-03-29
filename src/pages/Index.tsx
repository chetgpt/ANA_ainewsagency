
import { useState } from "react";
import NewsHeader from "@/components/NewsHeader";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-800">NewsHub</h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-4 flex-grow">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">NewsHub App</h2>
          <p className="text-gray-700 mb-4">
            Welcome to NewsHub! This is a simple news app template.
          </p>
          <p className="text-gray-500 text-sm italic">
            The RSS feed selection functionality has been removed as requested.
          </p>
        </div>
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
