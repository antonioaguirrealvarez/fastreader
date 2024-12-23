import React from 'react';
import { Button } from '../ui/Button';

interface ReadingModesProps {
  mode: 'spritz' | 'first-last';
  setMode: (mode: 'spritz' | 'first-last') => void;
}

export function ReadingModes({ mode, setMode }: ReadingModesProps) {
  return (
    <div className="flex items-center gap-4">
      <Button
        variant={mode === 'spritz' ? 'primary' : 'secondary'}
        onClick={() => setMode('spritz')}
      >
        Single-Word
      </Button>
      <Button
        variant={mode === 'first-last' ? 'primary' : 'secondary'}
        onClick={() => setMode('first-last')}
      >
        Full-text
      </Button>
    </div>
  );
} 