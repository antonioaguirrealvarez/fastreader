import React, { useState, useEffect } from 'react';
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
import { readingProgressService } from '../services/readingProgressService';

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
    localSettings,
    isLoading: isLoadingSettings,
    error: settingsError,
    loadSettings,
    updateLocalSettings
  } = useSettingsStore();

  // Local settings state (synced with store)
  const [settings, setSettings] = useState<ReaderSettings>(localSettings || {
    darkMode: false,
    hideHeader: false,
    displayMode: 'highlight',
    fontSize: 'medium',
    recordAnalytics: true,
    pauseOnPunctuation: false,
  });

  const [wordsPerMinute, setWordsPerMinute] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const words = content?.split(/\s+/) || [];

  // Single effect for initial data loading
  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      if (!user?.id || !fileId || !content) {
        logger.debug(LogCategory.READER, 'Skipping initial load - missing data');
        return;
      }

      try {
        // Load progress
        const savedProgress = await readingProgressService.getProgress(user.id, fileId);
        
        if (!mounted) return;

        if (savedProgress) {
          logger.debug(LogCategory.READER, 'Initial data loaded', {
            currentWord: savedProgress.current_word,
            totalWords: savedProgress.total_words,
            percentage: Math.round((savedProgress.current_word / savedProgress.total_words) * 100)
          });
          setCurrentWordIndex(savedProgress.current_word);
        }

        // Only load settings if not already in store
        if (!localSettings) {
          await loadSettings(user.id);
        }
      } catch (error) {
        if (!mounted) return;
        logger.error(LogCategory.READER, 'Failed to load initial data', error);
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, [user?.id, fileId, content, localSettings, loadSettings]);

  // Update progress saving effect - with debounce
  useEffect(() => {
    if (!user?.id || !fileId || words.length === 0 || currentWordIndex === 0) {
      return;
    }

    const saveProgress = async () => {
      const percentage = Math.round((currentWordIndex / words.length) * 100);
      
      try {
        await readingProgressService.updateProgress({
          user_id: user.id,
          file_id: fileId,
          current_word: currentWordIndex,
          total_words: words.length
        });

        logger.debug(LogCategory.READER, 'Progress saved', { percentage });
      } catch (error) {
        logger.error(LogCategory.READER, 'Failed to save progress', error);
      }
    };

    // Only save every 100 words or on last word
    if (currentWordIndex % 100 === 0 || currentWordIndex === words.length - 1) {
      saveProgress();
    }
  }, [currentWordIndex, user?.id, fileId, words.length]);

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
    
    setSettings(newSettings);
    updateLocalSettings(newSettings, user.id);
  };

  const handleWordChange = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentWordIndex < words.length - 1) {
      const currentWord = words[currentWordIndex];
      
      // Only handle Spritz pausing if enabled
      if (settings.pauseOnPunctuation) {
        const shouldPause = /[.,!?]$/.test(currentWord) || /[()]/.test(currentWord);
        
        // Spritz logging disabled
        // logger.debug(LogCategory.SPRITZ, 'Word change', {
        //   currentWord,
        //   shouldPause,
        //   hasPunctuation: /[.,!?()]/.test(currentWord)
        // });

        if (shouldPause && isPlaying) {
          setIsPlaying(false);
          setTimeout(() => {
            setCurrentWordIndex(prev => prev + 1);
            setIsPlaying(true);
          }, /[.,!?]$/.test(currentWord) ? 400 : 200);
          return;
        }
      }
      
      setCurrentWordIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentWordIndex > 0) {
      setCurrentWordIndex(prev => prev - 1);
    }
  };

  const handleProgressChange = (newProgress: number) => {
    const newIndex = Math.floor((newProgress / 100) * words.length);
    setCurrentWordIndex(newIndex);
  };

  const handleBackToLibrary = () => {
    navigate('/library');
  };

  return (
    <div className={`min-h-screen flex flex-col ${settings.darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {!settings.hideHeader && (
        <ReaderHeader 
          title={fileName || 'Unknown Book'}
          chapter={`${currentWordIndex + 1} of ${words.length} words`}
          darkMode={settings.darkMode}
          onBackToLibrary={handleBackToLibrary}
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