import { loggingCore } from './core';

interface BatchMetrics {
  wordCount: number;
  totalDuration: number;
  sampledWords: Set<string>;
  lastFlush: number;
}

class SpritzLogger {
  private batchMetrics: BatchMetrics = {
    wordCount: 0,
    totalDuration: 0,
    sampledWords: new Set(),
    lastFlush: Date.now()
  };

  private readonly SAMPLE_RATE = 10; // Log 1 in every 10 words
  private readonly BATCH_INTERVAL = 5000; // 5 seconds

  wordAnalysis(word: string, duration: number) {
    this.batchMetrics.wordCount++;
    this.batchMetrics.totalDuration += duration;

    // Only log if word hasn't been sampled before and meets sample rate
    if (!this.batchMetrics.sampledWords.has(word) && 
        this.batchMetrics.wordCount % this.SAMPLE_RATE === 0) {
      this.batchMetrics.sampledWords.add(word);
      loggingCore.log('debug', 'SPRITZ', 'Word analysis completed', {
        component: 'SpritzProcessor',
        word,
        duration,
        wordCount: this.batchMetrics.wordCount
      });
    }

    // Check if we should flush metrics
    const now = Date.now();
    if (now - this.batchMetrics.lastFlush >= this.BATCH_INTERVAL) {
      this.flushMetrics();
    }
  }

  private flushMetrics() {
    if (this.batchMetrics.wordCount > 0) {
      loggingCore.log('info', 'SPRITZ', `Batch processed: ${this.batchMetrics.wordCount} words`, {
        component: 'SpritzProcessor',
        wordCount: this.batchMetrics.wordCount,
        averageDuration: this.batchMetrics.totalDuration / this.batchMetrics.wordCount,
        uniqueWords: this.batchMetrics.sampledWords.size,
        sampleRate: this.SAMPLE_RATE
      });

      // Reset metrics
      this.batchMetrics = {
        wordCount: 0,
        totalDuration: 0,
        sampledWords: new Set(),
        lastFlush: Date.now()
      };
    }
  }

  error(error: Error, context: Record<string, unknown>) {
    loggingCore.log('error', 'SPRITZ', 'Spritz processing error', {
      component: 'SpritzProcessor',
      error: error.message,
      stack: error.stack,
      ...context
    });
  }
}

export const spritzLogger = new SpritzLogger(); 