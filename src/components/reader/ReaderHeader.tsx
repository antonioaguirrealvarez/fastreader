import React from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '../ui/Button';

interface ReaderHeaderProps {
  title: string;
  author: string;
  chapter: string;
  darkMode?: boolean;
}

export function ReaderHeader({ title, author, chapter, darkMode }: ReaderHeaderProps) {
  const darkModeClasses = darkMode ? {
    header: 'bg-gray-900/90 border-gray-700',
    title: 'text-gray-100',
    subtitle: 'text-gray-400',
    button: 'text-gray-400 hover:text-gray-300',
    primaryButton: 'bg-blue-600 text-gray-100 hover:bg-blue-700',
  } : {
    header: 'bg-white border-gray-200',
    title: 'text-gray-900',
    subtitle: 'text-gray-500',
    button: 'text-gray-600 hover:text-gray-900',
    primaryButton: 'bg-blue-600 text-white hover:bg-blue-700',
  };

  const handleAddBook = () => {
    window.location.href = '/add-book';
  };

  return (
    <header className={`fixed top-0 left-0 right-0 border-b shadow-sm z-50 backdrop-blur-sm ${darkModeClasses.header}`}>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <div className="flex flex-col">
            <h1 className={`text-lg font-semibold ${darkModeClasses.title}`}>{title}</h1>
            <p className={`text-sm ${darkModeClasses.subtitle}`}>{author} - {chapter}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleAddBook}
            className={`flex items-center gap-2 ${darkModeClasses.button}`}
          >
            <Plus className="h-4 w-4" />
            Add Book
          </Button>
          <button className={`transition ${darkModeClasses.button}`}>Login</button>
          <button className={`px-4 py-2 rounded-lg transition ${darkModeClasses.primaryButton}`}>
            Sign Up
          </button>
        </div>
      </div>
    </header>
  );
}