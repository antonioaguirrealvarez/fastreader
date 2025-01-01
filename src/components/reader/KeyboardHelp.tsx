import React from 'react';
import { Keyboard } from 'lucide-react';

interface KeyboardHelpProps {
  darkMode?: boolean;
}

export function KeyboardHelp({ darkMode = false }: KeyboardHelpProps) {
  const shortcuts = [
    { key: 'Space', description: 'Play/Pause' },
    { key: '←', description: 'Previous word' },
    { key: '→', description: 'Next word' },
  ];

  return (
    <div className={`
      rounded-lg p-4
      ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}
      shadow-lg border
      ${darkMode ? 'border-gray-700' : 'border-gray-200'}
    `}>
      <div className="flex items-center gap-2 mb-3">
        <Keyboard className="h-5 w-5" />
        <span className="font-medium">Keyboard Shortcuts</span>
      </div>
      <div className="space-y-2">
        {shortcuts.map(({ key, description }) => (
          <div key={key} className="flex items-center gap-3">
            <kbd className={`
              px-2 py-1 text-sm font-semibold rounded
              ${darkMode 
                ? 'bg-gray-700 text-gray-200 border-gray-600' 
                : 'bg-gray-100 text-gray-800 border-gray-300'
              }
              border shadow
            `}>
              {key}
            </kbd>
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 