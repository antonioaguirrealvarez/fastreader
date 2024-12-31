import React, { useState, useCallback, useEffect } from 'react';
import { ChunkManager } from '../services/text-chunking/chunkManager';
import { TextChunk } from '../components/reader/TextChunk';
import { fullTextLogger } from '../services/logging/fullTextLogger';
import { Chunk } from '../services/text-chunking/types';
import { useReaderSettings } from '../hooks/useReaderSettings';
import { useReaderProgress } from '../hooks/useReaderProgress';
import { useReaderPlayback } from '../hooks/useReaderPlayback';
import { SpeedControl } from '../components/reader/SpeedControl';
import { Button } from '../components/ui/Button';

export function ChunkingTest() {
  const [inputText, setInputText] = useState('');
  const [chunkManager, setChunkManager] = useState<ChunkManager | null>(null);
  const [visibleChunks, setVisibleChunks] = useState<Chunk[]>([]);
  const [metrics, setMetrics] = useState<{
    totalWords: number;
    totalChunks: number;
    averageWordsPerChunk: number;
  } | null>(null);

  // Use centralized settings
  const { settings } = useReaderSettings();
  
  // Use centralized progress management
  const { 
    progress, 
    currentWordIndex, 
    setProgress, 
    setCurrentWordIndex 
  } = useReaderProgress();

  // Use centralized playback control
  const { 
    isPlaying, 
    wordsPerMinute, 
    togglePlayback, 
    setWordsPerMinute,
    handleNext,
    handlePrevious 
  } = useReaderPlayback({
    totalWords: metrics?.totalWords ?? 0,
    currentWordIndex,
    onWordChange: setCurrentWordIndex
  });

  const handleSubmit = useCallback(() => {
    const startTime = performance.now();
    
    try {
      const manager = new ChunkManager(inputText);
      setChunkManager(manager);
      
      const chunkMetrics = manager.getChunkMetrics();
      setMetrics(chunkMetrics);

      const initialChunks = manager.getVisibleChunks(0);
      setVisibleChunks(initialChunks);

      // Reset progress when new text is loaded
      setProgress(0);
      setCurrentWordIndex(0);

      const duration = performance.now() - startTime;
      fullTextLogger.logRender(duration, {
        processedWordsLength: chunkMetrics.totalWords,
        currentPosition: 0,
        isPlaying: false
      });
    } catch (error) {
      fullTextLogger.error(error as Error, { inputLength: inputText.length });
    }
  }, [inputText, setProgress, setCurrentWordIndex]);

  const handleWordIndexChange = useCallback((newIndex: number) => {
    if (!chunkManager) return;

    const { chunkIndex } = chunkManager.getChunkForPosition(newIndex);
    const newChunks = chunkManager.getVisibleChunks(chunkIndex);
    
    setCurrentWordIndex(newIndex);
    setVisibleChunks(newChunks);

    // Update progress based on new word index
    const newProgress = Math.round((newIndex / (metrics?.totalWords || 1)) * 100);
    setProgress(newProgress);

    fullTextLogger.logProgressUpdate('user', {
      oldPosition: currentWordIndex,
      newPosition: newIndex,
      totalWords: metrics?.totalWords || 0,
      isPlaying
    });
  }, [chunkManager, currentWordIndex, metrics?.totalWords, isPlaying, setProgress, setCurrentWordIndex]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayback();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayback, handleNext, handlePrevious]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-8 space-y-4">
        <h1 className="text-2xl font-bold">Chunking System Test</h1>
        
        <div className="space-y-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-32 p-2 border rounded"
            placeholder="Enter text to chunk..."
          />
          <Button onClick={handleSubmit}>
            Process Text
          </Button>
        </div>

        {metrics && (
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
            <h2 className="font-semibold mb-2">Metrics:</h2>
            <ul>
              <li>Total Words: {metrics.totalWords}</li>
              <li>Total Chunks: {metrics.totalChunks}</li>
              <li>Avg Words/Chunk: {metrics.averageWordsPerChunk.toFixed(2)}</li>
            </ul>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <Button onClick={togglePlayback}>
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <SpeedControl
            wordsPerMinute={wordsPerMinute}
            onChange={setWordsPerMinute}
          />
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={metrics?.totalWords ?? 0}
            value={currentWordIndex}
            onChange={(e) => handleWordIndexChange(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Word Position: {currentWordIndex} / {metrics?.totalWords ?? 0}
          </div>
        </div>
      </div>

      <div className="border rounded p-4 space-y-4">
        {visibleChunks.map(chunk => (
          <TextChunk
            key={chunk.id}
            chunk={chunk}
            currentWordIndex={currentWordIndex}
            isActive={true}
            darkMode={settings.darkMode}
            fontSize={settings.fontSize}
            boldFirstLetter={settings.boldFirstLetter}
            onWordClick={(wordIndex) => handleWordIndexChange(chunk.startWord + wordIndex)}
          />
        ))}
      </div>
    </div>
  );
} 