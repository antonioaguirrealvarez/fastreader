import { supabase } from '../lib/supabase/client';
import { documentProcessor } from './documentProcessing/documentProcessor';
import { loggingCore, LogCategory } from '../logging/core';
import { ProcessingOptions } from './documentProcessing/types';

export class StorageService {
  async uploadBook(
    file: File, 
    userId: string,
    options: ProcessingOptions = {},
    onProgress?: (progress: number) => void,
    useAI: boolean = false
  ) {
    const operationId = crypto.randomUUID();

    try {
      loggingCore.startOperation(LogCategory.UPLOAD, 'upload_book', {
        filename: file.name,
        size: file.size,
        userId,
        useAI
      }, { operationId });

      // Process document
      const result = await documentProcessor.processDocument(
        file, 
        options, 
        onProgress,
        useAI
      );

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('books')
        .upload(`${userId}/${file.name}`, file);

      if (error) throw error;

      loggingCore.log(LogCategory.UPLOAD, 'file_stored', {
        filename: file.name,
        path: data.path,
        operationId
      });

      // Save metadata
      const { error: dbError } = await supabase
        .from('books')
        .insert({
          user_id: userId,
          file_path: data.path,
          file_name: file.name,
          content: result.text,
          metadata: result.metadata,
          processing_stats: result.stats
        });

      if (dbError) throw dbError;

      loggingCore.endOperation(LogCategory.UPLOAD, 'upload_book', operationId, {
        filename: file.name,
        metadata: result.metadata,
        stats: result.stats
      });

      return { success: true, data: result };

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'upload_failed', {
        filename: file.name,
        error,
        operationId
      });
      throw error;
    }
  }
}

export const storageService = new StorageService(); 