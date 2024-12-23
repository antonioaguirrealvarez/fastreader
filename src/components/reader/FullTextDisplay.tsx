import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useReadingProcessor } from '../../hooks/useReadingProcessor';
import { logger, LogCategory } from '../../utils/logger';

interface FullTextDisplayProps {
  content: string;
  currentWordIndex: number;
  settings: {
    darkMode: boolean;
    fontSize: string;
    boldFirstLetter: boolean;
    highlightProgress: boolean;
  };
  wordsPerMinute: number;
  isPlaying: boolean;
  onProgressChange: (progress: number) => void;
}

export function FullTextDisplay({
  content,
  currentWordIndex,
  settings,
  wordsPerMinute,
  isPlaying: externalIsPlaying,
  onProgressChange,
}: FullTextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentWordRef = useRef<HTMLSpanElement>(null);
  const lastProgressRef = useRef<number>(0);
  const renderCount = useRef(0);

  // Initialize reading processor with all its features
  const {
    isPlaying,
    currentPosition,
    processedWords,
    formatWord,
    togglePlayPause,
    handleWordClick
  } = useReadingProcessor({
    text: content,
    wpm: wordsPerMinute,
    settings: {
      highlightWords: settings.highlightProgress,
      boldFirstLetter: settings.boldFirstLetter,
      colorCapitalized: false,
      darkMode: settings.darkMode,
    },
    externalPosition: currentWordIndex,
    onPositionChange: (position) => {
      const progress = Math.round((position / processedWords.length) * 100);
      if (Math.abs(progress - lastProgressRef.current) >= 1) {
        onProgressChange(progress);
      }
    }
  });

  // Track word changes from any source
  useEffect(() => {
    if (processedWords.length > 0 && currentPosition >= 0) {
      const progress = Math.round((currentPosition / processedWords.length) * 100);
      const progressDiff = Math.abs(progress - lastProgressRef.current);
      
      if (progressDiff >= 1) { // Only log if progress changed by at least 1%
        logger.debug(LogCategory.PROGRESS, 'Full-text position changed', {
          source: isPlaying ? 'auto_play' : 'user_interaction',
          oldProgress: lastProgressRef.current,
          newProgress: progress,
          currentWord: processedWords[currentPosition]?.text,
          wordIndex: currentPosition,
          totalWords: processedWords.length,
          isPlaying,
          timestamp: Date.now()
        });
        
        lastProgressRef.current = progress;
        onProgressChange(progress);
      }
    }
  }, [currentPosition, processedWords, isPlaying, onProgressChange]);

  // Sync external play state with internal state
  useEffect(() => {
    if (externalIsPlaying !== isPlaying) {
      logger.debug(LogCategory.READER, 'Play state changed', {
        from: isPlaying,
        to: externalIsPlaying,
        currentWord: processedWords[currentPosition]?.text,
        progress: Math.round((currentPosition / processedWords.length) * 100)
      });
      togglePlayPause();
    }
  }, [externalIsPlaying, isPlaying, togglePlayPause, processedWords, currentPosition]);

  // Auto-scroll current word into view
  useEffect(() => {
    if (currentWordRef.current && containerRef.current) {
      currentWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentPosition]);

  // Memoize font size classes
  const fontSizeClasses = useMemo(() => {
    const baseClasses = {
      small: 'text-xl leading-loose tracking-normal space-x-2',
      medium: 'text-2xl leading-loose tracking-normal space-x-3',
      large: 'text-4xl leading-relaxed tracking-wide space-x-4',
      'extra-large': 'text-6xl leading-relaxed tracking-wider space-x-5',
    };
    console.log('[FullTextDisplay] Using font size:', settings.fontSize, baseClasses[settings.fontSize as keyof typeof baseClasses]);
    return baseClasses[settings.fontSize as keyof typeof baseClasses] || baseClasses.medium;
  }, [settings.fontSize]);

  // Memoize container classes
  const containerClasses = useMemo(() => `
    w-full max-w-[90%] mx-auto px-6 py-8 overflow-y-auto
    font-['Georgia'] antialiased
    ${settings.darkMode ? 'text-gray-200' : 'text-gray-800'}
    ${fontSizeClasses}
  `, [settings.darkMode, fontSizeClasses]);

  useEffect(() => {
    renderCount.current++;
    const now = performance.now();
    
    logger.debug(LogCategory.PERFORMANCE, 'FullTextDisplay render', {
      renderCount: renderCount.current,
      timestamp: now,
      processedWordsLength: processedWords.length,
      currentPosition,
      isPlaying
    });
    
    return () => {
      logger.debug(LogCategory.PERFORMANCE, 'FullTextDisplay render complete', {
        duration: performance.now() - now
      });
    };
  });

  return (
    <div ref={containerRef} className={containerClasses}>
      {processedWords.map((word, index) => {
        const formattedWord = formatWord(word.text);
        return (
          <span
            key={`${word.text}-${index}`}
            ref={currentPosition === index ? currentWordRef : undefined}
            className={`
              inline-block cursor-pointer transition-colors duration-200
              ${fontSizeClasses.includes('text-4xl') ? 'mx-3' : 'mx-2'}
              ${currentPosition === index 
                ? settings.darkMode 
                  ? 'bg-amber-200/20 text-amber-100 px-2 py-1 rounded' 
                  : 'bg-amber-200/80 text-amber-900 px-2 py-1 rounded'
                : ''
              }
            `}
            onClick={() => {
              handleWordClick(index);
              const progress = Math.round((index / processedWords.length) * 100);
              onProgressChange(progress);
            }}
          >
            {settings.boldFirstLetter && word.text.length > 1 ? (
              <>
                <strong>{word.text[0]}</strong>
                {word.text.slice(1)}
              </>
            ) : formattedWord}
          </span>
        );
      })}
    </div>
  );
} 