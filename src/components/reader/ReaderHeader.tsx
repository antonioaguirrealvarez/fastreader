import React from 'react';
import { Button } from '../ui/Button';
import { BookOpen } from 'lucide-react';

interface ReaderHeaderProps {
  title: string;
  author: string;
  chapter: string;
  darkMode: boolean;
}

export function ReaderHeader({ title, author, chapter, darkMode }: ReaderHeaderProps) {
  return (
    <header className={`fixed top-0 left-0 right-0 h-16 ${darkMode ? 'bg-gray-800/80' : 'bg-white/80'} backdrop-blur-sm z-50 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="container mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-full">
          <div>
            <h1 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
            <div className="flex items-center gap-2">
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{author}</p>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>•</span>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{chapter}</p>
            </div>
          </div>
          
          <Button 
            variant={darkMode ? "outline" : "primary"}
            onClick={() => window.location.href = '/library'}
            className={`flex items-center gap-2 ${darkMode ? 'text-white border-white/70 hover:bg-white/10' : ''}`}
          >
            <BookOpen className="h-4 w-4" />
            Go to Library
          </Button>
        </div>
      </div>
    </header>
  );
}