import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChunkManager } from '../../services/text-chunking/chunkManager';
import { TextChunk } from './TextChunk';
import { loggingCore, LogCategory, LogLevel } from '../../services/logging/core';
import { Chunk } from '../../services/text-chunking/types';

interface ChunkedFullTextDisplayProps {
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
  onWordChange: (direction: 'next' | 'prev') => void;
}

export function ChunkedFullTextDisplay({
  content,
  currentWordIndex,
  settings,
  wordsPerMinute,
  isPlaying,
  onProgressChange,
  onWordChange,
}: ChunkedFullTextDisplayProps) {
  const [chunkManager] = useState(() => {
    const startTime = performance.now();
    const manager = new ChunkManager(content);
    
    return manager;
  });

  const [visibleChunks, setVisibleChunks] = useState<Chunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Add state to track render cycles
  const [renderCount, setRenderCount] = useState(0);
  const lastScrollAttempt = useRef<number>(0);

  // Add chunk loading state
  const [chunksReady, setChunksReady] = useState(false);

  // Add timing references
  const lastRenderTime = useRef<number>(0);

  // Add detailed chunk lifecycle logging
  const logChunkLifecycle = (phase: string, details: any) => {
    const now = Date.now();
  };

  // Handle word click
  const handleWordClick = useCallback((chunkId: number, wordIndex: number) => {
    const chunk = chunkManager.getChunkById(chunkId);
    if (!chunk) return;

    const globalIndex = chunk.startWord + wordIndex;
    const totalWords = chunkManager.getChunkMetrics().totalWords;
    
    const progress = Math.round((globalIndex / totalWords) * 100);
    onProgressChange(progress);
  }, [chunkManager, onProgressChange, currentWordIndex]);

  // Add effect to track component lifecycle
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, [currentWordIndex, visibleChunks, isLoading]);

  // Enhance position change effect
  useEffect(() => {
    setIsLoading(true);

    try {
      const { chunkIndex } = chunkManager.getChunkForPosition(currentWordIndex);
      const newChunks = chunkManager.getVisibleChunks(chunkIndex);
      setVisibleChunks(newChunks);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [currentWordIndex, chunkManager]);

  // Match FullTextDisplay formatting
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-lg sm:text-xl';
      case 'medium': return 'text-xl sm:text-2xl';
      case 'large': return 'text-3xl sm:text-5xl';
      case 'extra-large': return 'text-6xl leading-relaxed tracking-wider space-x-5';
      default: return 'text-xl sm:text-2xl';
    }
  };

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onWordChange('next');
    }, (60 * 1000) / wordsPerMinute);

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, wordsPerMinute, onWordChange, currentWordIndex, chunkManager]);

  // Add effect to track chunk loading
  useEffect(() => {
    if (visibleChunks.length > 0) {
      // Wait for DOM to catch up
      requestAnimationFrame(() => {
        const actualChunks = document.querySelectorAll('.text-chunk').length;
        
        setChunksReady(actualChunks === visibleChunks.length);
      });
    }
  }, [visibleChunks]);

  // Update component lifecycle tracking
  useEffect(() => {
    lastRenderTime.current = Date.now();
    logChunkLifecycle('component_update', {
      trigger: 'word_change',
      currentWordIndex,
      visibleChunks: visibleChunks.map(c => ({
        id: c.id,
        range: [c.startWord, c.endWord]
      }))
    });
  }, [currentWordIndex, visibleChunks]);

  // Add data attribute to words in TextChunk
  const renderWord = (word: string, index: number) => {
    const isHighlighted = index === localWordIndex;
    const firstLetter = word.charAt(0);
    const restOfWord = word.slice(1);

    return (
      <span
        key={`${chunk.id}-${index}`}
        data-word-index={index}
        onClick={() => onWordClick?.(index)}
        className={`...`}
      >
        <span className="font-bold">{firstLetter}</span>
        {restOfWord}
      </span>
    );
  };

  useEffect(() => {
    // Early exit conditions
    if (!containerRef.current || visibleChunks.length === 0) {
      return;
    }

    // Find the current chunk
    const currentChunk = visibleChunks.find(chunk => 
      currentWordIndex >= chunk.startWord && currentWordIndex < chunk.endWord
    );

    if (!currentChunk) {
      return;
    }

    // Calculate local word index within the chunk
    const localWordIndex = currentWordIndex - currentChunk.startWord;

    // Enhanced element finding with timing
    const findWordElement = () => {
      const startTime = performance.now();
      const wordSelector = `.text-chunk[data-chunk-id="${currentChunk.id}"] [data-word-index="${localWordIndex}"]`;
      const element = document.querySelector(wordSelector) as HTMLElement;
      const endTime = performance.now();

      return element;
    };

    const wordElement = findWordElement();
    if (!wordElement) return;

    // Enhanced scroll with animation frame tracking
    const scrollToWord = useCallback((wordElement: HTMLElement) => {
      wordElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, []);

    // Ensure DOM is ready before scrolling
    if (document.readyState === 'complete') {
      scrollToWord(wordElement);
    } else {
      window.addEventListener('load', () => scrollToWord(wordElement), { once: true });
    }

  }, [currentWordIndex, visibleChunks]);

  // Add chunk preloading for smoother transitions
  const preloadAdjacentChunks = useCallback((currentChunkIndex: number) => {
    const adjacentChunks = chunkManager.getAdjacentChunks(currentChunkIndex);
    // Preload logic here
  }, [chunkManager]);

  useEffect(() => {
    const groupId = loggingCore.startOperation(LogCategory.DISPLAY, 'chunk_display', {
      totalChunks: chunkManager.getChunkMetrics().totalChunks,
      visibleRange: visibleChunks.map(c => ({
        id: c.id,
        start: c.startWord,
        end: c.endWord
      }))
    });

    return () => {
      loggingCore.endOperation(LogCategory.DISPLAY, 'chunk_display', groupId, {
        lastPosition: currentWordIndex,
        finalChunks: visibleChunks.length
      });
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`
        w-full max-w-[90%] mx-auto px-6 py-8
        overflow-y-auto
        h-[calc(100vh-8rem)] // Fixed height
        scroll-smooth
        relative
        font-['Georgia'] antialiased
        ${settings.darkMode ? 'text-gray-200' : 'text-gray-800'}
        ${getFontSizeClass()}
      `}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/10 dark:bg-white/10 
          backdrop-blur-sm flex items-center justify-center">
          <div className="animate-pulse text-lg">
            Loading content...
          </div>
        </div>
      )}

      {/* Chunks */}
      <div className="space-y-4">
        {visibleChunks.length === 0 ? (
          <div className="text-center text-gray-500">
            Initializing content...
          </div>
        ) : (
          visibleChunks.map(chunk => (
            <TextChunk
              key={chunk.id}
              chunk={chunk}
              currentWordIndex={currentWordIndex}
              isActive={true}
              darkMode={settings.darkMode}
              fontSize={settings.fontSize}
              boldFirstLetter={settings.boldFirstLetter}
              onWordClick={(wordIndex) => handleWordClick(chunk.id, wordIndex)}
            />
          ))
        )}
      </div>
    </div>
  );
} 