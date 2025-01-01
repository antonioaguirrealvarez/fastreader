import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Play, Pause, SkipBack, SkipForward, Type, Lock, Unlock } from 'lucide-react';
import { ChunkingService } from '../../services/textProcessing/chunkingService';
import { SpeedControl } from './SpeedControl';

interface ReaderSettings {
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  pauseOnPunctuation: boolean;
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  wordSpacing: 'normal' | 'wide' | 'wider';
  autoScroll: boolean;
}

interface SimplifiedFullTextReaderProps {
  content: string;
  initialWpm?: number;
  darkMode?: boolean;
}

const PUNCTUATION_MARKS = /[.!?;]$/;

interface Chunk {
  id: string;
  words: string[];
  startIndex: number;
  endIndex: number;
}

export function SimplifiedFullTextReader({
  content,
  initialWpm = 300,
  darkMode = false,
}: SimplifiedFullTextReaderProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(initialWpm);
  const [progress, setProgress] = useState(0);
  const [settings, setSettings] = useState<ReaderSettings>({
    darkMode,
    fontSize: 'medium',
    pauseOnPunctuation: true,
    lineSpacing: 'relaxed',
    wordSpacing: 'wide',
    autoScroll: true,
  });
  const [visibleChunks, setVisibleChunks] = useState<Chunk[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lastPunctuationPause = useRef<number>(0);
  const userScrolledRef = useRef(false);
  const chunkingServiceRef = useRef<ChunkingService>();
  const totalWordsRef = useRef(0);
  const isProgrammaticScrollRef = useRef(false);

  // Initialize chunking service
  useEffect(() => {
    chunkingServiceRef.current = new ChunkingService(content);
    totalWordsRef.current = chunkingServiceRef.current.getTotalWords();
    const initialChunks = chunkingServiceRef.current.getVisibleChunks(0);
    setVisibleChunks(initialChunks);
  }, [content]);

  // Update visible chunks when word index changes
  useEffect(() => {
    if (!chunkingServiceRef.current) return;

    const isLastWord = chunkingServiceRef.current.isLastWordInChunk(currentWordIndex);
    const isFirstWord = chunkingServiceRef.current.isFirstWordInChunk(currentWordIndex);

    if (isLastWord || isFirstWord) {
      const newChunks = chunkingServiceRef.current.getVisibleChunks(currentWordIndex);
      setVisibleChunks(newChunks);
    }
  }, [currentWordIndex]);

  // Handle scroll snap behavior
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (!settings.autoScroll) return;
      e.preventDefault();

      // Only disable auto-scroll, maintain cursor and play state
      setSettings(prev => ({ ...prev, autoScroll: false }));
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!settings.autoScroll) return;
      e.preventDefault();

      const touchCurrentY = e.touches[0].clientY;
      const deltaY = touchStartY - touchCurrentY;

      if (Math.abs(deltaY) > 50) { // Threshold for swipe
        // Only disable auto-scroll, maintain cursor and play state
        setSettings(prev => ({ ...prev, autoScroll: false }));
        touchStartY = touchCurrentY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [settings.autoScroll]);

  // Handle auto-progression with punctuation pausing
  useEffect(() => {
    if (!isPlaying || !chunkingServiceRef.current) return;

    const currentChunk = visibleChunks[0];
    if (!currentChunk) return;

    const currentWord = currentChunk.words[currentWordIndex - currentChunk.startIndex];
    const hasPunctuation = PUNCTUATION_MARKS.test(currentWord);
    const now = Date.now();
    const timeSinceLastPause = now - lastPunctuationPause.current;
    
    const baseDelay = (60 / wpm) * 1000;
    const delay = hasPunctuation && settings.pauseOnPunctuation ? baseDelay * 2 : baseDelay;

    if (hasPunctuation && settings.pauseOnPunctuation && timeSinceLastPause < baseDelay * 2) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentWordIndex(prev => {
        if (prev >= totalWordsRef.current - 1) {
          setIsPlaying(false);
          return prev;
        }
        
        if (hasPunctuation && settings.pauseOnPunctuation) {
          lastPunctuationPause.current = Date.now();
        }
        
        const nextIndex = prev + 1;
        // Check if we need to load the next chunk
        if (chunkingServiceRef.current?.isLastWordInChunk(nextIndex)) {
          const nextChunkFirstWord = chunkingServiceRef.current.getFirstWordIndexOfNextChunk();
          const newChunks = chunkingServiceRef.current.getVisibleChunks(nextChunkFirstWord);
          
          // Immediate scroll and chunk update
          isProgrammaticScrollRef.current = true;
          if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
          }
          
          setVisibleChunks(newChunks);
          
          // Force enable auto-scroll and play after a delay
          setTimeout(() => {
            setSettings(prev => ({ ...prev, autoScroll: true }));
            setIsPlaying(true);
            
            // Keep settings stable for longer
            setTimeout(() => {
              isProgrammaticScrollRef.current = false;
            }, 5000);
          }, 1000);
          
          return nextChunkFirstWord;
        }
        
        return nextIndex;
      });
    }, delay);

    return () => clearInterval(interval);
  }, [isPlaying, visibleChunks, wpm, currentWordIndex, settings.pauseOnPunctuation]);

  // Update progress
  useEffect(() => {
    if (totalWordsRef.current > 0) {
      const newProgress = Math.round((currentWordIndex / (totalWordsRef.current - 1)) * 100);
      setProgress(newProgress);
    }
  }, [currentWordIndex]);

  // Modified center word effect with smoother scrolling
  useEffect(() => {
    if (!containerRef.current || !settings.autoScroll) return;

    const container = containerRef.current;
    const wordElement = container.querySelector(`[data-word-index="${currentWordIndex}"]`);
    
    if (wordElement) {
      const wordRect = wordElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const idealCenter = containerRect.top + (containerRect.height / 2);
      const currentCenter = wordRect.top + (wordRect.height / 2);
      const offset = currentCenter - idealCenter;
      
      if (Math.abs(offset) > 5) {
        // Dynamic speed based on distance - increased speeds
        const speedMultiplier = Math.abs(offset) > 1000 ? 2.0 : // Extremely far: super fast
                              Math.abs(offset) > 500 ? 1.5 : // Very far: very fast
                              Math.abs(offset) > 300 ? 1.0 : // Far: fast
                              Math.abs(offset) > 100 ? 0.5 : // Medium: moderate
                              0.1; // Close: smooth
        
        const newScrollTop = container.scrollTop + (offset * speedMultiplier);
        
        container.scrollTo({
          top: newScrollTop,
          behavior: Math.abs(offset) > 100 ? 'auto' : 'smooth'
        });
      }
    }
  }, [currentWordIndex, settings.autoScroll]);

  // Modified scroll handler to only affect auto-scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScrollTop = container.scrollTop;
    const handleScroll = () => {
      // Skip if this is a programmatic scroll
      if (isProgrammaticScrollRef.current) {
        return;
      }

      const currentScrollTop = container.scrollTop;
      if (Math.abs(currentScrollTop - lastScrollTop) > 10) {
        // Only disable auto-scroll on manual scroll
        if (settings.autoScroll) {
          setSettings(prev => ({ ...prev, autoScroll: false }));
        }
      }
      lastScrollTop = currentScrollTop;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [settings.autoScroll]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentWordIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentWordIndex(prev => Math.min(totalWordsRef.current - 1, prev + 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [totalWordsRef.current]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Handle chunk navigation with auto-scroll and play state
  const handleChunkNavigation = useCallback((direction: 'next' | 'prev') => {
    if (!chunkingServiceRef.current) return;

    const newIndex = direction === 'next' 
      ? chunkingServiceRef.current.getFirstWordIndexOfNextChunk()
      : chunkingServiceRef.current.getFirstWordIndexOfPreviousChunk();

    const newChunks = chunkingServiceRef.current.getVisibleChunks(newIndex);
    
    // Set programmatic scroll flag and scroll to top first
    isProgrammaticScrollRef.current = true;
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'auto' }); // Instant scroll
    }

    // Immediate chunk update
    setVisibleChunks(newChunks);
    setCurrentWordIndex(newIndex);
    
    // Force enable auto-scroll and play after a delay
    setTimeout(() => {
      setSettings(prev => ({ ...prev, autoScroll: true }));
      setIsPlaying(true);
      
      // Keep settings stable for longer
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 5000);
    }, 1000);
  }, []);

  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-lg';
      case 'medium': return 'text-xl';
      case 'large': return 'text-2xl';
      case 'extra-large': return 'text-3xl';
      default: return 'text-xl';
    }
  };

  const getLineSpacingClass = () => {
    switch (settings.lineSpacing) {
      case 'normal': return 'leading-normal';
      case 'relaxed': return 'leading-relaxed';
      case 'loose': return 'leading-loose';
      default: return 'leading-relaxed';
    }
  };

  const getWordSpacingClass = () => {
    switch (settings.wordSpacing) {
      case 'normal': return 'tracking-normal';
      case 'wide': return 'tracking-wide';
      case 'wider': return 'tracking-wider';
      default: return 'tracking-wide';
    }
  };

  const toggleAutoScroll = useCallback(() => {
    setSettings(prev => {
      const newAutoScroll = !prev.autoScroll;
      if (newAutoScroll) {
        userScrolledRef.current = false;
        // Force scroll to current word when re-enabling
        const currentWordElement = wordRefs.current[currentWordIndex];
        if (currentWordElement && containerRef.current) {
          const container = containerRef.current;
          const wordTop = currentWordElement.offsetTop;
          const containerHeight = container.clientHeight;
          container.scrollTo({
            top: wordTop - containerHeight / 2,
            behavior: 'smooth'
          });
        }
      }
      return { ...prev, autoScroll: newAutoScroll };
    });
  }, [currentWordIndex]);

  // Add manual scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScrollTop = container.scrollTop;
    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      if (Math.abs(currentScrollTop - lastScrollTop) > 10) { // 10px threshold
        // User is manually scrolling
        if (settings.autoScroll) {
          setSettings(prev => ({ ...prev, autoScroll: false }));
        }
        if (isPlaying) {
          setIsPlaying(false);
        }
      }
      lastScrollTop = currentScrollTop;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [settings.autoScroll, isPlaying]);

  // Update the wheel handler to handle scrolling properly
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (!settings.autoScroll) return; // Allow normal scroll when auto-scroll is off
      e.preventDefault();

      // Disable auto-scroll on manual scroll
      setSettings(prev => ({ ...prev, autoScroll: false }));
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!settings.autoScroll) return;
      e.preventDefault();

      const touchCurrentY = e.touches[0].clientY;
      const deltaY = touchStartY - touchCurrentY;

      if (Math.abs(deltaY) > 50) { // Threshold for swipe
        // Disable auto-scroll on manual scroll
        setSettings(prev => ({ ...prev, autoScroll: false }));
        touchStartY = touchCurrentY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [settings.autoScroll]);

  return (
    <div className="flex flex-col h-screen">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-200 dark:bg-gray-700">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
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
            onClick={toggleAutoScroll}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-sm
              ${settings.autoScroll ? 'text-blue-500' : 'text-gray-500'}
            `}
          >
            {settings.autoScroll ? (
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
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  fontSize: e.target.value as ReaderSettings['fontSize']
                }))}
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
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  pauseOnPunctuation: e.target.checked
                }))}
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
          ${getLineSpacingClass()}
          scroll-smooth
          select-none
        `}
      >
        <div className={`
          max-w-3xl mx-auto
          ${getWordSpacingClass()}
          ${getFontSizeClass()}
          min-h-full flex flex-col justify-between
        `}>
          {visibleChunks.map((chunk) => (
            <div 
              key={chunk.id}
              className="py-4 flex-1 flex flex-col"
            >
              <div className="whitespace-normal text-justify flex-1">
                {chunk.words.map((word, index) => {
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
                        ${globalIndex === currentWordIndex 
                          ? settings.darkMode 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-blue-100 text-blue-900'
                          : ''
                        }
                        transition-colors duration-200
                      `}
                      onClick={() => {
                        setCurrentWordIndex(globalIndex);
                      }}
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
              onClick={togglePlayPause}
              variant="primary"
              className="w-12 h-12 rounded-full flex items-center justify-center"
            >
              {isPlaying ? (
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
              wordsPerMinute={wpm}
              onSpeedChange={setWpm}
              darkMode={settings.darkMode}
            />
          </div>

          <div className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {currentWordIndex + 1} / {totalWordsRef.current} ({progress}%)
          </div>
        </div>
      </div>
    </div>
  );
} 