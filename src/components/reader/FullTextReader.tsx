import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '../ui/Button';
import { Lock, Unlock } from 'lucide-react';
import { useReaderSettings } from '../../services/reader/readerSettingsService';
import { useTextProcessing } from '../../services/reader/textProcessingService';
import { useAutoScroll } from '../../services/reader/autoScrollService';
import { loggingCore, LogCategory } from '../../services/logging/core';
import { SettingsPanel } from './SettingsPanel';
import { ReaderHeader } from './ReaderHeader';
import { ReaderControls } from './ReaderControls';
import { LibrarySidebar } from './LibrarySidebar';
import { useAuth } from '../../contexts/AuthContext';
import { progressService } from '../../services/database/progress';
import { settingsService } from '../../services/database/settings';

interface FullTextReaderProps {
  content: string;
  initialWpm?: number;
  darkMode?: boolean;
  title?: string;
  onBackToLibrary?: () => void;
  fileId: string;
  initialProgress?: number;
}

const PUNCTUATION_MARKS = /[.!?;]$/;

export function FullTextReader({
  content,
  initialWpm = 300,
  darkMode = false,
  title,
  onBackToLibrary,
  fileId,
  initialProgress = 0,
}: FullTextReaderProps) {
  // Services
  const { settings, updateSettings } = useReaderSettings();
  const textProcessing = useTextProcessing();
  const autoScroll = useAutoScroll();
  const { user } = useAuth();

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lastPunctuationPause = useRef<number>(0);
  const lastAutoScrollTime = useRef<number>(0);
  const progressUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  // State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Combine initialization into a single effect
  useEffect(() => {
    const initializeReader = async () => {
      // Initialize text processing first
      textProcessing.initialize(content);
      
      // Update settings
      updateSettings({ darkMode });
      textProcessing.setWpm(initialWpm);

      // Set initial progress if provided
      if (initialProgress > 0) {
        textProcessing.setCurrentWordIndex(initialProgress);
      }

      // Mark as initialized
      setIsInitialized(true);

      loggingCore.log(LogCategory.READING_STATE, 'reader_initialized', {
        totalWords: textProcessing.totalWords,
        initialProgress,
        fileId
      });
    };

    initializeReader();

    // Cleanup
    return () => {
      setIsInitialized(false);
    };
  }, [content, darkMode, initialWpm, initialProgress, fileId]);

  // Replace the existing progress update effect with this new one
  useEffect(() => {
    if (!isInitialized || !user?.id || !fileId || textProcessing.currentWordIndex === 0) {
      return;
    }

    // Clear any existing timeout
    if (progressUpdateTimeout.current) {
      clearTimeout(progressUpdateTimeout.current);
    }

    // Set a new timeout to update progress
    progressUpdateTimeout.current = setTimeout(() => {
      // Log before sending progress
      loggingCore.log(LogCategory.PROGRESS, 'progress_update_started', {
        currentWord: textProcessing.currentWordIndex,
        totalWords: textProcessing.totalWords,
        progress: Math.round((textProcessing.currentWordIndex / textProcessing.totalWords) * 100)
      });

      progressService.updateProgress({
        user_id: user.id,
        file_id: fileId,
        current_word: textProcessing.currentWordIndex,
        total_words: textProcessing.totalWords
      })
      .then(() => {
        // Log successful progress update
        loggingCore.log(LogCategory.PROGRESS, 'progress_update_completed', {
          userId: user.id,
          fileId,
          currentWord: textProcessing.currentWordIndex,
          totalWords: textProcessing.totalWords,
          progress: Math.round((textProcessing.currentWordIndex / textProcessing.totalWords) * 100)
        });
      })
      .catch((error) => {
        loggingCore.log(LogCategory.ERROR, 'progress_update_failed', {
          error,
          userId: user.id,
          fileId,
          currentWord: textProcessing.currentWordIndex,
          totalWords: textProcessing.totalWords
        });
      });
    }, 1000); // Update every second

    return () => {
      if (progressUpdateTimeout.current) {
        clearTimeout(progressUpdateTimeout.current);
      }
    };
  }, [isInitialized, textProcessing.currentWordIndex, textProcessing.totalWords, user?.id, fileId]);

  // Handle auto-progression with punctuation pausing
  useEffect(() => {
    if (!textProcessing.isPlaying) return;

    const currentWord = textProcessing.currentChunk?.words[
      textProcessing.currentWordIndex - textProcessing.currentChunk.startIndex
    ];
    if (!currentWord) return;

    const hasPunctuation = PUNCTUATION_MARKS.test(currentWord);
    const now = Date.now();
    const timeSinceLastPause = now - lastPunctuationPause.current;
    
    const baseDelay = (60 / textProcessing.wpm) * 1000;
    const delay = hasPunctuation && settings.pauseOnPunctuation ? baseDelay * 2 : baseDelay;

    if (hasPunctuation && settings.pauseOnPunctuation && timeSinceLastPause < baseDelay * 2) {
      return;
    }

    const interval = setInterval(() => {
      const nextIndex = textProcessing.currentWordIndex + 1;
      
      if (nextIndex >= textProcessing.totalWords) {
        textProcessing.setIsPlaying(false);
        return;
      }

      if (hasPunctuation && settings.pauseOnPunctuation) {
        lastPunctuationPause.current = Date.now();
      }

      // Check if we need to load the next chunk
      if (textProcessing.chunkingService?.isLastWordInChunk(nextIndex)) {
        handleChunkNavigation('next');
        return;
      }

      textProcessing.setCurrentWordIndex(nextIndex);
    }, delay);

    return () => clearInterval(interval);
  }, [textProcessing.isPlaying, textProcessing.currentChunk, textProcessing.wpm, textProcessing.currentWordIndex, settings.pauseOnPunctuation]);

  // Modified center word effect with smoother scrolling
  useEffect(() => {
    if (!containerRef.current || !autoScroll.isEnabled || !textProcessing.isPlaying) {
      return;
    }

    const container = containerRef.current;
    const wordElement = container.querySelector(`[data-word-index="${textProcessing.currentWordIndex}"]`);
    
    if (wordElement) {
      // Initial positioning using scrollIntoView
      wordElement.scrollIntoView({
        behavior: 'auto',
        block: 'center'
      });

      // Only set up continuous updates if we're actively playing
      const updateScroll = () => {
        if (!autoScroll.isEnabled || !textProcessing.isPlaying) return;

        const wordRect = wordElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const idealCenter = containerRect.top + (containerRect.height / 2);
        const currentCenter = wordRect.top + (wordRect.height / 2);
        const offset = currentCenter - idealCenter;
        
        // Only adjust and log if we need to make a significant change
        if (Math.abs(offset) > 5) {
          textProcessing.setIsProgrammaticScroll(true);
          const speedMultiplier = autoScroll.getSpeedMultiplier(offset);
          const scrollAdjustment = offset * speedMultiplier;
          const newScrollTop = Math.max(0, container.scrollTop + scrollAdjustment);
          
          lastAutoScrollTime.current = Date.now();
          
          container.scrollTo({
            top: newScrollTop,
            behavior: autoScroll.shouldUseSmooth(offset) ? 'smooth' : 'auto'
          });

          // Only log significant scroll adjustments
          if (Math.abs(scrollAdjustment) > 10) {
            loggingCore.log(LogCategory.DISPLAY, 'auto_scroll_adjust', {
              wordIndex: textProcessing.currentWordIndex,
              scrollAdjustment,
              isSmooth: autoScroll.shouldUseSmooth(offset)
            });
          }
        }
      };

      // Reduce update frequency to 200ms
      const scrollInterval = setInterval(updateScroll, 200);

      return () => {
        if (scrollInterval) {
          clearInterval(scrollInterval);
        }
      };
    }
  }, [textProcessing.currentWordIndex, autoScroll.isEnabled, textProcessing.isPlaying]);

  // Handle auto-scroll toggle
  const handleAutoScrollToggle = useCallback(() => {
    const newAutoScrollState = !autoScroll.isEnabled;
    
    if (newAutoScrollState) {
      // When enabling auto-scroll, set programmatic flag first
      textProcessing.setIsProgrammaticScroll(true);
      lastAutoScrollTime.current = Date.now();
      
      // Enable auto-scroll
      autoScroll.setEnabled(true);
      
      // Force an immediate center on the current word
      if (containerRef.current) {
        const wordElement = containerRef.current.querySelector(
          `[data-word-index="${textProcessing.currentWordIndex}"]`
        ) as HTMLElement;
        
        if (wordElement) {
          wordElement.scrollIntoView({
            behavior: 'auto',
            block: 'center'
          });
        }
      }
      
      // Reset programmatic flag after a delay
      setTimeout(() => {
        textProcessing.setIsProgrammaticScroll(false);
      }, 500);
    } else {
      // When disabling, just turn it off
      autoScroll.setEnabled(false);
    }
  }, [autoScroll.isEnabled, textProcessing.currentWordIndex]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Only process scroll events if auto-scroll is enabled
      if (!autoScroll.isEnabled) return;

      const now = Date.now();
      const timeSinceLastAutoScroll = now - lastAutoScrollTime.current;
      
      // If this scroll event happened very soon after an auto-scroll,
      // it's likely caused by the auto-scroll itself
      if (timeSinceLastAutoScroll < 100) {
        return;
      }

      // If we get here, it's likely a manual scroll
      autoScroll.setEnabled(false);

      // Clear any existing timeout
      clearTimeout(scrollTimeout);

      const currentScrollTop = container.scrollTop;
      autoScroll.setLastScrollTop(currentScrollTop);

      // Set a new timeout
      scrollTimeout = setTimeout(() => {
        textProcessing.setIsProgrammaticScroll(false);
      }, 150);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Handle chunk navigation
  const handleChunkNavigation = useCallback((direction: 'next' | 'prev') => {
    // Set flags first
    textProcessing.setIsProgrammaticScroll(true);
    const wasAutoScrollEnabled = autoScroll.isEnabled;
    autoScroll.setEnabled(false);

    // Scroll to top first
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }

    // Navigate to new chunk
    const newIndex = textProcessing.navigateChunk(direction);
    textProcessing.setCurrentWordIndex(newIndex);

    // Re-enable auto-scroll immediately if it was enabled before
    if (wasAutoScrollEnabled) {
      autoScroll.setEnabled(true);
      textProcessing.setIsPlaying(true);
      textProcessing.setIsProgrammaticScroll(false);
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          textProcessing.setIsPlaying(!textProcessing.isPlaying);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          textProcessing.setCurrentWordIndex(Math.max(0, textProcessing.currentWordIndex - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          textProcessing.setCurrentWordIndex(Math.min(textProcessing.totalWords - 1, textProcessing.currentWordIndex + 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [textProcessing.isPlaying, textProcessing.currentWordIndex, textProcessing.totalWords]);

  // Handle progress bar click
  const handleProgressClick = useCallback((newProgress: number) => {
    if (!textProcessing.chunkingService || !isInitialized) return;

    loggingCore.log(LogCategory.READING_STATE, 'progress_bar_click', {
      newProgress,
      currentProgress: textProcessing.progress,
      isInitialized,
      totalWords: textProcessing.totalWords
    });

    // Calculate the target word index based on progress percentage
    const targetWordIndex = Math.floor((newProgress / 100) * (textProcessing.totalWords - 1));
    
    // Set programmatic scroll flag
    textProcessing.setIsProgrammaticScroll(true);
    
    // Update the word index (this will also update chunks)
    textProcessing.setCurrentWordIndex(targetWordIndex);

    // Scroll to top of container
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }

    // Re-enable auto-scroll and reset programmatic flag after a delay
    setTimeout(() => {
      autoScroll.setEnabled(true);
      textProcessing.setIsProgrammaticScroll(false);
      
      loggingCore.log(LogCategory.READING_STATE, 'progress_bar_click_complete', {
        newProgress,
        targetWordIndex,
        actualWordIndex: textProcessing.currentWordIndex,
        actualProgress: textProcessing.progress
      });
    }, autoScroll.scrollConfig.scrollBehaviorDelay);
  }, [isInitialized]);

  // Handle settings toggle
  const handleToggleSettings = useCallback(() => {
    setIsSettingsOpen(!isSettingsOpen);
  }, [isSettingsOpen]);

  // Load settings on mount
  useEffect(() => {
    const loadReaderSettings = async () => {
      if (!user?.id) return;
      
      const operationId = crypto.randomUUID();
      
      try {
        // Initialize settings if needed
        await settingsService.initializeUserSettings(user.id);
        
        // Load settings from Supabase
        const savedSettings = await settingsService.getSettings(user.id);
        
        if (savedSettings) {
          // Update local settings
          updateSettings({
            darkMode: savedSettings.dark_mode,
            hideHeader: savedSettings.hide_header,
            fontSize: savedSettings.font_size,
            pauseOnPunctuation: savedSettings.pause_on_punctuation
          });

          loggingCore.log(LogCategory.SETTINGS, 'reader_settings_loaded', {
            userId: user.id,
            operationId,
            settings: savedSettings
          });
        }
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'reader_settings_load_failed', {
          userId: user.id,
          operationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    loadReaderSettings();
  }, [user?.id]);

  // Handle settings updates
  const handleSettingsUpdate = useCallback(async (newSettings: Partial<ReaderSettings>) => {
    if (!user?.id) return;

    // Update local state immediately
    updateSettings(newSettings);

    // Convert to snake_case for Supabase
    const dbSettings = {
      user_id: user.id,
      dark_mode: newSettings.darkMode ?? settings.darkMode,
      hide_header: newSettings.hideHeader ?? settings.hideHeader,
      font_size: newSettings.fontSize ?? settings.fontSize,
      pause_on_punctuation: newSettings.pauseOnPunctuation ?? settings.pauseOnPunctuation
    };

    try {
      // Update will be batched by settingsService
      await settingsService.updateSettings(dbSettings);

      loggingCore.log(LogCategory.SETTINGS, 'settings_update_queued', {
        userId: user.id,
        settings: dbSettings
      });
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'settings_update_failed', {
        userId: user.id,
        settings: dbSettings,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [user?.id, settings, updateSettings]);

  // Add horizontal scroll handling
  const handleHorizontalScroll = useCallback((event: WheelEvent) => {
    if (!event.shiftKey || !settings.chunkInPages) return;

    event.preventDefault();
    
    // Determine scroll direction
    if (event.deltaX > 0 || event.deltaY > 0) {
      textProcessing.navigateChunk('next');
    } else if (event.deltaX < 0 || event.deltaY < 0) {
      textProcessing.navigateChunk('prev');
    }
  }, [settings.chunkInPages, textProcessing]);

  // Add touch handling for mobile
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!settings.chunkInPages) return;

    touchEndX.current = event.changedTouches[0].clientX;
    const swipeDistance = touchEndX.current - touchStartX.current;

    // Only trigger if swipe is significant (more than 50px)
    if (Math.abs(swipeDistance) > 50) {
      if (swipeDistance > 0) {
        textProcessing.navigateChunk('prev');
      } else {
        textProcessing.navigateChunk('next');
      }
    }
  }, [settings.chunkInPages, textProcessing]);

  // Add wheel and touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleHorizontalScroll, { passive: false });
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('wheel', handleHorizontalScroll);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleHorizontalScroll, handleTouchStart, handleTouchEnd]);

  return (
    <div className={`flex flex-col flex-1 relative ${settings.darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      {!settings.hideHeader && (
        <ReaderHeader 
          title={title || 'Text Reader'}
          chapter={`${textProcessing.currentWordIndex + 1} of ${textProcessing.totalWords} words`}
          darkMode={settings.darkMode}
          onBackToLibrary={onBackToLibrary}
        />
      )}

      {/* Text Display with auto-sizing */}
      <div 
        ref={containerRef}
        className={`
          flex-1 overflow-y-auto p-4 md:p-6 lg:p-8
          ${settings.darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}
          ${textProcessing.getLineSpacingClass()}
          scroll-smooth
          select-none
          font-['Inter']
          ${settings.chunkInPages ? 'overflow-x-hidden' : 'overflow-x-auto'}
        `}
        style={{ 
          height: '100vh',
          marginTop: settings.hideHeader ? '0' : '4rem',
          marginBottom: '4rem',
          paddingTop: '1rem',
          paddingBottom: '1rem'
        }}
      >
        <div className={`
          w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto
          ${textProcessing.getWordSpacingClass()}
          ${textProcessing.getFontSizeClass()}
          font-['Inter']
        `}>
          {settings.chunkInPages ? (
            // Chunked display (current behavior)
            textProcessing.visibleChunks.map((chunk: { id: string; words: string[]; startIndex: number; endIndex: number }) => (
              <div key={chunk.id} className="py-4">
                <div className="whitespace-normal text-justify">
                  {chunk.words.map((word: string, index: number) => {
                    const globalIndex = chunk.startIndex + index;
                    return (
                      <span
                        key={`${word}-${globalIndex}`}
                        data-word-index={globalIndex}
                        ref={el => wordRefs.current[globalIndex] = el}
                        className={`
                          inline-block cursor-pointer
                          mx-1
                          rounded px-1
                          ${globalIndex === textProcessing.currentWordIndex 
                            ? settings.darkMode 
                              ? 'bg-yellow-500/20 text-yellow-300' 
                              : 'bg-yellow-100 text-yellow-900'
                            : ''
                          }
                          transition-colors duration-200
                        `}
                        onClick={() => textProcessing.setCurrentWordIndex(globalIndex)}
                      >
                        {settings.boldLetters && word.length > 1 ? (
                          <>
                            <span className="font-bold">{word[0]}</span>
                            {word.slice(1, -1)}
                            <span className="font-bold">{word[word.length - 1]}</span>
                          </>
                        ) : word}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            // Full text display without chunks
            <div className="py-4">
              <div className="whitespace-normal text-justify">
                {textProcessing.getAllWords().map((word: string, index: number) => (
                  <span
                    key={`${word}-${index}`}
                    data-word-index={index}
                    ref={el => wordRefs.current[index] = el}
                    className={`
                      inline-block cursor-pointer
                      mx-1
                      rounded px-1
                      ${index === textProcessing.currentWordIndex 
                        ? settings.darkMode 
                          ? 'bg-yellow-500/20 text-yellow-300' 
                          : 'bg-yellow-100 text-yellow-900'
                        : ''
                      }
                      transition-colors duration-200
                    `}
                    onClick={() => textProcessing.setCurrentWordIndex(index)}
                  >
                    {settings.boldLetters && word.length > 1 ? (
                      <>
                        <span className="font-bold">{word[0]}</span>
                        {word.slice(1, -1)}
                        <span className="font-bold">{word[word.length - 1]}</span>
                      </>
                    ) : word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={handleSettingsUpdate}
        hideHeader={settings.hideHeader}
      />

      {/* Library Sidebar */}
      <LibrarySidebar
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        darkMode={settings.darkMode}
        hideHeader={settings.hideHeader}
      />

      {/* Bottom Controls with Progress Bar */}
      <ReaderControls
        progress={textProcessing.progress}
        wordsPerMinute={textProcessing.wpm}
        isPlaying={textProcessing.isPlaying}
        darkMode={settings.darkMode}
        onSpeedChange={textProcessing.setWpm}
        onTogglePlay={() => textProcessing.setIsPlaying(!textProcessing.isPlaying)}
        onSkipForward={() => handleChunkNavigation('next')}
        onSkipBackward={() => handleChunkNavigation('prev')}
        onToggleLibrary={() => setIsLibraryOpen(!isLibraryOpen)}
        onToggleSettings={handleToggleSettings}
        onProgressChange={handleProgressClick}
      >
        {/* Additional Auto-scroll Button */}
        <Button
          onClick={handleAutoScrollToggle}
          variant={autoScroll.isEnabled ? "primary" : "ghost"}
          size="sm"
          className="flex items-center gap-2"
        >
          {autoScroll.isEnabled ? (
            <>
              <Lock className="h-4 w-4" />
              <span>Auto-scroll</span>
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" />
              <span>Auto-scroll</span>
            </>
          )}
        </Button>
      </ReaderControls>
    </div>
  );
} 