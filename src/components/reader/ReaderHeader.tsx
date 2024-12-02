import React from 'react';
import { Button } from '../ui/Button';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReaderHeaderProps {
  title: string;
  chapter: string;
  darkMode: boolean;
  isSaving?: boolean;
}

export function ReaderHeader({ title, chapter, darkMode, isSaving }: ReaderHeaderProps) {
  const navigate = useNavigate();

  const handleBackToLibrary = () => {
    navigate('/library');
  };

  return (
    <header className={`fixed top-0 left-0 right-0 h-16 ${darkMode ? 'bg-gray-800/95 text-white' : 'bg-white/95 text-gray-800'} shadow-md z-50 backdrop-blur-sm`}>
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center space-x-4 min-w-0">
          <h1 className="text-xl font-bold truncate">{title}</h1>
          <span className="text-sm opacity-75 hidden sm:inline">{chapter}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {isSaving && (
            <span className="text-sm text-gray-500 animate-pulse hidden sm:inline">
              Saving progress...
            </span>
          )}
          
          <Button
            onClick={handleBackToLibrary}
            variant="ghost"
            size="sm"
            className={`flex items-center gap-2 ${
              darkMode 
                ? 'hover:bg-gray-700 text-gray-200' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Library</span>
          </Button>
        </div>
      </div>
    </header>
  );
}