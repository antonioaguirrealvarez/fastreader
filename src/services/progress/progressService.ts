import { loggingCore, LogCategory, LogLevel } from '../logging/core';

interface ReadingProgress {
  userId: string;
  fileId: string;
  currentWord: number;
  totalWords: number;
  timestamp: number;
  readingSpeed: number;
  completionPercentage: number;
  lastPosition?: {
    chunkId: number;
    wordIndex: number;
  };
}

interface ProgressUpdateOptions {
  shouldSync?: boolean;
  isAutoSave?: boolean;
}

interface BatchUpdate {
  wordIndex: number;
  timestamp: number;
  shouldSync: boolean;
}

class ProgressService {
  private currentProgress: ReadingProgress | null = null;
  private autoSaveInterval: number = 5000; // 5 seconds
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchedUpdates: Set<number> = new Set();
  private lastSyncedWord: number = 0;
  private lastLoggedWord: number = 0;
  private readonly BATCH_INTERVAL = 1000; // 1 second
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private PROGRESS_BATCH_SIZE = 100;  // Save every 100 words

  async initializeProgress(userId: string, fileId: string, totalWords: number): Promise<void> {
    // Add debug logging
    loggingCore.log(LogCategory.DEBUG, 'initialize_progress_called', {
      userId,
      fileId,
      totalWords,
      isInitialized: this.initialized,
      hasPromise: !!this.initializationPromise,
      stack: new Error().stack // This will help trace the call
    }, { level: LogLevel.DEBUG });

    if (this.initialized) return;

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = (async () => {
      try {
        this.initialized = true;
        
        // Initialize progress state
        this.currentProgress = {
          userId,
          fileId,
          currentWord: 0,
          totalWords,
          timestamp: Date.now(),
          readingSpeed: 0,
          completionPercentage: 0
        };

        // Log initialization once
        loggingCore.log(LogCategory.READING_STATE, 'session_initialized', {
          userId,
          fileId,
          totalWords
        }, { level: LogLevel.INFO });

        this.startAutoSave();
      } finally {
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      if (this.currentProgress) {
        this.updateProgress(this.currentProgress.currentWord, { isAutoSave: true });
      }
    }, this.autoSaveInterval);
  }

  async updateProgress(progress: {
    user_id: string,
    file_id: string,
    current_word: number,
    total_words: number
  }): Promise<void> {
    try {
      // Only save on batch boundaries
      if (progress.current_word % this.PROGRESS_BATCH_SIZE !== 0 
          && progress.current_word !== progress.total_words - 1) {
        return;
      }

      loggingCore.log(LogCategory.READING_STATE, 'progress_update', {
        currentWord: progress.current_word,
        totalWords: progress.total_words,
        percentage: (progress.current_word / progress.total_words) * 100
      }, { level: LogLevel.INFO });

      // Save to Supabase
      await this.saveToBackend(progress);

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_update_failed', {
        error,
        progress
      }, { level: LogLevel.ERROR });
      throw error;
    }
  }

  private async saveToBackend(progress: any): Promise<void> {
    try {
      loggingCore.log(LogCategory.READING_STATE, 'supabase_update_start', {
        progress,
        timestamp: Date.now()
      }, { level: LogLevel.INFO });

      const { error } = await supabase
        .from('reading_progress')
        .upsert(progress);

      if (error) throw error;

      loggingCore.log(LogCategory.READING_STATE, 'supabase_update_complete', {
        success: true,
        progress,
        timestamp: Date.now()
      }, { level: LogLevel.INFO });
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'supabase_update_failed', {
        error,
        progress,
        timestamp: Date.now()
      }, { level: LogLevel.ERROR });
      throw error;
    }
  }

  private processBatch = () => {
    if (this.batchedUpdates.size === 0) return;

    const updates = Array.from(this.batchedUpdates);
    this.batchedUpdates.clear();

    loggingCore.log(LogCategory.READING_STATE, 'progress_batch_update', {
      batchSize: updates.length,
      updates,
      timestamp: Date.now()
    }, { level: LogLevel.INFO });

    this.syncProgress();
  };

  private async syncProgress(): Promise<void> {
    if (!this.currentProgress) return;

    try {
      loggingCore.log(LogCategory.READING_STATE, 'progress_sync_start', {
        currentWord: this.currentProgress.currentWord,
        totalWords: this.currentProgress.totalWords,
        timestamp: Date.now()
      }, { level: LogLevel.INFO });

      // TODO: Add actual Supabase sync
      // await supabaseClient.from('reading_progress').upsert({...})

      loggingCore.log(LogCategory.READING_STATE, 'progress_sync_complete', {
        success: true,
        timestamp: Date.now()
      }, { level: LogLevel.INFO });
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_sync_failed', {
        error,
        progress: this.currentProgress
      }, { level: LogLevel.ERROR });
    }
  }

  async savePosition(chunkId: number, wordIndex: number): Promise<void> {
    if (!this.currentProgress) return;

    this.currentProgress.lastPosition = { chunkId, wordIndex };
    await this.syncProgress();
  }

  async getProgress(userId: string, fileId: string): Promise<ReadingProgress | null> {
    try {
      loggingCore.log(LogCategory.READING_STATE, 'progress_fetch_start', {
        userId,
        fileId,
        timestamp: Date.now()
      }, { level: LogLevel.INFO });

      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('file_id', fileId)
        .maybeSingle();

      if (error) throw error;

      loggingCore.log(LogCategory.READING_STATE, 'progress_fetch_complete', {
        success: true,
        progress: data,
        timestamp: Date.now()
      }, { level: LogLevel.INFO });

      return data;
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_fetch_failed', {
        error,
        userId,
        fileId
      }, { level: LogLevel.ERROR });
      return null;
    }
  }

  cleanup(): void {
    this.initialized = false;
    this.initializationPromise = null;
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    // Process any remaining updates
    this.processBatch();
  }
}

// Export singleton instance
export const progressService = new ProgressService(); 