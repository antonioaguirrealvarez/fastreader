import React from 'react';
import { Slider } from '../ui/Slider';

interface ProgressBarProps {
  progress: number;
  darkMode: boolean;
}

export function ProgressBar({ progress, darkMode }: ProgressBarProps) {
  const darkModeClasses = darkMode ? {
    track: 'bg-gray-700',
    bar: 'bg-blue-600 group-hover:bg-blue-500',
  } : {
    track: 'bg-gray-200',
    bar: 'bg-blue-600 group-hover:bg-blue-700',
  };

  return (
    <Slider 
      value={progress} 
      onChange={(value) => console.log(value)} 
      darkMode={darkMode}
      trackClassName={darkModeClasses.track}
      barClassName={darkModeClasses.bar}
    />
  );
}