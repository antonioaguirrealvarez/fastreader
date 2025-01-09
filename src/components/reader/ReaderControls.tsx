import React from 'react';
import { Book, Play, Pause, SkipBack, SkipForward, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { WPMControl } from './WPMControl';

interface ReaderControlsProps {
  progress: number;
  wordsPerMinute: number;
  isPlaying: boolean;
  darkMode: boolean;
  onSpeedChange: (speed: number) => void;
  onTogglePlay: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onToggleLibrary: () => void;
  onToggleSettings: () => void;
  onProgressChange: (progress: number) => void;
  children?: React.ReactNode;
}

export function ReaderControls({
  progress,
  wordsPerMinute,
  isPlaying,
  darkMode,
  onSpeedChange,
  onTogglePlay,
  onSkipForward,
  onSkipBackward,
  onToggleLibrary,
  onToggleSettings,
  onProgressChange,
  children
}: ReaderControlsProps) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800/80' : 'bg-white/80'} backdrop-blur-sm border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="absolute -top-2 left-0 right-0 h-2 group">
        <div className="relative w-full h-full">
          <div className={`absolute inset-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full`} />
          
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />

          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => onProgressChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-100 z-10"
            style={{ WebkitAppearance: 'none', background: 'transparent' }}
          />

          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full shadow-lg transform -translate-x-1/2 pointer-events-none"
            style={{ left: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLibrary}
            className={`text-gray-600 hover:text-gray-900 ${darkMode ? 'text-gray-300 hover:text-white' : ''}`}
          >
            <Book className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkipBackward}
              className={`text-gray-600 hover:text-gray-900 ${darkMode ? 'text-gray-300 hover:text-white' : ''}`}
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              variant="primary"
              onClick={onTogglePlay}
              className="w-12 h-12 rounded-full p-0 flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onSkipForward}
              className={`text-gray-600 hover:text-gray-900 ${darkMode ? 'text-gray-300 hover:text-white' : ''}`}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            <WPMControl
              value={wordsPerMinute}
              onChange={onSpeedChange}
              darkMode={darkMode}
            />
            {children}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSettings}
              className={`text-gray-600 hover:text-gray-900 ${darkMode ? 'text-gray-300 hover:text-white' : ''}`}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}