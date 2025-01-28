import { supabase } from '../../lib/supabase/client';
import { ProgressData } from '../../types/supabase';
import { loggingCore, LogCategory } from '../logging/core';

export class ProgressService {
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

    const key = this.getProgressKey(progress.user_id, progress.file_id);
    const lastSaved = this.lastSavedProgress.get(key) || 0;

    // Only save every 100 words
    if (progress.current_word - lastSaved < 100 && progress.current_word !== progress.total_words) {
      return;
    }

    try {
      await supabase.upsertProgress(progress);
      this.lastSavedProgress.set(key, progress.current_word);
      
      loggingCore.log(LogCategory.PROGRESS, 'progress_updated', {
        userId: progress.user_id,
        fileId: progress.file_id,
        currentWord: progress.current_word,
        totalWords: progress.total_words
      });
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_update_failed', {
        error,
        userId: progress.user_id,
        fileId: progress.file_id
      });
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

    try {
      const data = await supabase.getAllProgress(userId);
      if (data) {
        this.progressCache.set(userId, data);
      }
      return data;
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_fetch_failed', {
        error,
        userId
      });
      return null;
    }
  }

  clearCache(userId: string) {
    this.progressCache.delete(userId);
  }

  async initializeProgress(userId: string, fileId: string, totalWords: number): Promise<void> {
    try {
      const existingProgress = await this.getProgress(userId, fileId);
      
      if (existingProgress) {
        return;
      }

      await supabase.upsertProgress({
        user_id: userId,
        file_id: fileId,
        current_word: 0,
        total_words: totalWords
      });
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_initialization_failed', {
        error,
        userId,
        fileId
      });
    }
  }
}

export const progressService = new ProgressService(); 