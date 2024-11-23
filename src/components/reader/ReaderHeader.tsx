import React from 'react';
import { Button } from '../ui/Button';
import { BookOpen } from 'lucide-react';

interface ReaderHeaderProps {
  title: string;
  darkMode: boolean;
  hideHeader: boolean;
}

export function ReaderHeader({ title, darkMode, hideHeader }: ReaderHeaderProps) {
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        hideHeader ? '-translate-y-full' : 'translate-y-0'
      } ${
        darkMode 
          ? 'bg-gray-900/90 border-b border-gray-800' 
          : 'bg-white/90 border-b border-gray-100 shadow-sm'
      } backdrop-blur-md`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex-1 min-w-0">
            <h1 
              className={`font-medium truncate max-w-[200px] sm:max-w-[300px] md:max-w-[500px] lg:max-w-full 
                ${darkMode ? 'text-white' : 'text-gray-900'}
                text-lg tracking-tight`}
              title={title}
            >
              {title}
            </h1>
          </div>
          
          <Button 
            variant={darkMode ? "ghost" : "primary"}
            onClick={() => window.location.href = '/library'}
            className={`flex items-center gap-2 transition-all duration-150 ml-4
              ${darkMode 
                ? 'text-gray-300 hover:text-white hover:bg-white/10' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              }`}
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Go to Library</span>
          </Button>
        </div>
      </div>
    </header>
  );
}