import React from 'react';

interface HighlightedWordProps {
  word: string;
  darkMode: boolean;
}

export function HighlightedWord({ word, darkMode }: HighlightedWordProps) {
  if (!word) return null;

  const first = word[0];
  const middle = word.slice(1, -1);
  const last = word[word.length - 1];

  const highlightClass = darkMode ? 'text-blue-400' : 'text-blue-600';

  return (
    <span>
      <span className={highlightClass}>{first}</span>
      {middle}
      <span className={highlightClass}>{last}</span>
    </span>
  );
}