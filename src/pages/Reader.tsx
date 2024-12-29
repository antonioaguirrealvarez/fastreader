import React, { useState, useEffect, useRef } from 'react';
import { ReaderHeader } from '../components/reader/ReaderHeader';
import { WordDisplay } from '../components/reader/WordDisplay';
import { ReaderControls } from '../components/reader/ReaderControls';
import { LibrarySidebar } from '../components/reader/LibrarySidebar';
import { SettingsPanel } from '../components/reader/SettingsPanel';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../stores/libraryStore';
import { useSettingsStore } from '../stores/settingsStore';
import { logger, LogCategory } from '../utils/logger';
import { progressService } from '../services/database/progress';
import { loggingCore } from '../services/logging/core';
import { LogLevel } from '../services/logging/types';
import { loggingConfig, LoggingMode } from '../services/logging/config';
import { settingsService } from '../services/database/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

// Set logging mode once at the top level
loggingConfig.setMode(
  process.env.NODE_ENV === 'development' 
    ? LoggingMode.VERBOSE 
    : LoggingMode.MINIMAL
);

interface ReaderSettings {
  darkMode: boolean;
  hideHeader: boolean;
  displayMode: 'highlight' | 'spritz';
  fontSize: string;
  recordAnalytics: boolean;
  pauseOnPunctuation: boolean;
}

export function Reader() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { fileId, fileName, content } = location.state || {};
  const updateProgress = useLibraryStore(state => state.updateProgress);
  
  // Settings from store
  const { 
    settings,
    loadSettings,
    updateSettings
  } = useSettingsStore();

  // Load settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      if (!user?.id) return;
      
      try {
        await loadSettings(user.id);
        loggingCore.log(LogCategory.SETTINGS, 'settings_loaded_reader', {
          userId: user.id
        });
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'settings_load_failed_reader', {
          error,
          userId: user.id
        });
      }
    };

    initializeSettings();

    // Cleanup function
    return () => {
      if (user?.id) {
        settingsService.clearCache(user.id);
      }
    };
  }, [user?.id]);

  // Use settings from store with fallback
  const readerSettings = settings || DEFAULT_SETTINGS;

  const [wordsPerMinute, setWordsPerMinute] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const words = content?.split(/\s+/) || [];

  const hasInitialized = useRef(false);

  // Split into two effects - one for progress initialization, one for settings
  useEffect(() => {
    if (hasInitialized.current) return;
    
    const initializeReaderProgress = async () => {
      if (!user?.id || !fileId || !content) return;
      
      try {
        hasInitialized.current = true;

        // First load saved progress
        const savedProgress = await progressService.getProgress(user.id, fileId);
        
        // Set initial word index if we have saved progress
        if (savedProgress) {
          setCurrentWordIndex(savedProgress.current_word);
        }

        // Then initialize progress service
        await progressService.initializeProgress(user.id, fileId, content.length);
      } catch (error) {
        hasInitialized.current = false;
        loggingCore.log(LogCategory.ERROR, 'progress_initialization_failed', {
          error,
          userId: user.id,
          fileId
        }, { level: LogLevel.ERROR });
      }
    };

    initializeReaderProgress();
  }, [user?.id, fileId, content]);

  const handleSpeedChange = (speed: number) => {
    setWordsPerMinute(Math.max(100, Math.min(1000, speed)));
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
    if (!user?.id) return;
    
    updateSettings(newSettings, user.id);
  };

  const handleWordChange = (direction: 'next' | 'prev') => {
    setCurrentWordIndex(current => {
      const newIndex = direction === 'next' 
        ? Math.min(current + 1, content.length - 1)
        : Math.max(current - 1, 0);
      return newIndex;
    });
  };

  const handleProgressChange = (newProgress: number) => {
    const newIndex = Math.floor((newProgress / 100) * words.length);
    setCurrentWordIndex(newIndex);
  };

  const handleBackToLibrary = () => {
    navigate('/library');
  };

  // Add progress tracking
  useEffect(() => {
    if (!user?.id || !fileId || currentWordIndex === 0) {
      return;
    }

    progressService.updateProgress({
      user_id: user.id,
      file_id: fileId,
      current_word: currentWordIndex,
      total_words: words.length
    }).catch(() => {
      // Error already logged in service
    });
  }, [currentWordIndex, user?.id, fileId, words.length]);

  return (
    <div className={`min-h-screen flex flex-col ${readerSettings.darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {!readerSettings.hideHeader && (
        <ReaderHeader 
          title={fileName || 'Unknown Book'}
          chapter={`${currentWordIndex + 1} of ${words.length} words`}
          darkMode={readerSettings.darkMode}
          onBackToLibrary={handleBackToLibrary}
        />
      )}
      
      <div className={`flex flex-1 ${readerSettings.hideHeader ? '' : 'mt-16'} mb-16`}>
        <LibrarySidebar 
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          darkMode={readerSettings.darkMode}
          hideHeader={readerSettings.hideHeader}
        />

        <main className="flex-1 flex items-center justify-center">
          <WordDisplay 
            word={words[currentWordIndex] || ''}
            wordIndex={currentWordIndex}
            totalWords={words.length}
            userId={user?.id || ''}
            fileId={fileId}
            wordsPerMinute={wordsPerMinute}
            isPlaying={isPlaying}
            settings={readerSettings}
            onWordChange={handleWordChange}
          />
        </main>

        <SettingsPanel
          isOpen={isSettingsOpen}
          settings={readerSettings}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={handleUpdateSettings}
          hideHeader={readerSettings.hideHeader}
        />
      </div>

      <ReaderControls
        progress={(currentWordIndex / words.length) * 100}
        wordsPerMinute={wordsPerMinute}
        isPlaying={isPlaying}
        darkMode={readerSettings.darkMode}
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