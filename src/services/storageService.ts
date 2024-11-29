import { supabase } from '../lib/supabase';
import { loggerService } from './loggerService';

interface StoredFile {
  id: string;
  user_id: string;
  name: string;
  content: string;
  timestamp: number;
  metadata?: {
    wordCount?: number;
    pageCount?: number;
    progress?: number;
  };
}

class StorageService {
  private getBucketPath(userId: string, fileId: string) {
    return `${userId}/${fileId}`;
  }

  async uploadFile(
    file: StoredFile,
    userId: string
  ): Promise<boolean> {
    try {
      // First store in database
      const { error: dbError } = await supabase
        .from('files')
        .upsert([
          {
            id: file.id,
            user_id: userId,
            name: file.name,
            timestamp: file.timestamp,
            content: file.content, // Store content in DB now
            metadata: file.metadata
          }
        ]);

      if (dbError) throw dbError;

      // Then store in storage (optional backup)
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(
          this.getBucketPath(userId, file.id),
          JSON.stringify(file),
          {
            contentType: 'application/json',
            upsert: true
          }
        );

      if (uploadError) {
        console.warn('Storage upload failed, but DB insert succeeded:', uploadError);
        // Don't throw here, as DB storage is primary
      }

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  }

  async getFiles(userId: string): Promise<StoredFile[]> {
    try {
      // Get files directly from database
      const { data: files, error: dbError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId);

      if (dbError) throw dbError;

      // Transform the data to match StoredFile interface
      return files.map(file => ({
        id: file.id,
        user_id: file.user_id,
        name: file.name,
        content: file.content || '',
        timestamp: file.timestamp,
        metadata: file.metadata || {}
      }));

    } catch (error) {
      console.error('Error in getFiles:', error);
      return [];
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([this.getBucketPath(userId, fileId)]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .match({ id: fileId, user_id: userId });

      if (dbError) throw dbError;

      await loggerService.log('info', 'File deleted successfully', {
        fileId,
        userId
      });

      return true;
    } catch (error) {
      await loggerService.log('error', 'Failed to delete file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
        userId
      });
      return false;
    }
  }

  async updateFileProgress(
    fileId: string,
    userId: string,
    progress: number
  ): Promise<boolean> {
    try {
      // First, get the current file data
      const { data: fileData, error: fetchError } = await supabase
        .from('files')
        .select('metadata')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Update metadata in database
      const { error: dbError } = await supabase
        .from('files')
        .update({
          metadata: {
            ...fileData?.metadata,
            progress
          }
        })
        .match({ id: fileId, user_id: userId });

      if (dbError) throw dbError;

      // Update the file content in storage with new progress
      const { data: storageData, error: storageError } = await supabase.storage
        .from('user-files')
        .download(this.getBucketPath(userId, fileId));

      if (storageError) throw storageError;

      const fileContent = JSON.parse(await storageData.text()) as StoredFile;
      fileContent.metadata = {
        ...fileContent.metadata,
        progress
      };

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .update(
          this.getBucketPath(userId, fileId),
          JSON.stringify(fileContent),
          {
            contentType: 'application/json',
            upsert: true
          }
        );

      if (uploadError) throw uploadError;

      await loggerService.log('info', 'File progress updated', {
        fileId,
        userId,
        progress
      });

      return true;
    } catch (error) {
      await loggerService.log('error', 'Failed to update file progress', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
        userId
      });
      return false;
    }
  }
}

export const storageService = new StorageService(); 