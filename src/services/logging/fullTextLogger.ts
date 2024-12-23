import { loggingCore } from './core';

interface RenderMetrics {
  renderCount?: number;
  processedWordsLength?: number;
  currentPosition?: number;
  isPlaying?: boolean;
  message?: string;
  duration?: number;
  [key: string]: unknown;
}

class FullTextLogger {
  private batchedLogs: Record<string, any[]> = {
    chunk_operations: [],
    position_updates: [],
    play_progress: [],
    performance: [],
    viewport_updates: [],
    play_state: []
  };
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;

  private flushBatchedLogs() {
    Object.entries(this.batchedLogs).forEach(([category, logs]) => {
      if (logs.length === 0) return;

      loggingCore.log('debug', 'FULLTEXT', `Batch ${category}`, {
        component: 'FullTextDisplay',
        batchSize: logs.length,
        summary: {
          totalOperations: logs.length,
          timeRange: {
            start: logs[0].timestamp,
            end: logs[logs.length - 1].timestamp
          },
          operations: logs.slice(-5) // Keep last 5 for detail
        }
      });

      this.batchedLogs[category] = [];
    });
  }

  private addToBatch(category: keyof typeof this.batchedLogs, data: any) {
    if (!this.batchedLogs[category]) {
      this.batchedLogs[category] = [];
    }

    this.batchedLogs[category].push({
      ...data,
      timestamp: Date.now()
    });

    if (this.batchedLogs[category].length >= this.BATCH_SIZE) {
      this.flushBatchedLogs();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushBatchedLogs();
        this.batchTimeout = null;
      }, 1000);
    }
  }

  logChunkOperation(operation: 'init' | 'load' | 'center' | 'play', data: any) {
    const operationTypes = {
      init: 'Chunk initialization',
      load: 'Chunk loading',
      center: 'Centering view',
      play: 'Play mode chunks'
    };

    this.addToBatch('chunk_operations', {
      operation: operationTypes[operation],
      timestamp: Date.now(),
      ...data
    });
  }

  logRender(duration: number, metrics: RenderMetrics) {
    this.addToBatch('performance', {
      ...metrics,
      duration,
      message: metrics.message || 'Render update'
    });
  }

  logProgressUpdate(type: 'user' | 'system', data: {
    oldPosition: number;
    newPosition: number;
    totalWords: number;
    isPlaying: boolean;
  }) {
    this.addToBatch('position_updates', {
      ...data,
      updateType: type
    });
  }

  error(error: Error, context: Record<string, unknown>) {
    loggingCore.log('error', 'FULLTEXT', 'FullText processing error', {
      component: 'FullTextDisplay',
      error: error.message,
      stack: error.stack,
      ...context
    });
  }

  logViewportUpdate(data: {
    visibleChunks: number[];
    currentChunk: number;
    viewportHeight: number;
    scrollPosition: number;
    centeringTarget?: number;
  }) {
    this.addToBatch('viewport_updates', {
      timestamp: Date.now(),
      ...data
    });
  }

  logPlayState(data: {
    action: 'start' | 'stop' | 'word_change';
    currentWord: number;
    nextWord?: number;
    chunkId: number;
    isChunkBoundary: boolean;
  }) {
    this.addToBatch('play_state', {
      timestamp: Date.now(),
      ...data
    });
  }
}

export const fullTextLogger = new FullTextLogger(); 