import React, { useState, useEffect, useRef } from 'react';
import { ReaderHeader } from '../components/reader/ReaderHeader';
import { WordDisplay } from '../components/reader/WordDisplay';
import { ReaderControls } from '../components/reader/ReaderControls';
import { LibrarySidebar } from '../components/reader/LibrarySidebar';
import { SettingsPanel } from '../components/reader/SettingsPanel';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../stores/settingsStore';
import { useReaderStore } from '../stores/readerStore';
import { progressService } from '../services/database/progress';
import { loggingCore } from '../services/logging/core';
import { LogLevel } from '../services/logging/types';
import { LogCategory } from '../services/logging/core';
import { loggingConfig, LoggingMode } from '../services/logging/config';
import { settingsService } from '../services/database/settings';

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
  const { fileId: locationFileId, fileName: locationFileName, content: locationContent } = location.state || {};
  
  // Settings from store
  const { 
    settings,
    loadSettings,
    updateSettings
  } = useSettingsStore();

  // Reader store for file info
  const { fileId, fileName, setFileInfo } = useReaderStore();

  // Update file info in store when location state changes
  useEffect(() => {
    if (locationFileId && locationFileName) {
      setFileInfo(locationFileId, locationFileName);
    }
  }, [locationFileId, locationFileName, setFileInfo]);

  // Load settings on mount
  useEffect(() => {
    const loadReaderSettings = async () => {
      if (!user?.id) return;
      
      const operationId = crypto.randomUUID();
      
      try {
        // Initialize settings if needed
        await settingsService.initializeUserSettings(user.id);
        
        // Load settings
        await loadSettings(user.id);
        
        loggingCore.log(LogCategory.SETTINGS, 'reader_settings_loaded', {
          userId: user.id,
          operationId,
          settings
        });
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'reader_settings_load_failed', {
          userId: user.id,
          operationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    loadReaderSettings();
  }, [user?.id, loadSettings]);

  // Initialize progress when file is loaded
  useEffect(() => {
    const initializeReaderProgress = async () => {
      if (!user?.id || !fileId || !locationContent) return;
      
      try {
        await progressService.initializeProgress(user.id, fileId, locationContent.split(/\s+/).length);
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'progress_initialization_failed', {
          userId: user.id,
          fileId,
          error
        });
      }
    };

    initializeReaderProgress();
  }, [user?.id, fileId, locationContent]);

  const [wordsPerMinute, setWordsPerMinute] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const words = locationContent?.split(/\s+/) || [];

  const hasInitialized = useRef(false);

  // Initialize progress and load saved progress
  useEffect(() => {
    if (hasInitialized.current) return;
    
    const initializeReaderProgress = async () => {
      if (!user?.id || !fileId || !locationContent) return;
      
      try {
        hasInitialized.current = true;

        // First load saved progress
        const savedProgress = await progressService.getProgress(user.id, fileId);
        
        // Set initial word index if we have saved progress
        if (savedProgress) {
          setCurrentWordIndex(savedProgress.current_word);
        }

        // Then initialize progress service
        await progressService.initializeProgress(user.id, fileId, locationContent.length);
      } catch (error) {
        hasInitialized.current = false;
        loggingCore.log(LogCategory.ERROR, 'progress_initialization_failed', {
          error,
          userId: user.id,
          fileId
        }, { level: LogLevel.ERROR, category: LogCategory.ERROR });
      }
    };

    initializeReaderProgress();
  }, [user?.id, fileId, locationContent]);

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

  const handleUpdateSettings = (newSettings: Partial<ReaderSettings>) => {
    if (!user?.id) return;
    
    updateSettings(newSettings, user.id);
  };

  const handleWordChange = (direction: 'next' | 'prev') => {
    setCurrentWordIndex(current => {
      const newIndex = direction === 'next' 
        ? Math.min(current + 1, words.length - 1)
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
    <div className={`min-h-screen flex flex-col ${settings?.darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {!settings?.hideHeader && (
        <ReaderHeader 
          title={fileName || 'Unknown Book'}
          chapter={`${currentWordIndex + 1} of ${words.length} words`}
          darkMode={settings?.darkMode}
          onBackToLibrary={handleBackToLibrary}
        />
      )}
      
      <div className={`flex flex-1 ${settings?.hideHeader ? '' : 'mt-16'} mb-16`}>
        <LibrarySidebar 
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          darkMode={settings?.darkMode}
          hideHeader={settings?.hideHeader}
        />

        <main className="flex-1 flex items-center justify-center">
          <WordDisplay 
            word={words[currentWordIndex] || ''}
            wordIndex={currentWordIndex}
            totalWords={words.length}
            userId={user?.id || ''}
            fileId={fileId || ''}
            wordsPerMinute={wordsPerMinute}
            isPlaying={isPlaying}
            settings={settings}
            onWordChange={handleWordChange}
            onTogglePlay={handleTogglePlay}
          />
        </main>

        <SettingsPanel
          isOpen={isSettingsOpen}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={handleUpdateSettings}
          hideHeader={settings?.hideHeader}
        />
      </div>

      <ReaderControls
        progress={(currentWordIndex / words.length) * 100}
        wordsPerMinute={wordsPerMinute}
        isPlaying={isPlaying}
        darkMode={settings?.darkMode}
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