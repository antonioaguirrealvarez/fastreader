import React, { useState, useEffect } from 'react';
import { ReaderHeader } from '../components/reader/ReaderHeader';
import { WordDisplay } from '../components/reader/WordDisplay';
import { ReaderControls } from '../components/reader/ReaderControls';
import { LibrarySidebar } from '../components/reader/LibrarySidebar';
import { SettingsPanel } from '../components/reader/SettingsPanel';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../stores/libraryStore';
import { logger } from '../utils/logger';

interface ReaderSettings {
  darkMode: boolean;
  hideHeader: boolean;
  displayMode: 'highlight' | 'spritz';
  wordsPerLine: number;
  numberOfLines: number;
  fontSize: string;
  recordAnalytics: boolean;
  peripheralMode: boolean;
  pauseOnPunctuation: boolean;
}

interface LocationState {
  fileId: string;
  fileName: string;
  content: string;
}

export function Reader() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { fileId, fileName, content } = (location.state as LocationState) || {};
  const updateProgress = useLibraryStore(state => state.updateProgress);
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
    pauseOnPunctuation: false,
  });

  // Add state for current word
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const words = content?.split(/\s+/) || [];

  // If no content is provided, redirect to library
  useEffect(() => {
    if (!content) {
      navigate('/library');
    }
  }, [content, navigate]);

  // Update progress when changing words
  useEffect(() => {
    if (fileId && words.length > 0) {
      const progress = Math.round((currentWordIndex / words.length) * 100);
      updateProgress(fileId, progress);
    }
  }, [currentWordIndex, fileId, words.length, updateProgress]);

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

  const handleWordChange = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentWordIndex < words.length - 1) {
      const currentWord = words[currentWordIndex];
      
      // Check for punctuation that needs pauses
      const shouldPause = settings.pauseOnPunctuation && (
        /[.,!?]$/.test(currentWord) ||  // End punctuation
        /[()]/.test(currentWord)     // Parentheses
      );
      
      logger.log('debug', 'Word change', {
        currentWord,
        shouldPause,
        hasPunctuation: /[.,!?()]/.test(currentWord)
      });

      if (shouldPause && isPlaying) {
        // Pause before moving to next word
        setIsPlaying(false);
        setTimeout(() => {
          setCurrentWordIndex(prev => prev + 1);
          setIsPlaying(true);
        }, /[.,!?]$/.test(currentWord) ? 400 : 200); // Longer pause for end punctuation
      } else {
        setCurrentWordIndex(prev => prev + 1);
      }
    } else if (direction === 'prev' && currentWordIndex > 0) {
      setCurrentWordIndex(prev => prev - 1);
    }
  };

  const handleProgressChange = (newProgress: number) => {
    const newIndex = Math.floor((newProgress / 100) * words.length);
    setCurrentWordIndex(newIndex);
  };

  return (
    <div className={`min-h-screen flex flex-col ${settings.darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {!settings.hideHeader && (
        <ReaderHeader 
          title={fileName || 'Unknown Book'}
          author=""
          chapter={`${currentWordIndex + 1} of ${words.length} words`}
          darkMode={settings.darkMode}
        />
      )}
      
      <div className={`flex flex-1 ${settings.hideHeader ? '' : 'mt-16'} mb-16`}>
        <LibrarySidebar 
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          darkMode={settings.darkMode}
          hideHeader={settings.hideHeader}
        />

        <main className="flex-1 flex items-center justify-center">
          <WordDisplay 
            word={words[currentWordIndex] || ''}
            wordsPerMinute={wordsPerMinute}
            isPlaying={isPlaying}
            settings={settings}
            onWordChange={handleWordChange}
          />
        </main>

        <SettingsPanel 
          isOpen={isSettingsOpen}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={handleUpdateSettings}
          hideHeader={settings.hideHeader}
        />
      </div>

      <ReaderControls
        progress={(currentWordIndex / words.length) * 100}
        wordsPerMinute={wordsPerMinute}
        isPlaying={isPlaying}
        darkMode={settings.darkMode}
        onSpeedChange={handleSpeedChange}
        onTogglePlay={handleTogglePlay}
        onSkipForward={() => setCurrentWordIndex(prev => Math.min(prev + 10, words.length - 1))}
        onSkipBackward={() => setCurrentWordIndex(prev => Math.max(prev - 10, 0))}
        onToggleLibrary={handleToggleLibrary}
        onToggleSettings={handleToggleSettings}
        onProgressChange={handleProgressChange}
      />
    </div>
  );
}