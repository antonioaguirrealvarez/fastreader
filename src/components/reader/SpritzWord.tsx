import React from 'react';

interface SpritzWordProps {
  word: string;
  darkMode: boolean;
}

export function SpritzWord({ word, darkMode }: SpritzWordProps) {
  if (!word) return null;

  const centerIndex = Math.floor(word.length / 2);
  const before = word.slice(0, centerIndex);
  const center = word[centerIndex];
  const after = word.slice(centerIndex + 1);

  // Calculate padding to ensure center letter stays in place
  const maxLength = 20; // Adjust based on your needs
  const leftPadding = Math.max(0, maxLength / 2 - centerIndex);
  const rightPadding = Math.max(0, maxLength / 2 - (word.length - centerIndex - 1));

  return (
    <div className="relative flex items-center justify-center" style={{ minWidth: `${maxLength}ch` }}>
      <div className="absolute left-1/2 -translate-x-1/2 flex">
        <span style={{ width: `${leftPadding}ch` }} />
        <span className="text-right" style={{ width: `${centerIndex}ch` }}>{before}</span>
        <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>{center}</span>
        <span style={{ width: `${word.length - centerIndex - 1}ch` }}>{after}</span>
        <span style={{ width: `${rightPadding}ch` }} />
      </div>
    </div>
  );
}