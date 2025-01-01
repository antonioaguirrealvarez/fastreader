interface Chunk {
  id: string;
  words: string[];
  startIndex: number;
  endIndex: number;
}

export class ChunkingService {
  private readonly CHUNK_SIZE = 1000;
  private allWords: string[] = [];
  private chunks: Chunk[] = [];
  private currentChunkIndex = 0;

  constructor(text: string) {
    this.allWords = text.split(/\s+/).filter(word => word.length > 0);
    this.createChunks();
  }

  private createChunks() {
    for (let i = 0; i < this.allWords.length; i += this.CHUNK_SIZE) {
      const chunk: Chunk = {
        id: `chunk-${Math.floor(i / this.CHUNK_SIZE)}`,
        words: this.allWords.slice(i, i + this.CHUNK_SIZE),
        startIndex: i,
        endIndex: Math.min(i + this.CHUNK_SIZE - 1, this.allWords.length - 1)
      };
      this.chunks.push(chunk);
    }
  }

  public getVisibleChunks(currentWordIndex: number): Chunk[] {
    const currentChunkIndex = Math.floor(currentWordIndex / this.CHUNK_SIZE);
    this.currentChunkIndex = currentChunkIndex;
    
    // Always return exactly one chunk
    return [this.chunks[currentChunkIndex]];
  }

  public getNextChunk(): Chunk | null {
    if (this.currentChunkIndex < this.chunks.length - 1) {
      return this.chunks[this.currentChunkIndex + 1];
    }
    return null;
  }

  public getPreviousChunk(): Chunk | null {
    if (this.currentChunkIndex > 0) {
      return this.chunks[this.currentChunkIndex - 1];
    }
    return null;
  }

  public getTotalWords(): number {
    return this.allWords.length;
  }

  public getCurrentChunkIndex(): number {
    return this.currentChunkIndex;
  }

  public getChunkIndexForWord(wordIndex: number): number {
    return Math.floor(wordIndex / this.CHUNK_SIZE);
  }

  public isLastWordInChunk(wordIndex: number): boolean {
    return (wordIndex + 1) % this.CHUNK_SIZE === 0 || wordIndex === this.allWords.length - 1;
  }

  public isFirstWordInChunk(wordIndex: number): boolean {
    return wordIndex % this.CHUNK_SIZE === 0;
  }

  public getFirstWordIndexOfNextChunk(): number {
    return Math.min((this.currentChunkIndex + 1) * this.CHUNK_SIZE, this.allWords.length - 1);
  }

  public getFirstWordIndexOfPreviousChunk(): number {
    return Math.max((this.currentChunkIndex - 1) * this.CHUNK_SIZE, 0);
  }
} 