import React, { useState, useCallback, useEffect } from 'react';

interface UseReaderPlaybackProps {
  totalWords: number;
  currentWordIndex: number;
  onWordChange: (index: number) => void;
}

export function useReaderPlayback({
  totalWords,
  currentWordIndex,
  onWordChange
}: UseReaderPlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [wordsPerMinute, setWordsPerMinute] = useState(300);

  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentWordIndex < totalWords - 1) {
      onWordChange(currentWordIndex + 1);
    }
  }, [currentWordIndex, totalWords, onWordChange]);

  const handlePrevious = useCallback(() => {
    if (currentWordIndex > 0) {
      onWordChange(currentWordIndex - 1);
    }
  }, [currentWordIndex, onWordChange]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      handleNext();
    }, (60 * 1000) / wordsPerMinute);

    return () => clearInterval(interval);
  }, [isPlaying, wordsPerMinute, handleNext]);

  return {
    isPlaying,
    wordsPerMinute,
    togglePlayback,
    setWordsPerMinute,
    handleNext,
    handlePrevious
  };
} 