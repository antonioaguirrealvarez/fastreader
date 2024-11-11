import React from 'react';
import { Book, ChevronDown, ChevronUp, Play, Pause, SkipBack, SkipForward, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { SpeedControl } from './SpeedControl';
import { ProgressBar } from './ProgressBar';

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
}: ReaderControlsProps) {
  const darkModeClasses = darkMode ? {
    container: 'bg-gray-900/90 border-gray-700',
    text: 'text-gray-100',
    button: 'text-gray-400 hover:text-gray-300',
    iconButton: 'text-blue-400 hover:text-blue-300',
  } : {
    container: 'bg-white/90 border-gray-200',
    text: 'text-gray-900',
    button: 'text-gray-600 hover:text-gray-900',
    iconButton: 'text-blue-600 hover:text-blue-700',
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 ${darkModeClasses.container} border-t shadow-lg backdrop-blur-lg`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <ProgressBar progress={progress} darkMode={darkMode} />

          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={onToggleLibrary}
              className={`flex items-center gap-2 ${darkModeClasses.iconButton}`}
            >
              <Book className="h-5 w-5" />
              Library
            </Button>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full p-2 ${darkModeClasses.iconButton}`}
                onClick={onSkipBackward}
              >
                <SkipBack className="h-6 w-6" />
              </Button>

              <Button
                variant="primary"
                size="lg"
                className="rounded-full w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 transition-colors"
                onClick={onTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6 text-white" />
                ) : (
                  <Play className="h-6 w-6 text-white ml-1" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full p-2 ${darkModeClasses.iconButton}`}
                onClick={onSkipForward}
              >
                <SkipForward className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <SpeedControl 
                wordsPerMinute={wordsPerMinute}
                onSpeedChange={onSpeedChange}
                darkMode={darkMode}
              />

              <Button
                variant="ghost"
                onClick={onToggleSettings}
                className={`rounded-full p-2 ${darkModeClasses.iconButton}`}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}