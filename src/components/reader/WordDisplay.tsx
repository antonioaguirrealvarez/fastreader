import React, { useEffect } from 'react';
import { logger } from '../../utils/logger';
import { loggerService } from '../../services/loggerService';

interface WordDisplayProps {
  word: string;
  wordsPerMinute: number;
  isPlaying: boolean;
  settings: {
    darkMode: boolean;
    displayMode: 'highlight' | 'spritz';
    fontSize: string;
    peripheralMode: boolean;
  };
  onWordChange: (direction: 'next' | 'prev') => void;
}

export function WordDisplay({ 
  word, 
  wordsPerMinute, 
  isPlaying, 
  settings,
  onWordChange 
}: WordDisplayProps) {
  // Remove console.log for font size
  const getFontSize = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-2xl';
      case 'medium': return 'text-4xl';
      case 'large': return 'text-6xl';
      case 'extra-large': return 'text-[180px]';
      default: return 'text-4xl';
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

    loggerService.log('debug', 'Word splitting', {
      originalWord: word,
      chunks,
      reason: 'Length exceeded 20 characters'
    });

    return chunks;
  };

  const processedWords = splitLongWord(word);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onWordChange('next');
    }, (60 * 1000) / wordsPerMinute);

    return () => clearInterval(interval);
  }, [isPlaying, wordsPerMinute, onWordChange]);

  const renderHighlightedWord = (word: string) => {
    if (!word) return '...';
    
    // Remove punctuation when finding first/last letters
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    
    // Special case for single-letter words
    if (cleanWord.length === 1) {
      const firstIndex = word.indexOf(cleanWord);
      return (
        <div className="font-mono">
          {word.slice(0, firstIndex)}
          <span className="font-bold text-blue-600">{cleanWord}</span>
          {word.slice(firstIndex + 1)}
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

    return (
      <div className="font-mono">
        {before}
        <span className="font-bold text-blue-600">{firstLetter}</span>
        {middle}
        <span className="font-bold text-blue-600">{lastLetter}</span>
        {after}
      </div>
    );
  };

  const renderSpritzWord = (word: string) => {
    if (!word) return '...';

    // Clean the word and find the optimal recognition point (ORP)
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
    const isEven = cleanWord.length % 2 === 0;
    const middleIndex = Math.floor((cleanWord.length - 1) / 2);

    // Count symbols before middle letter for offset adjustment
    let symbolsBeforeMiddle = 0;
    let symbolsAfterMiddle = 0;
    let originalPosition = 0;
    let cleanPosition = 0;

    while (cleanPosition < middleIndex && originalPosition < word.length) {
      if (/[.,\/#!$%\^&\*;:{}=\-_`~()\s]/.test(word[originalPosition])) {
        symbolsBeforeMiddle++;
      } else {
        cleanPosition++;
      }
      originalPosition++;
    }

    // Count remaining symbols after middle letter
    for (let i = originalPosition + 1; i < word.length; i++) {
      if (/[.,\/#!$%\^&\*;:{}=\-_`~()\s]/.test(word[i])) {
        symbolsAfterMiddle++;
      }
    }

    const before = word.slice(0, originalPosition);
    const focus = word[originalPosition];
    const after = word.slice(originalPosition + 1);

    // Calculate symbol-adjusted offset
    const symbolOffset = (symbolsBeforeMiddle - symbolsAfterMiddle) * 0.25; // 0.25em per symbol

    return (
      <div className="relative flex items-center justify-center w-full">
        <div className="relative w-[600px] flex items-center justify-center">
          {/* Center line for reference */}
          <div className="absolute left-1/2 w-[2px] h-full bg-red-500/20 transform -translate-x-1/2" />
          
          {/* Text container with monospace font and adjusted positioning */}
          <div className="font-mono relative">
            {/* Add both even-length and symbol-based offsets */}
            <div 
              className="relative" 
              style={{ 
                left: `${isEven ? '0.25em' : '0em'}`,
                marginLeft: `${symbolOffset}em`
              }}
            >
              <span className={`${settings.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {before}
              </span>
              <span className="relative mx-0.5 font-bold text-blue-600">
                {focus}
              </span>
              <span className={`${settings.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {after}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-8 rounded-lg ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex flex-col items-center space-y-4">
        {settings.peripheralMode && (
          <div className="text-gray-400 text-lg h-8 font-mono">
            {/* Previous word context if needed */}
          </div>
        )}
        
        <div className={`${getFontSize()} min-h-[1.5em] flex items-center justify-center`}>
          {settings.displayMode === 'spritz' 
            ? renderSpritzWord(word)
            : renderHighlightedWord(word)
          }
        </div>

        {settings.peripheralMode && (
          <div className="text-gray-400 text-lg h-8 font-mono">
            {/* Next word context if needed */}
          </div>
        )}
      </div>
    </div>
  );
}