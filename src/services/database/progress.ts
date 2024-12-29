import { supabase } from '../../lib/supabase/client';
import { ProgressData } from '../../types/supabase';
import { loggingCore, LogCategory } from '../logging/core';

class ProgressService {
  private readonly BATCH_SIZE = 100;
  private lastSavedProgress: Map<string, number> = new Map();

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

  async getAllProgress(userId: string): Promise<ProgressData[]> {
    try {
      const data = await supabase.getAllProgress(userId);
      
      if (data) {
        loggingCore.log(LogCategory.PROGRESS, 'progress_fetch_all_complete', {
          count: data.length,
          userId
        });
      }
      
      return data || [];
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_fetch_all_failed', {
        error,
        userId
      });
      return [];
    }
  }
}

export const progressService = new ProgressService(); 