import { supabase } from '../lib/supabase';
import { logger, LogCategory } from '../utils/logger';
import { loggingCore, LogLevel } from '../services/logging/core';

interface ReadingProgress {
  user_id: string;
  file_id: string;
  current_word: number;
  total_words: number;
}

class ReadingProgressService {
  async updateProgress(progress: ReadingProgress): Promise<void> {
    try {
      loggingCore.log(LogCategory.READING_STATE, 'progress_update_start', {
        progress,
        timestamp: Date.now()
      }, { level: LogLevel.INFO });

      await this.retry(async () => {
        await supabase
          .from('reading_progress')
          .upsert(progress);
      });

      loggingCore.log(LogCategory.READING_STATE, 'progress_update_complete', {
        success: true,
        progress,
        timestamp: Date.now()
      }, { level: LogLevel.INFO });
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_update_failed', {
        error,
        progress,
        timestamp: Date.now()
      }, { level: LogLevel.ERROR });
      throw error;
    }
  }

  private async retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempts <= 1) throw error;
      
      loggingCore.log(LogCategory.READING_STATE, 'progress_update_retry', {
        attemptsLeft: attempts - 1,
        error
      }, { level: LogLevel.WARN });

      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.retry(fn, attempts - 1);
    }
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
      throw error;
    }
  }

  async getAllProgress(userId: string): Promise<ReadingProgress[]> {
    try {
      loggingCore.log(LogCategory.READING_STATE, 'progress_fetch_all_start', {
        userId,
        timestamp: Date.now()
      }, { level: LogLevel.INFO });

      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      loggingCore.log(LogCategory.READING_STATE, 'progress_fetch_all_complete', {
        success: true,
        count: data?.length ?? 0,
        timestamp: Date.now()
      }, { level: LogLevel.INFO });

      return data || [];
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'progress_fetch_all_failed', {
        error,
        userId
      }, { level: LogLevel.ERROR });
      throw error;
    }
  }
}

// Export singleton instance
export const readingProgressService = new ReadingProgressService(); 