import React, { useState, useCallback } from 'react';
import { ChunkManager } from '../services/text-chunking/chunkManager';
import { TextChunk } from '../components/reader/TextChunk';
import { fullTextLogger } from '../services/logging/fullTextLogger';
import { Chunk } from '../services/text-chunking/types';

export function ChunkingTest() {
  const [inputText, setInputText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [chunkManager, setChunkManager] = useState<ChunkManager | null>(null);
  const [visibleChunks, setVisibleChunks] = useState<Chunk[]>([]);
  const [metrics, setMetrics] = useState<{
    totalWords: number;
    totalChunks: number;
    averageWordsPerChunk: number;
  } | null>(null);

  const handleSubmit = useCallback(() => {
    const startTime = performance.now();
    
    try {
      const manager = new ChunkManager(inputText);
      setChunkManager(manager);
      
      const chunkMetrics = manager.getChunkMetrics();
      setMetrics(chunkMetrics);

      const initialChunks = manager.getVisibleChunks(0);
      setVisibleChunks(initialChunks);

      const duration = performance.now() - startTime;
      fullTextLogger.logRender(duration, {
        processedWordsLength: chunkMetrics.totalWords,
        currentPosition: 0,
        isPlaying: false
      });
    } catch (error) {
      fullTextLogger.error(error as Error, { inputLength: inputText.length });
    }
  }, [inputText]);

  const handleWordIndexChange = useCallback((newIndex: number) => {
    if (!chunkManager) return;

    const { chunkIndex } = chunkManager.getChunkForPosition(newIndex);
    const newChunks = chunkManager.getVisibleChunks(chunkIndex);
    
    setCurrentWordIndex(newIndex);
    setVisibleChunks(newChunks);

    fullTextLogger.logProgressUpdate('user', {
      oldPosition: currentWordIndex,
      newPosition: newIndex,
      totalWords: metrics?.totalWords || 0,
      isPlaying: false
    });
  }, [chunkManager, currentWordIndex, metrics?.totalWords]);

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
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Process Text
          </button>
        </div>

        {metrics && (
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-semibold mb-2">Metrics:</h2>
            <ul>
              <li>Total Words: {metrics.totalWords}</li>
              <li>Total Chunks: {metrics.totalChunks}</li>
              <li>Avg Words/Chunk: {metrics.averageWordsPerChunk.toFixed(2)}</li>
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={metrics?.totalWords ?? 0}
            value={currentWordIndex}
            onChange={(e) => handleWordIndexChange(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-600">
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
            darkMode={false}
          />
        ))}
      </div>
    </div>
  );
} 