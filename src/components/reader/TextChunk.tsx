import React, { memo } from 'react';
import { Chunk } from '../../services/text-chunking/types';

interface TextChunkProps {
  chunk: Chunk;
  currentWordIndex: number;
  isActive: boolean;
  darkMode: boolean;
  fontSize: string;
  boldFirstLetter: boolean;
  onWordClick?: (wordIndex: number) => void;
}

export const TextChunk = memo(function TextChunk({ 
  chunk, 
  currentWordIndex,
  isActive,
  darkMode,
  fontSize,
  boldFirstLetter,
  onWordClick 
}: TextChunkProps) {
  if (!isActive) return null;

  const words = chunk.words;
  const localWordIndex = currentWordIndex - chunk.startWord;

  const renderWord = (word: string, index: number) => {
    const isHighlighted = index === localWordIndex;
    const firstLetter = word.charAt(0);
    const restOfWord = word.slice(1);

    return (
      <span
        key={`${chunk.id}-${index}`}
        data-word-index={index}
        onClick={() => onWordClick?.(index)}
        className={`
          inline-block cursor-pointer
          transition-all duration-200 ease-in-out
          px-1.5 py-0.5 mx-1
          ${isHighlighted 
            ? darkMode 
              ? 'bg-amber-200/20 text-amber-100 rounded transform scale-105'
              : 'bg-amber-200/80 text-amber-900 rounded transform scale-105'
            : 'hover:bg-gray-100/10'
          }
        `}
      >
        {boldFirstLetter ? (
          <>
            <span className="font-bold">{firstLetter}</span>
            {restOfWord}
          </>
        ) : word}
      </span>
    );
  };

  return (
    <div className={`text-chunk leading-relaxed tracking-wide ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
      {chunk.words.map((word, index) => renderWord(word, index))}
    </div>
  );
}); 