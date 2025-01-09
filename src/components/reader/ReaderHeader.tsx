import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ReaderHeaderProps {
  title: string;
  chapter?: string;
  darkMode?: boolean;
  onBackToLibrary?: () => void;
}

export function ReaderHeader({
  title,
  chapter,
  darkMode = false,
  onBackToLibrary
}: ReaderHeaderProps) {
  return (
    <div className={`fixed top-0 left-0 right-0 h-16 z-50 ${darkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-sm shadow-sm`}>
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center space-x-4 min-w-0">
          <h1 className={`text-xl font-bold truncate ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {title}
          </h1>
          {chapter && (
            <span className={`text-sm hidden sm:inline ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {chapter}
            </span>
          )}
        </div>
        {onBackToLibrary && (
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToLibrary}
              className={`rounded-lg font-medium transition-all px-3 py-1.5 text-sm flex items-center gap-2 ${
                darkMode 
                  ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-800' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Library</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}