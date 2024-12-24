import { useState, useRef, useEffect, useCallback } from 'react';
import { logger, LogCategory } from '../utils/logger';
import { loggingCore } from '../services/logging/core';

interface ReadingSettings {
  highlightWords: boolean;
  boldFirstLetter: boolean;
  colorCapitalized: boolean;
  darkMode?: boolean;
}

interface ProcessedWord {
  text: string;
  isCapitalized: boolean;
  length: number;
}

interface UseReadingProcessorProps {
  text: string;
  wpm: number;
  settings: ReadingSettings;
  onComplete?: () => void;
  externalPosition?: number;
  onPositionChange?: (position: number) => void;
}

export function useReadingProcessor({
  text,
  wpm,
  settings,
  onComplete,
  externalPosition,
  onPositionChange
}: UseReadingProcessorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [processedWords, setProcessedWords] = useState<ProcessedWord[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  // Process text into words with metadata
  const processText = useCallback((text: string) => {
    loggingCore.log('PROCESSING', 'start_processing', { textLength: text.length });
    try {
      const result = text.split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => ({
          text: word,
          isCapitalized: /^[A-Z]/.test(word),
          length: word.length
        }));
      loggingCore.log('PROCESSING', 'processing_complete', { 
        processedLength: result.length,
        duration: performance.now() - startTime
      });
      return result;
    } catch (error) {
      loggingCore.log('PROCESSING', 'processing_error', { error }, { level: 'error' });
      throw error;
    }
  }, []);

  // Format word with settings
  const formatWord = (word: string) => {
    if (!settings.boldFirstLetter || word.length <= 1) return word;
    return word; // For now, return plain text. The component will handle formatting
  };

  // Handle play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    lastUpdateTimeRef.current = 0;
  };

  // Handle reset
  const resetPosition = () => {
    setCurrentPosition(0);
    setIsPlaying(false);
    setSelectedPosition(null);
    lastUpdateTimeRef.current = 0;
  };

  // Handle word click
  const handleWordClick = (position: number) => {
    setSelectedPosition(position);
    setCurrentPosition(position);
    setIsPlaying(false);
  };

  // Word advancement effect
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = 60000 / wpm; // Convert WPM to milliseconds
    const advanceWord = () => {
      const currentTime = performance.now();
      
      if (!lastUpdateTimeRef.current) {
        lastUpdateTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastUpdateTimeRef.current;

      if (deltaTime >= intervalTime) {
        setCurrentPosition(pos => {
          if (pos >= processedWords.length - 1) {
            setIsPlaying(false);
            onComplete?.();
            return pos;
          }
          return pos + 1;
        });
        lastUpdateTimeRef.current = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(advanceWord);
    };

    animationFrameRef.current = requestAnimationFrame(advanceWord);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, wpm, processedWords.length, onComplete]);

  // Initialize processed words when text changes
  useEffect(() => {
    setProcessedWords(processText(text));
    resetPosition();
  }, [text]);

  // Handle external position updates
  useEffect(() => {
    if (externalPosition !== undefined) {
      logger.debug(LogCategory.PROGRESS, 'External position update received', {
        source: 'hook',
        oldPosition: currentPosition,
        newPosition: externalPosition,
        isPlaying,
        timestamp: Date.now()
      });
      
      setCurrentPosition(externalPosition);
      setIsPlaying(false); // Stop playback when position is externally changed
      lastUpdateTimeRef.current = 0; // Reset timing
    }
  }, [externalPosition]);

  // Notify parent of position changes
  useEffect(() => {
    onPositionChange?.(currentPosition);
  }, [currentPosition, onPositionChange]);

  return {
    isPlaying,
    currentPosition,
    selectedPosition,
    processedWords,
    formatWord,
    togglePlayPause,
    resetPosition,
    handleWordClick,
  };
} 