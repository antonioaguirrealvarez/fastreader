import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';

interface SpeedControlProps {
  wordsPerMinute: number;
  onSpeedChange: (speed: number) => void;
  darkMode: boolean;
}

export function SpeedControl({ wordsPerMinute, onSpeedChange, darkMode }: SpeedControlProps) {
  const darkModeClasses = darkMode ? {
    container: 'bg-gray-800 border-gray-700',
    text: 'text-blue-400',
    subtext: 'text-gray-400',
    button: 'hover:bg-transparent text-blue-400 hover:text-blue-300',
  } : {
    container: 'bg-white border-gray-100',
    text: 'text-blue-600',
    subtext: 'text-gray-500',
    button: 'hover:bg-transparent text-blue-600 hover:text-blue-700',
  };

  const handleSpeedChange = (increment: boolean) => {
    const step = 50;
    const minSpeed = 100;
    const maxSpeed = 1000;
    
    const newSpeed = increment 
      ? Math.min(maxSpeed, wordsPerMinute + step)
      : Math.max(minSpeed, wordsPerMinute - step);
    
    onSpeedChange(newSpeed);
  };

  return (
    <div className={`flex items-center gap-1 rounded-lg px-3 py-1.5 shadow-sm border ${darkModeClasses.container}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleSpeedChange(false)}
        className={`p-1 ${darkModeClasses.button}`}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      <span className={`min-w-[3ch] text-center font-medium text-sm ${darkModeClasses.text}`}>
        {wordsPerMinute}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleSpeedChange(true)}
        className={`p-1 ${darkModeClasses.button}`}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <span className={`text-xs ${darkModeClasses.subtext} ml-1`}>
        WPM
      </span>
    </div>
  );
}