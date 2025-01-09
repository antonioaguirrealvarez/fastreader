import { v4 as uuidv4 } from 'uuid';
import { loggingCore, LogCategory } from '../logging/core';
import { useReaderSettings } from '../reader/readerSettingsService';

const CHUNK_SIZE = 1000; // words per chunk/page
const CHUNK_WINDOW = 1; // Keep one chunk before and after current chunk

// Helper function to safely get memory usage
function getMemoryUsage(): number | undefined {
  const performance = window.performance as unknown as { memory?: { usedJSHeapSize: number } };
  return performance.memory?.usedJSHeapSize;
}

export interface Chunk {
  id: string;
  words: string[];
  startIndex: number;
  endIndex: number;
}

export class ChunkingService {
  private content: string;
  private words: string[] | null = null; // Don't keep all words in memory
  private chunks: Map<number, Chunk>;
  private totalWords: number;
  private isLargeText: boolean;
  private rawChunks: { startIndex: number; endIndex: number }[] = [];
  private currentWordIndex: number = 0;

  constructor(content: string) {
    const startTime = performance.now();
    this.content = content;
    // Calculate total words without keeping array in memory
    this.totalWords = content.split(/\s+/).filter(word => word.length > 0).length;
    
    const settings = useReaderSettings.getState().settings;
    this.isLargeText = !settings.holdInMemory;
    this.chunks = new Map();
    
    if (this.isLargeText) {
      // When holdInMemory is false, only store chunk boundaries
      this.rawChunks = this.createRawChunks();
    } else {
      // When holdInMemory is true, create all chunks immediately
      this.createAllChunks();
    }

    loggingCore.log(LogCategory.DOCUMENT_PROCESSING, 'chunking_service_initialized', {
      totalWords: this.totalWords,
      isLargeText: this.isLargeText,
      initialChunksInMemory: this.chunks.size,
      rawChunkBoundaries: this.rawChunks.length,
      memoryUsage: getMemoryUsage(),
      initializationTime: performance.now() - startTime,
      holdInMemory: settings.holdInMemory
    });
  }

  private getWordsForRange(startIndex: number, endIndex: number): string[] {
    // Only split the content for the requested range
    const allWords = this.content.split(/\s+/).filter(word => word.length > 0);
    return allWords.slice(startIndex, endIndex);
  }

  private createChunk(startIndex: number, endIndex: number): Chunk {
    return {
      id: uuidv4(),
      words: this.getWordsForRange(startIndex, endIndex),
      startIndex,
      endIndex
    };
  }

  private createRawChunks(): { startIndex: number; endIndex: number }[] {
    const startTime = performance.now();
    const chunks: { startIndex: number; endIndex: number }[] = [];
    for (let i = 0; i < this.totalWords; i += CHUNK_SIZE) {
      chunks.push({
        startIndex: i,
        endIndex: Math.min(i + CHUNK_SIZE, this.totalWords)
      });
    }

    loggingCore.log(LogCategory.DOCUMENT_PROCESSING, 'raw_chunks_created', {
      totalChunks: chunks.length,
      averageChunkSize: this.totalWords / chunks.length,
      operationTime: performance.now() - startTime
    });

    return chunks;
  }

  private createAllChunks(): void {
    const startTime = performance.now();
    const initialChunks = [];

    for (let i = 0; i < this.totalWords; i += CHUNK_SIZE) {
      const chunk = this.createChunk(i, Math.min(i + CHUNK_SIZE, this.totalWords));
      this.chunks.set(Math.floor(i / CHUNK_SIZE), chunk);
      initialChunks.push({
        chunkIndex: Math.floor(i / CHUNK_SIZE),
        firstWord: chunk.words[0],
        wordCount: chunk.words.length,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex
      });
    }

    loggingCore.log(LogCategory.DOCUMENT_PROCESSING, 'all_chunks_created', {
      totalChunks: this.chunks.size,
      chunksInfo: initialChunks,
      memoryUsage: getMemoryUsage(),
      operationTime: performance.now() - startTime
    });
  }

  private getChunkIndex(wordIndex: number): number {
    return Math.floor(wordIndex / CHUNK_SIZE);
  }

  private loadChunkRange(centerChunkIndex: number): void {
    if (!this.isLargeText) return;

    const startTime = performance.now();
    const initialChunksInMemory = this.chunks.size;
    const deletedChunks = new Set<number>();

    // Clear chunks outside the window
    for (const [index] of this.chunks) {
      if (Math.abs(index - centerChunkIndex) > CHUNK_WINDOW) {
        deletedChunks.add(index);
        this.chunks.delete(index);
      }
    }

    // Load chunks within the window
    const newChunks = new Set<number>();
    for (let i = -CHUNK_WINDOW; i <= CHUNK_WINDOW; i++) {
      const targetIndex = centerChunkIndex + i;
      if (targetIndex >= 0 && targetIndex < this.rawChunks.length && !this.chunks.has(targetIndex)) {
        const { startIndex, endIndex } = this.rawChunks[targetIndex];
        const chunk = this.createChunk(startIndex, endIndex);
        this.chunks.set(targetIndex, chunk);
        newChunks.add(targetIndex);
      }
    }

    // Log chunk changes if any occurred
    if (deletedChunks.size > 0 || newChunks.size > 0) {
      loggingCore.log(LogCategory.DOCUMENT_PROCESSING, 'chunk_update', {
        centerChunkIndex,
        currentWordIndex: this.currentWordIndex,
        chunksInMemory: this.chunks.size,
        previousChunksInMemory: initialChunksInMemory,
        deletedChunks: Array.from(deletedChunks),
        newChunks: Array.from(newChunks),
        memoryUsage: getMemoryUsage(),
        firstWordsPerChunk: Array.from(this.chunks.entries()).map(([index, chunk]) => ({
          chunkIndex: index,
          firstWord: chunk.words[0],
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex
        })),
        operationTime: performance.now() - startTime
      });
    }
  }

  public getVisibleChunks(wordIndex: number): Chunk[] {
    const previousWordIndex = this.currentWordIndex;
    this.currentWordIndex = wordIndex;
    const currentChunkIndex = this.getChunkIndex(wordIndex);
    
    // Log if we're crossing chunk boundaries
    if (this.getChunkIndex(previousWordIndex) !== currentChunkIndex) {
      const currentChunk = this.chunks.get(currentChunkIndex);
      loggingCore.log(LogCategory.DOCUMENT_PROCESSING, 'chunk_boundary_crossed', {
        previousWordIndex,
        newWordIndex: wordIndex,
        previousChunkIndex: this.getChunkIndex(previousWordIndex),
        newChunkIndex: currentChunkIndex,
        chunksInMemory: this.chunks.size,
        visibleChunkFirstWord: currentChunk?.words[0],
        memoryUsage: getMemoryUsage(),
        isLargeText: this.isLargeText
      });
    }
    
    if (this.isLargeText) {
      // Load chunk range into memory (but don't return all of them)
      this.loadChunkRange(currentChunkIndex);
      // Only return the current chunk
      const currentChunk = this.chunks.get(currentChunkIndex);
      return currentChunk ? [currentChunk] : [];
    } else {
      // When holdInMemory is true, return all chunks
      return Array.from(this.chunks.values());
    }
  }

  public getTotalWords(): number {
    return this.totalWords;
  }

  public isLastWordInChunk(wordIndex: number): boolean {
    return (wordIndex + 1) % CHUNK_SIZE === 0 || wordIndex === this.totalWords - 1;
  }

  public isFirstWordInChunk(wordIndex: number): boolean {
    return wordIndex % CHUNK_SIZE === 0;
  }

  public getFirstWordIndexOfNextChunk(): number {
    return Math.min(
      Math.ceil((this.currentWordIndex + 1) / CHUNK_SIZE) * CHUNK_SIZE,
      this.totalWords - 1
    );
  }

  public getFirstWordIndexOfPreviousChunk(): number {
    return Math.max(
      Math.floor((this.currentWordIndex - CHUNK_SIZE) / CHUNK_SIZE) * CHUNK_SIZE,
      0
    );
  }

  private getCurrentWordIndex(): number {
    return this.currentWordIndex;
  }
} 