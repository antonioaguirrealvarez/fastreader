import { supabase } from '../lib/supabase';
import { logger, LogCategory } from '../utils/logger';

interface ReadingProgress {
  user_id: string;
  file_id: string;
  current_word: number;
  total_words: number;
}

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

async function retry<T>(
  operation: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (attempts <= 1) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(operation, attempts - 1, delay * 2);
  }
}

export const readingProgressService = {
  async updateProgress(progress: ReadingProgress): Promise<void> {
    return retry(async () => {
      logger.debug(LogCategory.PROGRESS, 'Updating reading progress', {
        fileId: progress.file_id,
        currentWord: progress.current_word,
        totalWords: progress.total_words,
        percentage: Math.round((progress.current_word / progress.total_words) * 100)
      });

      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: progress.user_id,
          file_id: progress.file_id,
          current_word: progress.current_word,
          total_words: progress.total_words,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,file_id'
        });

      if (error) {
        logger.error(LogCategory.PROGRESS, 'Failed to update progress', error);
        throw error;
      }
    });
  },

  async getProgress(userId: string, fileId: string): Promise<ReadingProgress | null> {
    return retry(async () => {
      logger.debug(LogCategory.PROGRESS, 'Getting progress', { userId, fileId });

      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('file_id', fileId)
        .maybeSingle();

      if (error) {
        logger.error(LogCategory.PROGRESS, 'Failed to get progress', error);
        throw error;
      }

      return data;
    });
  },

  // This should only be called once when the library loads
  async getAllProgress(userId: string): Promise<ReadingProgress[]> {
    return retry(async () => {
      logger.debug(LogCategory.PROGRESS, 'Getting all progress', { userId });

      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        logger.error(LogCategory.PROGRESS, 'Failed to get all progress', error);
        throw error;
      }

      return data || [];
    });
  }
}; 