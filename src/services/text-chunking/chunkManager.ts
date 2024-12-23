import { Chunk, ChunkMetrics, ChunkPosition } from './types';
import { fullTextLogger } from '../../services/logging/fullTextLogger';

export class ChunkManager {
  private chunks: Chunk[] = [];
  private activeChunkIndices: Set<number> = new Set();
  private readonly CHUNK_SIZE = 1000; // Words per chunk
  private readonly ACTIVE_CHUNKS = 3; // Number of chunks to keep active

  constructor(private text: string) {
    const startTime = performance.now();
    fullTextLogger.logRender(0, {
      message: 'ChunkManager initialization started',
      textLength: text.length,
      timestamp: startTime
    });
    
    this.initializeChunks();
    
    const duration = performance.now() - startTime;
    fullTextLogger.logRender(duration, {
      message: 'ChunkManager initialization completed',
      chunkCount: this.chunks.length,
      totalWords: this.getChunkMetrics().totalWords
    });
  }

  private initializeChunks(): void {
    const startTime = performance.now();
    const words = this.text.split(/\s+/);
    
    fullTextLogger.logRender(0, {
      message: 'Chunk calculation started',
      wordCount: words.length
    });

    const totalChunks = Math.ceil(words.length / this.CHUNK_SIZE);
    const chunks: Chunk[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunkStartTime = performance.now();
      const startWord = i * this.CHUNK_SIZE;
      const endWord = Math.min(startWord + this.CHUNK_SIZE, words.length);
      const chunkWords = words.slice(startWord, endWord);

      chunks.push({
        id: i,
        startWord,
        endWord,
        words: chunkWords,
        content: chunkWords.join(' ')
      });

      fullTextLogger.logRender(performance.now() - chunkStartTime, {
        message: 'Chunk created',
        chunkId: i,
        wordCount: chunkWords.length,
        startWord,
        endWord
      });
    }

    this.chunks = chunks;
    fullTextLogger.logRender(performance.now() - startTime, {
      message: 'All chunks created',
      totalChunks: chunks.length
    });
  }

  getChunkMetrics(): ChunkMetrics {
    const totalWords = this.chunks.reduce((sum, chunk) => sum + chunk.words.length, 0);
    
    return {
      totalChunks: this.chunks.length,
      totalWords,
      chunkSize: this.CHUNK_SIZE,
      averageWordsPerChunk: totalWords / this.chunks.length
    };
  }

  getChunkForPosition(globalWordIndex: number): ChunkPosition {
    const chunkIndex = Math.floor(globalWordIndex / this.CHUNK_SIZE);
    const localWordIndex = globalWordIndex % this.CHUNK_SIZE;

    return {
      chunkIndex,
      wordIndex: localWordIndex,
      globalWordIndex
    };
  }

  getVisibleChunks(currentChunkIndex: number): Chunk[] {
    // Clear previous active chunks
    this.activeChunkIndices.clear();

    // Calculate range of chunks to load
    const start = Math.max(0, currentChunkIndex - 1);
    const end = Math.min(this.chunks.length - 1, currentChunkIndex + 1);

    // Mark chunks as active
    for (let i = start; i <= end; i++) {
      this.activeChunkIndices.add(i);
    }

    // Preload next chunk
    this.preloadChunk(end + 1);
    
    return this.chunks.slice(start, end + 1);
  }

  isChunkActive(chunkIndex: number): boolean {
    return this.activeChunkIndices.has(chunkIndex);
  }

  getChunkById(id: number): Chunk | undefined {
    return this.chunks.find(chunk => chunk.id === id);
  }

  getWordAtPosition(globalWordIndex: number): string | null {
    const { chunkIndex, wordIndex } = this.getChunkForPosition(globalWordIndex);
    const chunk = this.getChunkById(chunkIndex);
    
    if (!chunk) return null;
    return chunk.words[wordIndex] || null;
  }

  private preloadChunk(chunkIndex: number) {
    requestIdleCallback(() => {
      const chunk = this.getChunkById(chunkIndex);
      if (!chunk) {
        const newChunks = this.getVisibleChunks(chunkIndex);
        fullTextLogger.logChunkOperation('preload', {
          chunkIndex,
          loadedChunks: newChunks.length
        });
      }
    });
  }
} 