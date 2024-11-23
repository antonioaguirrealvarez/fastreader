import React, { useEffect } from 'react';
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
      case 'small': return 'text-lg sm:text-xl';
      case 'medium': return 'text-xl sm:text-2xl';
      case 'large': return 'text-3xl sm:text-5xl';
      case 'extra-large': return 'text-5xl sm:text-7xl';
      default: return 'text-xl sm:text-2xl';
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

    // Define what we consider "special characters"
    const specialCharPattern = /[^\w\s]/g;  // Anything that's not a word character or space

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

    // Log analysis to server
    loggerService.log('debug', 'Spritz word analysis', {
      originalWord: word,
      cleanWord,
      specialCharsBefore,
      specialCharsAfter,
      paddingBefore: paddingBefore.length,
      paddingAfter: paddingAfter.length,
      balancedWord,
      originalPosition,
      balancedPosition,
      isEven,
      baseOffset,
      result: {
        before,
        focus,
        after
      }
    });

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