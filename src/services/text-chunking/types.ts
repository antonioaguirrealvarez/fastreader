export interface Chunk {
  id: number;
  startWord: number;
  endWord: number;
  content: string;
  words: string[];
}

export interface ChunkMetrics {
  totalChunks: number;
  totalWords: number;
  chunkSize: number;
  averageWordsPerChunk: number;
}

export interface ChunkPosition {
  chunkIndex: number;
  wordIndex: number;
  globalWordIndex: number;
}

export type ChunkUpdateCallback = (chunks: Chunk[]) => void; 