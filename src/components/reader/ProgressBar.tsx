import { useEffect, useState } from 'react';
import { progressService } from '../../services/progress/progressService';

export function ProgressBar() {
  const [progress, setProgress] = useState<number>(0);
  const [readingSpeed, setReadingSpeed] = useState<number>(0);

  useEffect(() => {
    // Update progress state every 100ms
    const interval = setInterval(() => {
      const currentProgress = progressService.getProgress();
      if (currentProgress) {
        setProgress(currentProgress.completionPercentage);
        setReadingSpeed(currentProgress.readingSpeed);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-sm text-gray-600">
        {Math.round(progress)}% • {Math.round(readingSpeed)} WPM
      </div>
    </div>
  );
}