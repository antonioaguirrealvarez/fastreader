import React, { useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Play, Pause, SkipBack, SkipForward, Type, Lock, Unlock } from 'lucide-react';
import { SpeedControl } from './SpeedControl';
import { useReaderSettings } from '../../services/reader/readerSettingsService';
import { useTextProcessing } from '../../services/reader/textProcessingService';
import { useAutoScroll } from '../../services/reader/autoScrollService';

interface SimplifiedFullTextReaderProps {
  content: string;
  initialWpm?: number;
  darkMode?: boolean;
}

const PUNCTUATION_MARKS = /[.!?;]$/;

export function SimplifiedFullTextReader({
  content,
  initialWpm = 300,
  darkMode = false,
}: SimplifiedFullTextReaderProps) {
  // Services
  const { settings, updateSettings } = useReaderSettings();
  const textProcessing = useTextProcessing();
  const autoScroll = useAutoScroll();

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lastPunctuationPause = useRef<number>(0);

  // Initialize
  useEffect(() => {
    textProcessing.initialize(content);
    updateSettings({ darkMode });
    textProcessing.setWpm(initialWpm);
  }, [content, darkMode, initialWpm]);

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
        // Set programmatic scroll flag and scroll to top first
        textProcessing.setIsProgrammaticScroll(true);
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }

        const newIndex = textProcessing.navigateChunk('next');
        textProcessing.setCurrentWordIndex(newIndex);

        // Force enable auto-scroll and play after a delay
        setTimeout(() => {
          autoScroll.setEnabled(true);
          textProcessing.setIsPlaying(true);
        }, autoScroll.scrollConfig.scrollBehaviorDelay);

        return;
      }

      textProcessing.setCurrentWordIndex(nextIndex);
    }, delay);

    return () => clearInterval(interval);
  }, [textProcessing.isPlaying, textProcessing.currentChunk, textProcessing.wpm, textProcessing.currentWordIndex, settings.pauseOnPunctuation]);

  // Modified center word effect with smoother scrolling
  useEffect(() => {
    if (!containerRef.current || !autoScroll.isEnabled) return;

    const container = containerRef.current;
    const wordElement = container.querySelector(`[data-word-index="${textProcessing.currentWordIndex}"]`);
    
    if (wordElement) {
      const wordRect = wordElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const idealCenter = containerRect.top + (containerRect.height / 2);
      const currentCenter = wordRect.top + (wordRect.height / 2);
      const offset = currentCenter - idealCenter;
      
      if (Math.abs(offset) > 5) {
        textProcessing.setIsProgrammaticScroll(true);
        const speedMultiplier = autoScroll.getSpeedMultiplier(offset);
        const newScrollTop = container.scrollTop + (offset * speedMultiplier);
        
        container.scrollTo({
          top: newScrollTop,
          behavior: autoScroll.shouldUseSmooth(offset) ? 'smooth' : 'auto'
        });

        // Reset programmatic scroll flag after animation
        const resetTimeout = setTimeout(() => {
          textProcessing.setIsProgrammaticScroll(false);
        }, autoScroll.shouldUseSmooth(offset) ? 500 : 0);

        return () => clearTimeout(resetTimeout);
      }
    }
  }, [textProcessing.currentWordIndex, autoScroll.isEnabled]);

  // Handle auto-scroll toggle
  const handleAutoScrollToggle = useCallback(() => {
    const newAutoScrollState = !autoScroll.isEnabled;
    
    if (newAutoScrollState) {
      // When enabling auto-scroll, set programmatic flag first
      textProcessing.setIsProgrammaticScroll(true);
      
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
      if (textProcessing.isProgrammaticScroll) return;

      // Clear any existing timeout
      clearTimeout(scrollTimeout);

      const currentScrollTop = container.scrollTop;
      if (Math.abs(currentScrollTop - autoScroll.lastScrollTop) > 10) {
        if (autoScroll.isEnabled) {
          autoScroll.setEnabled(false);
        }
      }
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
    textProcessing.setIsProgrammaticScroll(true);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }

    const newIndex = textProcessing.navigateChunk(direction);
    textProcessing.setCurrentWordIndex(newIndex);

    setTimeout(() => {
      autoScroll.setEnabled(true);
      textProcessing.setIsPlaying(true);
    }, autoScroll.scrollConfig.scrollBehaviorDelay);
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
    if (!textProcessing.chunkingService) return;

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
    }, autoScroll.scrollConfig.scrollBehaviorDelay);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-200 dark:bg-gray-700 relative group cursor-pointer">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${textProcessing.progress}%` }}
        />
        <input
          type="range"
          min="0"
          max="100"
          value={textProcessing.progress}
          onChange={(e) => handleProgressClick(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Settings Bar */}
      <div className={`
        px-4 py-2 border-b
        ${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
      `}>
        <div className="flex items-center justify-between space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAutoScrollToggle}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-sm
              ${autoScroll.isEnabled ? 'text-blue-500' : 'text-gray-500'}
            `}
          >
            {autoScroll.isEnabled ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Auto-scroll On</span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span>Auto-scroll Off</span>
              </>
            )}
          </Button>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Type className="h-4 w-4" />
              <select
                value={settings.fontSize}
                onChange={(e) => updateSettings({ 
                  fontSize: e.target.value as typeof settings.fontSize 
                })}
                className={`
                  px-2 py-1 rounded border text-sm
                  ${settings.darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100' 
                    : 'bg-white border-gray-300 text-gray-900'
                  }
                `}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra Large</option>
              </select>
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.pauseOnPunctuation}
                onChange={(e) => updateSettings({
                  pauseOnPunctuation: e.target.checked
                })}
                className="rounded border-gray-300"
              />
              <span className={`text-sm ${settings.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Pause on Punctuation
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Text Display with auto-sizing */}
      <div 
        ref={containerRef}
        className={`
          flex-1 overflow-y-auto p-6 relative
          ${settings.darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}
          ${textProcessing.getLineSpacingClass()}
          scroll-smooth
          select-none
        `}
      >
        <div className={`
          max-w-3xl mx-auto
          ${textProcessing.getWordSpacingClass()}
          ${textProcessing.getFontSizeClass()}
          min-h-full flex flex-col justify-between
        `}>
          {textProcessing.visibleChunks.map((chunk: { id: string; words: string[]; startIndex: number; endIndex: number }) => (
            <div 
              key={chunk.id}
              className="py-4 flex-1 flex flex-col"
            >
              <div className="whitespace-normal text-justify flex-1">
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
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-blue-100 text-blue-900'
                          : ''
                        }
                        transition-colors duration-200
                      `}
                      onClick={() => textProcessing.setCurrentWordIndex(globalIndex)}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className={`
        p-4 border-t ${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        sticky bottom-0 left-0 right-0 z-10
      `}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => handleChunkNavigation('prev')}
              variant="ghost"
              className="w-10 h-10 rounded-full flex items-center justify-center"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => textProcessing.setIsPlaying(!textProcessing.isPlaying)}
              variant="primary"
              className="w-12 h-12 rounded-full flex items-center justify-center"
            >
              {textProcessing.isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            <Button
              onClick={() => handleChunkNavigation('next')}
              variant="ghost"
              className="w-10 h-10 rounded-full flex items-center justify-center"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <SpeedControl
              wordsPerMinute={textProcessing.wpm}
              onSpeedChange={textProcessing.setWpm}
              darkMode={settings.darkMode}
            />
          </div>

          <div className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {textProcessing.currentWordIndex + 1} / {textProcessing.totalWords} ({textProcessing.progress}%)
          </div>
        </div>
      </div>
    </div>
  );
} 