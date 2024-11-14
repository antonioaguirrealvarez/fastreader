import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';

interface WPMControlProps {
  value: number;
  onChange: (value: number) => void;
  darkMode: boolean;
}

export function WPMControl({ value, onChange, darkMode }: WPMControlProps) {
  const increment = () => {
    onChange(Math.min(1000, value + 20));
  };

  const decrement = () => {
    onChange(Math.max(100, value - 20));
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={decrement}
        className={`p-0.5 hover:bg-transparent ${
          darkMode 
            ? 'text-gray-400 hover:text-gray-200' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-medium ${
          darkMode ? 'text-gray-200' : 'text-gray-900'
        }`}>
          {value}
        </span>
        <span className={`text-xs ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          WPM
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={increment}
        className={`p-0.5 hover:bg-transparent ${
          darkMode 
            ? 'text-gray-400 hover:text-gray-200' 
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
    </div>
  );
} 