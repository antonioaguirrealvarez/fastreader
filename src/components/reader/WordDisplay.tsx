import React, { useEffect, useRef } from 'react';
import { loggingCore, LogCategory, LogLevel } from '../../services/logging/core';
import { progressService } from '../../services/progress/progressService';

// Keep performance logging
const PERFORMANCE_LOG_INTERVAL = 60000; // 1 minute

interface WordDisplayProps {
  word: string;
  wordIndex: number;
  totalWords: number;
  userId: string;
  fileId: string;
  wordsPerMinute: number;
  isPlaying: boolean;
  settings: {
    darkMode: boolean;
    displayMode: 'highlight' | 'spritz';
    fontSize: string;
    peripheralMode: boolean;
    pauseOnPunctuation: boolean;
  };
  onWordChange: (direction: 'next' | 'prev') => void;
  onTogglePlay: () => void;
}

export function WordDisplay({ 
  word,
  wordIndex,
  totalWords,
  userId,
  fileId,
  wordsPerMinute,
  isPlaying,
  settings,
  onWordChange,
  onTogglePlay 
}: WordDisplayProps) {
  // Keep session tracking
  const sessionStarted = useRef(false);
  const sessionId = useRef<string>(crypto.randomUUID());
  const lastPerformanceLog = useRef<number>(Date.now());
  const progressionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInPauseState = useRef(false);

  // Add refs for managing pause state
  const lastWordRef = useRef<string>(word);

  // Session logging
  useEffect(() => {
    if (!sessionStarted.current) {
      sessionStarted.current = true;
      loggingCore.log(LogCategory.READING_STATE, 'session_start', {
        userId,
        fileId,
        sessionId: sessionId.current,
        settings
      }, { 
        level: LogLevel.INFO,
        category: LogCategory.READING_STATE
      });

      return () => {
        loggingCore.log(LogCategory.READING_STATE, 'session_end', {
          userId,
          fileId,
          sessionId: sessionId.current,
          finalPosition: wordIndex,
          duration: Date.now() - lastPerformanceLog.current
        }, { 
          level: LogLevel.INFO,
          category: LogCategory.READING_STATE
        });
      };
    }
  }, [userId, fileId]);

  // Handle word progression
  useEffect(() => {
    if (!isPlaying) {
      // Clear any existing intervals/timeouts when paused
      if (progressionIntervalRef.current) {
        clearInterval(progressionIntervalRef.current);
        progressionIntervalRef.current = null;
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      isInPauseState.current = false;
      return;
    }

    const wordInterval = (60 * 1000) / wordsPerMinute;

    const progressWord = () => {
      // Don't progress if we're in a pause state
      if (isInPauseState.current) return;

      // Only log on significant events, not every word
      // if (settings.pauseOnPunctuation && /[.!?;,]$/.test(word)) {
      //   loggingCore.log(LogCategory.READING_STATE, 'word_progression', {
      //     currentWord: word,
      //     hasPunctuation: true,
      //     pauseEnabled: settings.pauseOnPunctuation,
      //     wordInterval,
      //     wordIndex,
      //     isInPauseState: isInPauseState.current
      //   });
      // }

      if (settings.pauseOnPunctuation && /[.!?;,]$/.test(word)) {
        // Clear existing intervals
        if (progressionIntervalRef.current) {
          clearInterval(progressionIntervalRef.current);
          progressionIntervalRef.current = null;
        }

        // Set pause state
        isInPauseState.current = true;

        // Schedule resume
        pauseTimeoutRef.current = setTimeout(() => {
          // Clear pause state
          isInPauseState.current = false;
          
          // Progress to next word
          onWordChange('next');
          
          // Start new progression interval
          startProgression();
        }, wordInterval * 1.5);
      } else {
        onWordChange('next');
      }
    };

    const startProgression = () => {
      // Clear any existing interval
      if (progressionIntervalRef.current) {
        clearInterval(progressionIntervalRef.current);
      }
      progressionIntervalRef.current = setInterval(progressWord, wordInterval);
    };

    // Only start progression if we're not in a pause state
    if (!isInPauseState.current) {
      startProgression();
    }

    // Cleanup
    return () => {
      if (progressionIntervalRef.current) {
        clearInterval(progressionIntervalRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, [isPlaying, word, wordIndex, wordsPerMinute, settings.pauseOnPunctuation]);

  // Keep the performance logging separate
  useEffect(() => {
    if (!isPlaying) return;

    const performanceInterval = setInterval(() => {
      const currentTime = Date.now();
      loggingCore.log(LogCategory.PERFORMANCE, 'reading_metrics', {
        wordsPerMinute,
        timeSinceLastLog: currentTime - lastPerformanceLog.current
      }, { level: LogLevel.DEBUG });
      lastPerformanceLog.current = currentTime;
    }, PERFORMANCE_LOG_INTERVAL);

    return () => clearInterval(performanceInterval);
  }, [isPlaying, wordsPerMinute]);

  // Remove console.log for font size
  const getFontSize = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-2xl sm:text-3xl';
      case 'medium': return 'text-3xl sm:text-4xl';
      case 'large': return 'text-4xl sm:text-6xl';
      case 'extra-large': return 'text-6xl sm:text-8xl';
      default: return 'text-3xl sm:text-4xl';
    }
  };

  // Split long words
  const splitLongWord = (word: string): string[] => {
    const MAX_LENGTH = 20;
    if (word.length <= MAX_LENGTH) return [word];

    // Try to split on hyphens first
    if (word.includes('-')) {
      return word.split('-').map(part => part.trim()).filter(Boolean);
    }

    // Otherwise split into chunks of MAX_LENGTH
    const chunks: string[] = [];
    for (let i = 0; i < word.length; i += MAX_LENGTH) {
      const chunk = word.slice(i, i + MAX_LENGTH);
      chunks.push(i === 0 ? chunk + '-' : '-' + chunk);
    }

    loggingCore.log(LogCategory.PROCESSING, 'word_split', {
      originalWord: word,
      chunks,
      reason: 'Length exceeded 20 characters'
    }, { level: LogLevel.DEBUG });

    return chunks;
  };

  useEffect(() => {
    const groupId = loggingCore.startOperation(LogCategory.DISPLAY, 'word_processing', {
      word,
      settings
    });

    loggingCore.log(LogCategory.DISPLAY, 'word_render', {
      word,
      settings,
      wordIndex,
      renderTime: performance.now()
    }, {
      level: LogLevel.INFO,
      category: LogCategory.DISPLAY
    });

    loggingCore.endOperation(LogCategory.DISPLAY, 'word_processing', groupId, {
      word,
      renderTime: performance.now()
    });
  }, [word]);

  const renderHighlightedWord = (word: string) => {
    const startTime = performance.now();
    
    try {
      if (!word) return '...';

      // Only log processing if enabled in config
      if (loggingCore.shouldLogWordProcessing()) {
        loggingCore.log(LogCategory.DISPLAY, 'word_processing_start', {
          word,
          mode: 'highlight'
        }, { level: LogLevel.ERROR });
      }

      // Remove punctuation when finding first/last letters
      const cleanWord = word.replace(/[.,!?;:()]/g, '').trim();
      
      // Special case for single-letter words
      if (cleanWord.length === 1) {
        // Find the position of the clean letter in the original word
        const letterPosition = word.indexOf(cleanWord);
        return (
          <div className="font-mono">
            {word.slice(0, letterPosition)}
            <span className="font-bold text-blue-600">{cleanWord}</span>
            {word.slice(letterPosition + 1)}
          </div>
        );
      }

      const firstLetter = cleanWord[0];
      const lastLetter = cleanWord[cleanWord.length - 1];
      
      // Find positions in original word
      const firstIndex = word.indexOf(firstLetter);
      const lastIndex = word.lastIndexOf(lastLetter);
      
      const before = word.slice(0, firstIndex);
      const middle = word.slice(firstIndex + 1, lastIndex);
      const after = word.slice(lastIndex + 1);

      // Only log word render (removed undefined:analysis log)
      loggingCore.log(LogCategory.DISPLAY, 'word_render', {
        word,
        settings,
        wordIndex,
        renderTime: performance.now()
      }, { level: LogLevel.INFO });

      return (
        <div className="font-mono">
          {before}
          <span className="font-bold text-blue-600">{firstLetter}</span>
          {middle}
          <span className="font-bold text-blue-600">{lastLetter}</span>
          {after}
        </div>
      );
    } catch (error) {
      loggingCore.log(LogCategory.DISPLAY, 'word_processing_error', {
        word,
        error,
        mode: 'highlight',
        duration: performance.now() - startTime
      }, { level: LogLevel.ERROR });
      return '...';
    } finally {
      // Log end if enabled
      if (loggingCore.shouldLogWordProcessing()) {
        loggingCore.log(LogCategory.DISPLAY, 'word_processing_end', {
          word,
          renderTime: performance.now(),
          duration: performance.now() - startTime
        }, { level: LogLevel.ERROR });
      }
    }
  };

  const renderSpritzWord = (word: string) => {
    const startTime = performance.now();
    
    try {
      if (!word) return '...';

      // Define what we consider "special characters"
      const specialCharPattern = /[^\w\s]/g;

      // First, find the middle letter position in the clean word
      const cleanWord = word.replace(specialCharPattern, '').trim();
      const isEven = cleanWord.length % 2 === 0;
      const middleIndex = Math.floor((cleanWord.length - 1) / 2);

      // Map to position in original word and count special characters
      let originalPosition = 0;
      let cleanPosition = 0;
      let specialCharsBefore = 0;
      let specialCharsAfter = 0;
      let foundMiddle = false;

      // Count special characters and find middle letter position
      for (let i = 0; i < word.length; i++) {
        if (specialCharPattern.test(word[i])) {
          if (!foundMiddle) {
            specialCharsBefore++;
          } else {
            specialCharsAfter++;
          }
        } else {
          if (cleanPosition === middleIndex) {
            originalPosition = i;
            foundMiddle = true;
          }
          cleanPosition++;
        }
      }

      // Create balanced padding with spaces
      const maxSymbols = Math.max(specialCharsBefore, specialCharsAfter);
      const paddingBefore = ' '.repeat(maxSymbols - specialCharsBefore);
      const paddingAfter = ' '.repeat(maxSymbols - specialCharsAfter);

      // Apply padding to create balanced word
      const balancedWord = paddingBefore + word + paddingAfter;

      // Find the new position of the middle letter in the balanced word
      const balancedPosition = originalPosition + paddingBefore.length;

      const before = balancedWord.slice(0, balancedPosition);
      const focus = balancedWord[balancedPosition];
      const after = balancedWord.slice(balancedPosition + 1);

      // Calculate offset for even-length words
      const baseOffset = isEven ? 0.25 : 0;

      // Only log word render (removed undefined:analysis log)
      loggingCore.log(LogCategory.DISPLAY, 'word_render', {
        word,
        settings,
        wordIndex,
        renderTime: performance.now()
      }, { level: LogLevel.INFO });

      return (
        <div className="relative flex items-center justify-center w-full">
          <div className="relative w-full max-w-[600px] px-4 mx-auto flex items-center justify-center">
            <div className="absolute left-1/2 w-[1px] sm:w-[2px] h-full bg-red-500/20 transform -translate-x-1/2" />
            <div className={`font-mono relative ${getFontSize()}`}>
              <div 
                className="relative whitespace-pre flex items-center justify-center" 
                style={{ 
                  transform: `translateX(${baseOffset}em)`
                }}
              >
                <span 
                  className={`transition-colors duration-200 ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  {before}
                </span>
                <span className="relative mx-0.5 font-bold text-blue-600">
                  {focus}
                </span>
                <span 
                  className={`transition-colors duration-200 ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  {after}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      loggingCore.log(LogCategory.DISPLAY, 'word_processing_error', {
        word,
        error,
        mode: 'spritz',
        duration: performance.now() - startTime
      }, { level: LogLevel.ERROR });
      return '...';
    }
  };

  // Add this function to check for punctuation
  const hasPunctuation = (word: string): boolean => {
    return /[.!?;,]$/.test(word);
  };

  return (
    <div 
      className={`p-4 sm:p-8 rounded-lg ${
        settings.darkMode ? 'text-white' : 'text-gray-900'
      }`}
    >
      <div className="flex flex-col items-center space-y-4">
        {settings.peripheralMode && (
          <div className="text-gray-400 text-base sm:text-lg h-8 font-mono">
            {/* Previous word context if needed */}
          </div>
        )}
        
        <div className={`${getFontSize()} min-h-[1.5em] w-full flex items-center justify-center`}>
          {settings.displayMode === 'spritz' 
            ? renderSpritzWord(word)
            : renderHighlightedWord(word)
          }
        </div>

        {settings.peripheralMode && (
          <div className="text-gray-400 text-base sm:text-lg h-8 font-mono">
            {/* Next word context if needed */}
          </div>
        )}
      </div>
    </div>
  );
}