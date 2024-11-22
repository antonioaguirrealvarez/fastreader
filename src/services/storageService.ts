import { supabase } from '../lib/supabase';
import { loggerService } from './loggerService';

interface StoredFile {
  id: string;
  name: string;
  content: string;
  timestamp: number;
  userId: string;
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
      // Upload file content to storage
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(
          this.getBucketPath(userId, file.id),
          JSON.stringify({
            ...file,
            userId
          }),
          {
            contentType: 'application/json',
            upsert: true // Allow overwriting
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      // Store metadata in database
      const { error: dbError } = await supabase
        .from('files')
        .upsert([
          {
            id: file.id,
            user_id: userId,
            name: file.name,
            timestamp: file.timestamp,
            metadata: file.metadata
          }
        ]);

      if (dbError) {
        throw dbError;
      }

      await loggerService.log('info', 'File uploaded successfully', {
        fileId: file.id,
        userId,
        filename: file.name
      });

      return true;
    } catch (error) {
      await loggerService.log('error', 'File upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        filename: file.name
      });
      return false;
    }
  }

  async getFiles(userId: string): Promise<StoredFile[]> {
    try {
      // Get file metadata from database
      const { data: fileMetadata, error: dbError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId);

      if (dbError) throw dbError;

      // Get actual files from storage
      const files = await Promise.all(
        fileMetadata.map(async (meta) => {
          const { data, error } = await supabase.storage
            .from('user-files')
            .download(this.getBucketPath(userId, meta.id));

          if (error) throw error;

          const content = await data.text();
          return JSON.parse(content) as StoredFile;
        })
      );

      return files;
    } catch (error) {
      await loggerService.log('error', 'Failed to retrieve files', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
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