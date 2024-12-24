import { useCallback } from 'react';
import { Button } from '../ui/Button';
import { progressService } from '../../services/progress/progressService';

interface ReadingControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSpeedChange: (speed: number) => void;
  currentSpeed: number;
}

export function ReadingControls({
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onSpeedChange,
  currentSpeed
}: ReadingControlsProps) {
  const handleSpeedChange = useCallback((newSpeed: number) => {
    onSpeedChange(newSpeed);
    // Log speed change
    progressService.updateProgress(
      progressService.getProgress()?.currentWord || 0,
      { shouldSync: true }
    );
  }, [onSpeedChange]);

  return (
    <div className="flex items-center gap-4">
      <Button onClick={onPrevious}>
        Previous
      </Button>
      <Button onClick={onPlayPause}>
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      <Button onClick={onNext}>
        Next
      </Button>
      <select 
        value={currentSpeed}
        onChange={(e) => handleSpeedChange(Number(e.target.value))}
        className="ml-4"
      >
        <option value={200}>200 WPM</option>
        <option value={300}>300 WPM</option>
        <option value={400}>400 WPM</option>
      </select>
    </div>
  );
} 