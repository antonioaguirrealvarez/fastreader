import React from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from './ui/Button';

export function Header() {
  const navigateHome = () => {
    window.location.href = '/';
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={navigateHome}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <BookOpen className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold text-gray-900">SpeedRead Pro</span>
          </button>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/reader'}
              className="px-6"
            >
              Try Reader
            </Button>
            <Button variant="ghost">
              Login
            </Button>
            <Button variant="primary">
              Sign Up Free
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}