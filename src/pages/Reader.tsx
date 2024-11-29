import React, { useState, useEffect, useRef } from 'react';
import { ReaderHeader } from '../components/reader/ReaderHeader';
import { WordDisplay } from '../components/reader/WordDisplay';
import { ReaderControls } from '../components/reader/ReaderControls';
import { LibrarySidebar } from '../components/reader/LibrarySidebar';
import { SettingsPanel } from '../components/reader/SettingsPanel';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../stores/libraryStore';
import { logger, LogCategory } from '../utils/logger';
import { readingProgressService } from '../services/readingProgressService';

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
  const { fileId, fileName, content } = location.state || {};
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

  // Update the initial progress loading effect
  useEffect(() => {
    const loadProgress = async () => {
      if (!user?.id || !fileId || !content) {
        logger.debug(LogCategory.READER, 'Skipping progress load', {
          hasUser: !!user?.id,
          hasFileId: !!fileId,
          hasContent: !!content
        });
        return;
      }

      try {
        logger.debug(LogCategory.READER, 'Loading initial progress', {
          fileId,
          userId: user.id
        });

        const savedProgress = await readingProgressService.getProgress(user.id, fileId);
        
        if (savedProgress) {
          logger.debug(LogCategory.READER, 'Loaded saved progress', {
            currentWord: savedProgress.current_word,
            totalWords: savedProgress.total_words,
            percentage: Math.round((savedProgress.current_word / savedProgress.total_words) * 100)
          });
          setCurrentWordIndex(savedProgress.current_word);
        } else {
          logger.debug(LogCategory.READER, 'No saved progress found, starting from beginning');
        }
      } catch (error) {
        logger.error(LogCategory.READER, 'Failed to load progress', error);
        // Continue without progress data
      }
    };

    // Only load progress once at mount
    loadProgress();
  }, [user?.id, fileId, content]);

  // Update the progress saving effect
  useEffect(() => {
    // Skip initial render, unnecessary updates, and Spritz analysis
    if (!user?.id || !fileId || words.length === 0 || currentWordIndex === 0) {
      return;
    }

    // Update every 100 words or on last word
    if (currentWordIndex % 100 === 0 || currentWordIndex === words.length - 1) {
      const percentage = Math.round((currentWordIndex / words.length) * 100);
      
      logger.debug(LogCategory.READER, 'Saving progress', {
        currentWord: currentWordIndex,
        totalWords: words.length,
        percentage
      });

      // Use an IIFE to handle the async operation
      (async () => {
        try {
          await readingProgressService.updateProgress({
            user_id: user.id,
            file_id: fileId,
            current_word: currentWordIndex,
            total_words: words.length
          });
        } catch (error) {
          logger.error(LogCategory.READER, 'Failed to save progress', error);
        }
      })();
    }
  }, [currentWordIndex, user?.id, fileId, words.length]);

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
      
      // Only log Spritz analysis if pauseOnPunctuation is enabled
      if (settings.pauseOnPunctuation) {
        const shouldPause = /[.,!?]$/.test(currentWord) || /[()]/.test(currentWord);
        
        logger.debug(LogCategory.SPRITZ, 'Word change', {
          currentWord,
          shouldPause,
          hasPunctuation: /[.,!?()]/.test(currentWord)
        });

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