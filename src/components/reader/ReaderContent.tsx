interface ReaderContentProps {
  content: string;
  settings: ReaderSettings;
  onProgressUpdate: (progress: number) => void;
}

export function ReaderContent({ content, settings, onProgressUpdate }: ReaderContentProps) {
  // ... existing code ...

  const handleWordDisplay = useCallback((word: string) => {
    if (settings.pauseOnPunctuation && /[.!?]$/.test(word)) {
      // Add extra pause for punctuation
      return new Promise(resolve => setTimeout(resolve, 500));
    }
    return Promise.resolve();
  }, [settings.pauseOnPunctuation]);

  // ... rest of component ...
} 