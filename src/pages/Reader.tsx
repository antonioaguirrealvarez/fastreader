import React, { useState } from 'react';
import { ReaderHeader } from '../components/reader/ReaderHeader';
import { WordDisplay } from '../components/reader/WordDisplay';
import { ReaderControls } from '../components/reader/ReaderControls';
import { LibrarySidebar } from '../components/reader/LibrarySidebar';
import { SettingsPanel } from '../components/reader/SettingsPanel';

interface ReaderSettings {
  darkMode: boolean;
  hideHeader: boolean;
  displayMode: 'highlight' | 'spritz';
  wordsPerLine: number;
  numberOfLines: number;
  fontSize: string;
  recordAnalytics: boolean;
  peripheralMode: boolean;
}

export function Reader() {
  const [wordsPerMinute, setWordsPerMinute] = useState(300);
  const [progress, setProgress] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>({
    darkMode: false,
    hideHeader: false,
    displayMode: 'highlight',
    wordsPerLine: 1,
    numberOfLines: 1,
    fontSize: 'large',
    recordAnalytics: true,
    peripheralMode: false,
  });

  const handleSpeedChange = (speed: number) => {
    setWordsPerMinute(Math.max(100, Math.min(1000, speed)));
  };

  const handleSkipForward = () => {
    setProgress(Math.min(100, progress + 5));
  };

  const handleSkipBackward = () => {
    setProgress(Math.max(0, progress - 5));
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleToggleLibrary = () => {
    setIsLibraryOpen(!isLibraryOpen);
    if (isSettingsOpen) setIsSettingsOpen(false);
  };

  const handleToggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
    if (isLibraryOpen) setIsLibraryOpen(false);
  };

  const handleUpdateSettings = (newSettings: ReaderSettings) => {
    setSettings(newSettings);
  };

  return (
    <div className={`min-h-screen flex flex-col ${settings.darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {!settings.hideHeader && (
        <ReaderHeader 
          title="The Great Gatsby"
          author="F. Scott Fitzgerald"
          chapter="Chapter 1"
          darkMode={settings.darkMode}
        />
      )}
      
      <div className={`flex flex-1 ${settings.hideHeader ? '' : 'mt-16'} mb-16`}>
        <LibrarySidebar 
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          darkMode={settings.darkMode}
        />

        <main className="flex-1 flex items-center justify-center">
          <WordDisplay 
            wordsPerMinute={wordsPerMinute}
            isPlaying={isPlaying}
            settings={settings}
          />
        </main>

        <SettingsPanel 
          isOpen={isSettingsOpen}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>

      <ReaderControls
        progress={progress}
        wordsPerMinute={wordsPerMinute}
        isPlaying={isPlaying}
        darkMode={settings.darkMode}
        onSpeedChange={handleSpeedChange}
        onTogglePlay={handleTogglePlay}
        onSkipForward={handleSkipForward}
        onSkipBackward={handleSkipBackward}
        onToggleLibrary={handleToggleLibrary}
        onToggleSettings={handleToggleSettings}
      />
    </div>
  );
}