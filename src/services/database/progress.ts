import { supabase } from '../../lib/supabase/client';
import { ProgressData } from '../../types/supabase';
import { loggingCore, LogCategory } from '../logging/core';

class ProgressService {
  private readonly BATCH_SIZE = 100;
  private lastSavedProgress: Map<string, number> = new Map();
  private progressCache: Map<string, any> = new Map();
  private loadPromise: Promise<any> | null = null;

  private getProgressKey(userId: string, fileId: string): string {
    return `${userId}:${fileId}`;
  }

  async updateProgress(progress: ProgressData): Promise<void> {
    // Early returns for invalid conditions
    if (!progress.user_id || !progress.file_id || progress.current_word === 0) {
      return;
    }

    // Only save on exact 100-word intervals
    if (progress.current_word % this.BATCH_SIZE !== 0) {
      return;
    }

    const progressKey = this.getProgressKey(progress.user_id, progress.file_id);
    
    // Prevent duplicate saves
    if (this.lastSavedProgress.get(progressKey) === progress.current_word) {
      return;
    }

    try {
      const result = await supabase.upsertProgress(progress);
      
      this.lastSavedProgress.set(progressKey, progress.current_word);
      
      loggingCore.log(LogCategory.PROGRESS, 'progress_save_success', {
        wordIndex: progress.current_word,
        totalWords: progress.total_words,
        percentage: Math.round((progress.current_word / progress.total_words) * 100),
        result
      });
    } catch (error) {
      // More detailed error logging
      loggingCore.log(LogCategory.ERROR, 'progress_save_failed', {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint
        } : String(error),
        wordIndex: progress.current_word,
        userId: progress.user_id,
        fileId: progress.file_id
      });
      throw error;
    }
  }

  async getProgress(userId: string, fileId: string) {
    try {
      const data = await supabase.getProgress(userId, fileId);
      
      if (data) {
        loggingCore.log(LogCategory.PROGRESS, 'progress_loaded', {
          currentWord: data.current_word,
          totalWords: data.total_words
        });
      }
      
      return data;
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_fetch_failed', {
        error,
        userId,
        fileId
      });
      return null;
    }
  }

  async getAllProgress(userId: string) {
    // Return cached data if available
    if (this.progressCache.has(userId)) {
      return this.progressCache.get(userId);
    }

    // If already loading, return the existing promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Load progress
    this.loadPromise = (async () => {
      const operationId = crypto.randomUUID();
      
      try {
        const { data, error } = await supabase.client
          .from('reading_progress')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;

        loggingCore.log(LogCategory.PROGRESS, 'progress_fetch_all_complete', {
          count: data.length,
          userId,
          operationId,
          progress: data.map(p => ({
            fileId: p.file_id,
            progress: Math.round((p.current_word / p.total_words) * 100)
          }))
        });

        this.progressCache.set(userId, data);
        return data;
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'progress_fetch_failed', {
          userId,
          operationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  clearCache(userId: string) {
    this.progressCache.delete(userId);
  }

  async initializeProgress(userId: string, fileId: string, totalWords: number): Promise<void> {
    try {
      const operationId = crypto.randomUUID();
      
      // Check if progress already exists
      const existingProgress = await this.getProgress(userId, fileId);
      
      if (existingProgress) {
        loggingCore.log(LogCategory.PROGRESS, 'progress_already_initialized', {
          userId,
          fileId,
          operationId,
          existingProgress
        });
        return;
      }

      // Initialize progress
      const progress: ProgressData = {
        user_id: userId,
        file_id: fileId,
        current_word: 0,
        total_words: totalWords
      };

      await supabase.upsertProgress(progress);

      loggingCore.log(LogCategory.PROGRESS, 'progress_initialized', {
        userId,
        fileId,
        operationId,
        totalWords
      });
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_initialization_failed', {
        userId,
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}

export const progressService = new ProgressService(); 