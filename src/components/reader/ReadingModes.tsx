import React from 'react';
import { Button } from '../ui/Button';
import { loggingCore } from '../../services/logging/core';
import { LogCategory } from '../../services/logging/types';

interface ReadingModesProps {
  mode: 'spritz' | 'first-last';
  onModeChange: (mode: 'spritz' | 'first-last') => void;
}

export function ReadingModes({ mode, onModeChange }: ReadingModesProps) {
  const handleModeChange = (newMode: string) => {
    loggingCore.log(LogCategory.USER_INTERACTION, 'mode_change', {
      previousMode: mode,
      newMode,
      timestamp: Date.now()
    });
    onModeChange(newMode);
  };

  return (
    <div className="flex items-center gap-4">
      <Button
        variant={mode === 'spritz' ? 'primary' : 'secondary'}
        onClick={() => handleModeChange('spritz')}
      >
        Single-Word
      </Button>
      <Button
        variant={mode === 'first-last' ? 'primary' : 'secondary'}
        onClick={() => handleModeChange('first-last')}
      >
        Full-text
      </Button>
    </div>
  );
} 