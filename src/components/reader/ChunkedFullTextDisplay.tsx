import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChunkManager } from '../../services/text-chunking/chunkManager';
import { TextChunk } from './TextChunk';
import { fullTextLogger } from '../../services/logging/fullTextLogger';
import { chunkLogger } from '../../services/logging/chunkLogger';
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
    
    chunkLogger.logInitialization({
      totalChunks: manager.getChunkMetrics().totalChunks,
      totalWords: manager.getChunkMetrics().totalWords,
      chunkSize: manager.getChunkMetrics().chunkSize,
      initDuration: performance.now() - startTime
    });
    
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
    chunkLogger.logNavigation({
      action: 'chunk_lifecycle',
      phase,
      timeSinceLastRender: now - lastRenderTime.current,
      timestamp: now,
      details,
      domState: {
        chunks: document.querySelectorAll('.text-chunk').length,
        words: document.querySelectorAll('[data-word-index]').length,
        currentWordElement: document.querySelector(`[data-word-index="${currentWordIndex}"]`) !== null,
        viewport: {
          scrollTop: containerRef.current?.scrollTop ?? 0,
          height: containerRef.current?.clientHeight ?? 0,
          width: containerRef.current?.clientWidth ?? 0
        }
      }
    });
  };

  // Handle word click
  const handleWordClick = useCallback((chunkId: number, wordIndex: number) => {
    const chunk = chunkManager.getChunkById(chunkId);
    if (!chunk) return;

    const globalIndex = chunk.startWord + wordIndex;
    const totalWords = chunkManager.getChunkMetrics().totalWords;
    
    chunkLogger.logNavigation({
      action: 'click',
      fromWord: currentWordIndex,
      toWord: globalIndex,
      fromChunk: chunk.id,
      toChunk: chunk.id,
      isChunkTransition: false
    });

    const progress = Math.round((globalIndex / totalWords) * 100);
    onProgressChange(progress);
  }, [chunkManager, onProgressChange, currentWordIndex]);

  // Add effect to track component lifecycle
  useEffect(() => {
    chunkLogger.logNavigation({
      action: 'component_render',
      renderCount,
      timestamp: Date.now(),
      state: {
        currentWordIndex,
        visibleChunksCount: visibleChunks.length,
        isLoading,
        timeSinceLastScroll: Date.now() - lastScrollAttempt.current
      }
    });
    setRenderCount(prev => prev + 1);
  }, [currentWordIndex, visibleChunks, isLoading]);

  // Enhance position change effect
  useEffect(() => {
    const startTime = Date.now();
    setIsLoading(true);

    chunkLogger.logNavigation({
      action: 'position_change_start',
      timestamp: startTime,
      currentWordIndex,
      previousChunks: visibleChunks.map(c => c.id)
    });

    try {
      const { chunkIndex } = chunkManager.getChunkForPosition(currentWordIndex);
      const newChunks = chunkManager.getVisibleChunks(chunkIndex);

      chunkLogger.logNavigation({
        action: 'chunks_calculated',
        duration: Date.now() - startTime,
        oldChunks: visibleChunks.map(c => c.id),
        newChunks: newChunks.map(c => c.id),
        chunkTransition: !visibleChunks.some(c => c.id === chunkIndex)
      });

      setVisibleChunks(newChunks);
    } catch (error) {
      chunkLogger.error(error as Error, { context: 'position_change' });
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

    chunkLogger.logPlayback({
      action: 'start',
      currentWord: currentWordIndex,
      currentChunk: chunkManager.getChunkForPosition(currentWordIndex).chunkIndex,
      speed: wordsPerMinute
    });

    const interval = setInterval(() => {
      onWordChange('next');
    }, (60 * 1000) / wordsPerMinute);

    return () => {
      clearInterval(interval);
      chunkLogger.logPlayback({
        action: 'stop',
        currentWord: currentWordIndex,
        currentChunk: chunkManager.getChunkForPosition(currentWordIndex).chunkIndex
      });
    };
  }, [isPlaying, wordsPerMinute, onWordChange, currentWordIndex, chunkManager]);

  // Add effect to track chunk loading
  useEffect(() => {
    if (visibleChunks.length > 0) {
      // Wait for DOM to catch up
      requestAnimationFrame(() => {
        const actualChunks = document.querySelectorAll('.text-chunk').length;
        
        chunkLogger.logNavigation({
          action: 'chunks_ready_check',
          expected: visibleChunks.length,
          actual: actualChunks,
          allReady: actualChunks === visibleChunks.length
        });

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
      chunkLogger.logNavigation({
        action: 'scroll_attempt',
        phase: 'early_exit',
        details: {
          hasContainer: !!containerRef.current,
          visibleChunksCount: visibleChunks.length,
          timestamp: Date.now()
        }
      });
      return;
    }

    // Find the current chunk
    const currentChunk = visibleChunks.find(chunk => 
      currentWordIndex >= chunk.startWord && currentWordIndex < chunk.endWord
    );

    if (!currentChunk) {
      chunkLogger.logNavigation({
        action: 'scroll_attempt',
        phase: 'chunk_not_found',
        details: {
          currentWordIndex,
          visibleChunkRanges: visibleChunks.map(c => ({
            id: c.id,
            start: c.startWord,
            end: c.endWord
          })),
          timestamp: Date.now()
        }
      });
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

      chunkLogger.logNavigation({
        action: 'scroll_attempt',
        phase: 'element_search',
        details: {
          chunkId: currentChunk.id,
          localWordIndex,
          globalWordIndex: currentWordIndex,
          selector: wordSelector,
          found: !!element,
          searchDuration: endTime - startTime,
          domState: {
            totalChunks: document.querySelectorAll('.text-chunk').length,
            totalWords: document.querySelectorAll('[data-word-index]').length,
            chunkPresent: document.querySelector(`[data-chunk-id="${currentChunk.id}"]`) !== null
          }
        }
      });

      return element;
    };

    const wordElement = findWordElement();
    if (!wordElement) return;

    // Enhanced scroll with animation frame tracking
    const performScroll = () => {
      const scrollStart = performance.now();
      let scrollFrame = 0;

      const trackScroll = () => {
        scrollFrame++;
        const currentPosition = wordElement.getBoundingClientRect();
        const containerPosition = containerRef.current?.getBoundingClientRect();

        chunkLogger.logNavigation({
          action: 'scroll_attempt',
          phase: 'scroll_frame',
          details: {
            frame: scrollFrame,
            elapsed: performance.now() - scrollStart,
            positions: {
              word: {
                top: currentPosition.top,
                bottom: currentPosition.bottom,
                height: currentPosition.height
              },
              container: containerPosition ? {
                top: containerPosition.top,
                height: containerPosition.height,
                scrollTop: containerRef.current?.scrollTop
              } : null
            }
          }
        });

        if (scrollFrame < 10) { // Track up to 10 frames
          requestAnimationFrame(trackScroll);
        }
      };

      requestAnimationFrame(trackScroll);

      wordElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    };

    // Ensure DOM is ready before scrolling
    if (document.readyState === 'complete') {
      performScroll();
    } else {
      window.addEventListener('load', performScroll, { once: true });
    }

  }, [currentWordIndex, visibleChunks]);

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