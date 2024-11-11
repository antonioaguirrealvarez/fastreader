import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface CloseButtonProps {
  onClick: () => void;
  darkMode?: boolean;
}

export function CloseButton({ onClick, darkMode }: CloseButtonProps) {
  const darkModeClasses = darkMode ? {
    button: 'hover:bg-gray-800 text-gray-400 hover:text-gray-300',
  } : {
    button: 'hover:bg-gray-100 text-gray-500 hover:text-gray-700',
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`rounded-full p-1 ${darkModeClasses.button}`}
    >
      <X className="h-5 w-5" />
    </Button>
  );
}