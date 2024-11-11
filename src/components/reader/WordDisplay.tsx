import React, { useEffect, useState } from 'react';
import { HighlightedWord } from './HighlightedWord';
import { SpritzWord } from './SpritzWord';

interface WordDisplayProps {
  wordsPerMinute: number;
  isPlaying: boolean;
  settings: {
    fontSize: string;
    displayMode: 'highlight' | 'spritz';
    darkMode: boolean;
    wordsPerLine: number;
    numberOfLines: number;
    peripheralMode: boolean;
  };
}

const sampleText = `The quick brown fox jumps over the lazy dog. This is a sample text that demonstrates 
the speed reading capability of our application. Users can adjust the reading speed and see words 
displayed one at a time for improved reading efficiency.`.split(/\s+/);

export function WordDisplay({ wordsPerMinute, isPlaying, settings }: WordDisplayProps) {
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [previousWord, setPreviousWord] = useState<string>('');
  const [nextWord, setNextWord] = useState<string>('');

  const fontSizeClasses = {
    small: 'text-3xl',
    medium: 'text-5xl',
    large: 'text-7xl',
    xl: 'text-9xl',
  }[settings.fontSize];

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setWordIndex((prev) => {
          const nextIndex = prev + settings.wordsPerLine;
          return nextIndex >= sampleText.length ? 0 : nextIndex;
        });
      }, (60 / wordsPerMinute) * 1000);

      return () => clearInterval(interval);
    }
  }, [wordsPerMinute, isPlaying, settings.wordsPerLine]);

  useEffect(() => {
    const words: string[] = [];
    for (let line = 0; line < settings.numberOfLines; line++) {
      const lineWords = sampleText.slice(
        wordIndex + (line * settings.wordsPerLine),
        wordIndex + ((line + 1) * settings.wordsPerLine)
      );
      words.push(...lineWords);
    }
    setCurrentWords(words);

    setPreviousWord(wordIndex > 0 ? sampleText[wordIndex - 1] : '');
    setNextWord(wordIndex < sampleText.length - 1 ? sampleText[wordIndex + 1] : '');
  }, [wordIndex, settings.numberOfLines, settings.wordsPerLine]);

  const renderPeripheralWords = (word: string, position: 'left' | 'right') => {
    if (!word) return null;

    return (
      <div 
        className={`absolute top-1/2 -translate-y-1/2 ${
          position === 'left' ? '-translate-x-full' : 'translate-x-0'
        } ${fontSizeClasses} opacity-30 mx-4`}
      >
        {word}
      </div>
    );
  };

  return (
    <div className={`flex-1 flex items-center justify-center ${settings.darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
      <div className="flex flex-col items-center gap-4">
        {Array.from({ length: settings.numberOfLines }).map((_, lineIndex) => (
          <div 
            key={lineIndex} 
            className={`${fontSizeClasses} font-medium tracking-tight relative flex items-center justify-center`}
          >
            {settings.peripheralMode && lineIndex === 0 && (
              <>
                {renderPeripheralWords(previousWord, 'left')}
                {renderPeripheralWords(nextWord, 'right')}
              </>
            )}
            {currentWords
              .slice(lineIndex * settings.wordsPerLine, (lineIndex + 1) * settings.wordsPerLine)
              .map((word, index) => (
                <span key={index} className="mx-1">
                  {settings.displayMode === 'spritz' ? (
                    <SpritzWord
                      word={word}
                      darkMode={settings.darkMode}
                    />
                  ) : (
                    <HighlightedWord
                      word={word}
                      darkMode={settings.darkMode}
                    />
                  )}
                </span>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}