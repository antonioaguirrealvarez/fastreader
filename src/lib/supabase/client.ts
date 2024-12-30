import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
import { loggingCore, LogCategory } from '../../services/logging/core';

export class SupabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

class SupabaseClient {
  private static instance: SupabaseClient;
  private client: ReturnType<typeof createClient<Database>>;
  private readonly MAX_RETRIES = 3;
  private readonly DEFAULT_SETTINGS: Omit<SettingsData, 'user_id'> = {
    dark_mode: true,
    hide_header: false,
    display_mode: 'spritz',
    font_size: 'medium',
    record_analytics: true,
    pause_on_punctuation: true
  };
  private deleteOperations: Set<string> = new Set();
  private bulkOperationInProgress: boolean = false;

  private constructor() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase configuration');
    }
    
    this.client = createClient<Database>(url, key);
  }

  static getInstance() {
    if (!SupabaseClient.instance) {
      SupabaseClient.instance = new SupabaseClient();
    }
    return SupabaseClient.instance;
  }

  private async handleRequest<T>(
    operation: string,
    callback: () => Promise<T>,
    retries = 0
  ): Promise<T> {
    try {
      const result = await callback();
      return result;
    } catch (error) {
      const supabaseError = error as any;
      loggingCore.log(LogCategory.ERROR, `${operation}_error`, {
        error: {
          message: supabaseError.message,
          code: supabaseError.code,
          details: supabaseError.details,
          hint: supabaseError.hint
        },
        attempt: retries + 1
      });

      if (retries < this.MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
        return this.handleRequest(operation, callback, retries + 1);
      }

      throw new SupabaseError(
        supabaseError.message || 'Unknown error',
        supabaseError.code,
        supabaseError.details
      );
    }
  }

  // Progress Operations
  async upsertProgress(data: ProgressData) {
    return this.handleRequest('progress_update', async () => {
      // First check if record exists
      const { data: existing } = await this.client
        .from('reading_progress')
        .select('id')
        .eq('user_id', data.user_id)
        .eq('file_id', data.file_id)
        .single();

      const payload = {
        ...data,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // Update
        const { data: result, error } = await this.client
          .from('reading_progress')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        // Insert
        const { data: result, error } = await this.client
          .from('reading_progress')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    });
  }

  async getProgress(userId: string, fileId: string) {
    return this.handleRequest('progress_fetch', async () => {
      const { data, error } = await this.client
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('file_id', fileId)
        .maybeSingle();

      if (error) throw error;
      return data;
    });
  }

  // Settings Operations
  async upsertSettings(data: Partial<SettingsData> & { user_id: string }) {
    return this.handleRequest('settings_update', async () => {
      // Ensure we're only using snake_case column names
      const validColumns = [
        'user_id',
        'dark_mode',
        'hide_header',
        'display_mode',
        'font_size',
        'record_analytics',
        'pause_on_punctuation'
      ];

      // Filter out any invalid columns
      const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
        if (validColumns.includes(key)) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      // First check if settings exist
      const { data: existing } = await this.client
        .from('user_settings')
        .select('id')
        .eq('user_id', data.user_id)
        .single();

      if (existing) {
        const { data: result, error } = await this.client
          .from('user_settings')
          .update(sanitizedData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await this.client
          .from('user_settings')
          .insert({
            ...this.DEFAULT_SETTINGS,
            ...sanitizedData
          })
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    });
  }

  async getSettings(userId: string) {
    return this.handleRequest('settings_fetch', async () => {
      const { data, error } = await this.client
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    });
  }

  async getAllProgress(userId: string) {
    return this.handleRequest('progress_fetch_all', async () => {
      const { data, error } = await this.client
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    });
  }

  // File Operations
  async uploadFile(
    file: File,
    metadata: FileMetadata,
    userId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleRequest('file_upload', async () => {
      try {
        // Generate a unique file path
        const filePath = `${userId}/${Date.now()}-${file.name}`;
        
        // First try to upload the file
        const { data: uploadData, error: uploadError } = await this.client.storage
          .from('books')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // Then create the metadata record
        const { data: metadataData, error: metadataError } = await this.client
          .from('book_metadata')
          .insert([
            {
              user_id: userId,
              file_path: filePath,
              title: metadata.title,
              word_count: metadata.word_count,
              reading_time: metadata.reading_time,
              size: metadata.size,
              mime_type: metadata.mime_type
            }
          ])
          .select()
          .single();

        if (metadataError) {
          // If metadata insertion fails, clean up the uploaded file
          await this.client.storage
            .from('books')
            .remove([filePath]);
          
          throw new Error(`Metadata creation failed: ${metadataError.message}`);
        }

        return {
          success: true,
          data: metadataData
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          error: message
        };
      }
    });
  }

  async listFiles(userId: string): Promise<StoredFile[]> {
    return this.handleRequest('file_list', async () => {
      const { data: metadata, error: metadataError } = await this.client
        .from('book_metadata')
        .select('*')
        .eq('user_id', userId);

      if (metadataError) throw metadataError;

      const files = await Promise.all(
        metadata.map(async (record) => {
          const { data: { publicUrl } } = this.client.storage
            .from('books')
            .getPublicUrl(record.file_path);

          return {
            id: record.id,
            path: record.file_path,
            name: record.file_path.split('/').pop() || '',
            metadata: {
              title: record.title,
              author: record.author,
              description: record.description,
              wordCount: record.word_count,
              readingTime: record.reading_time,
              lastReadPosition: record.last_read_position,
              tags: record.tags,
              size: record.size,
              mimeType: record.mime_type
            },
            url: publicUrl,
            created_at: record.created_at,
            updated_at: record.updated_at,
            user_id: record.user_id
          };
        })
      );

      return files;
    });
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    return this.handleRequest('file_delete', async () => {
      // First get the file path
      const { data: metadata, error: fetchError } = await this.client
        .from('book_metadata')
        .select('file_path')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await this.client.storage
        .from('books')
        .remove([metadata.file_path]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: deleteError } = await this.client
        .from('book_metadata')
        .delete()
        .eq('id', fileId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      return true;
    });
  }

  async downloadFile(fileId: string, userId: string): Promise<Blob> {
    return this.handleRequest('file_download', async () => {
      // Get file path
      const { data: metadata, error: fetchError } = await this.client
        .from('book_metadata')
        .select('file_path')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Download file
      const { data, error: downloadError } = await this.client.storage
        .from('books')
        .download(metadata.file_path);

      if (downloadError) throw downloadError;

      return data;
    });
  }

  async testStorageSetup(): Promise<{
    success: boolean;
    details: {
      bucketExists: boolean;
      bucketAccessible: boolean;
      metadataTableExists: boolean;
      canUpload: boolean;
      canList: boolean;
      errors: Record<string, string>;
    };
  }> {
    const details = {
      bucketExists: false,
      bucketAccessible: false,
      metadataTableExists: false,
      canUpload: false,
      canList: false,
      errors: {} as Record<string, string>
    };

    try {
      // Test 1: Check if bucket exists
      const { data: buckets, error: bucketsError } = await this.client.storage.listBuckets();
      if (bucketsError) {
        details.errors.buckets = bucketsError.message;
      } else {
        details.bucketExists = buckets.some(b => b.name === 'books');
      }

      // Test 2: Try to access bucket
      if (details.bucketExists) {
        const { data: files, error: listError } = await this.client.storage
          .from('books')
          .list();
        
        if (listError) {
          details.errors.access = listError.message;
        } else {
          details.bucketAccessible = true;
          details.canList = true;
        }
      }

      // Test 3: Check metadata table
      const { count, error: tableError } = await this.client
        .from('book_metadata')
        .select('*', { count: 'exact', head: true });

      if (tableError) {
        if (tableError.code === '42P01') { // Table does not exist
          details.errors.metadata = 'Metadata table does not exist';
        } else {
          details.errors.metadata = tableError.message;
        }
      } else {
        details.metadataTableExists = true;
      }

      // Test 4: Try a test upload
      if (details.bucketAccessible) {
        const testBlob = new Blob(['test'], { type: 'text/plain' });
        const { data: uploadData, error: uploadError } = await this.client.storage
          .from('books')
          .upload('test.txt', testBlob);

        if (uploadError) {
          details.errors.upload = uploadError.message;
        } else {
          details.canUpload = true;
          // Clean up test file
          await this.client.storage
            .from('books')
            .remove(['test.txt']);
        }
      }

      return {
        success: details.bucketExists && 
                details.bucketAccessible && 
                details.metadataTableExists && 
                details.canUpload,
        details
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        details: {
          ...details,
          errors: {
            ...details.errors,
            unexpected: message
          }
        }
      };
    }
  }

  async listLibraryFiles(userId: string): Promise<LibraryFile[]> {
    return this.handleRequest('library_list', async () => {
      const operationId = crypto.randomUUID();
      const fileProcessingDetails: Record<string, {
        url?: string;
        contentSize?: number;
        error?: string;
      }> = {};
      
      loggingCore.log(LogCategory.LIBRARY, 'library_list_started', { 
        userId,
        operationId,
        timestamp: Date.now()
      });

      // Fetch metadata
      const { data: metadata, error: metadataError } = await this.client
        .from('book_metadata')
        .select('*')
        .eq('user_id', userId);

      loggingCore.log(LogCategory.DEBUG, 'library_metadata_fetch', { 
        count: metadata?.length,
        error: metadataError?.message,
        userId,
        operationId,
        files: metadata?.map(m => ({
          id: m.id,
          title: m.title,
          path: m.file_path,
          size: m.size,
          wordCount: m.word_count
        }))
      });

      if (metadataError) {
        throw new Error(`Failed to fetch library metadata: ${metadataError.message}`);
      }

      const files = await Promise.all(metadata.map(async (record) => {
        try {
          // Get file URL
          const { data: { publicUrl } } = this.client.storage
            .from('books')
            .getPublicUrl(record.file_path);

          fileProcessingDetails[record.id] = { url: publicUrl };

          // Get file content
          const { data: fileData, error: downloadError } = await this.client.storage
            .from('books')
            .download(record.file_path);

          if (downloadError) {
            fileProcessingDetails[record.id].error = downloadError.message;
            throw new Error(`Failed to download file: ${downloadError.message}`);
          }

          const content = await fileData.text();
          fileProcessingDetails[record.id].contentSize = content.length;

          return {
            id: record.id,
            name: record.title,
            content,
            timestamp: record.created_at,
            metadata: record,
            url: publicUrl
          };
        } catch (error) {
          fileProcessingDetails[record.id].error = error instanceof Error ? error.message : 'Unknown error';
          return null;
        }
      }));

      // Log all file processing results at once
      loggingCore.log(LogCategory.DEBUG, 'file_processing_details', {
        operationId,
        files: Object.entries(fileProcessingDetails).map(([fileId, details]) => ({
          fileId,
          ...details,
          status: details.error ? 'failed' : 'success'
        }))
      });

      // Filter out failed files
      const validFiles = files.filter((f): f is LibraryFile => f !== null);

      loggingCore.log(LogCategory.LIBRARY, 'library_list_completed', {
        userId,
        operationId,
        totalFiles: metadata.length,
        successfulFiles: validFiles.length,
        failedFiles: metadata.length - validFiles.length,
        summary: {
          totalSize: validFiles.reduce((acc, f) => acc + f.content.length, 0),
          averageSize: Math.round(validFiles.reduce((acc, f) => acc + f.content.length, 0) / validFiles.length),
          fileTypes: validFiles.reduce((acc, f) => {
            const type = f.metadata.mime_type;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      });

      return validFiles;
    });
  }

  async deleteLibraryFile(fileId: string, userId: string): Promise<void> {
    const operationKey = `${fileId}:${userId}`;
    if (this.deleteOperations.has(operationKey)) {
      return;
    }

    this.deleteOperations.add(operationKey);

    return this.handleRequest('library_delete', async () => {
      try {
        // Get file metadata first
        const { data: metadata, error: fetchError } = await this.client
          .from('book_metadata')
          .select('file_path')
          .eq('id', fileId)
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError || !metadata) {
          throw new Error(`Failed to fetch file metadata: ${fetchError?.message || 'File not found'}`);
        }

        // Sequential deletion to maintain consistency
        await this.deleteFileData(fileId, userId, metadata.file_path);

        loggingCore.log(LogCategory.LIBRARY, 'library_delete_completed', {
          fileId,
          userId
        });
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'library_delete_failed', {
          fileId,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      } finally {
        this.deleteOperations.delete(operationKey);
      }
    });
  }

  private async deleteFileData(fileId: string, userId: string, filePath: string): Promise<void> {
    // 1. Delete from storage
    const { error: storageError } = await this.client.storage
      .from('books')
      .remove([filePath]);

    if (storageError) {
      throw new Error(`Failed to delete file from storage: ${storageError.message}`);
    }

    // 2. Delete metadata
    const { error: deleteError } = await this.client
      .from('book_metadata')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete file metadata: ${deleteError.message}`);
    }

    // 3. Delete reading progress
    const { error: progressError } = await this.client
      .from('reading_progress')
      .delete()
      .match({ file_id: fileId, user_id: userId });

    if (progressError) {
      throw new Error(`Failed to delete reading progress: ${progressError.message}`);
    }
  }

  async bulkDeleteFiles(fileIds: string[], userId: string): Promise<void> {
    if (this.bulkOperationInProgress) {
      throw new Error('A bulk operation is already in progress');
    }

    this.bulkOperationInProgress = true;

    try {
      loggingCore.log(LogCategory.LIBRARY, 'bulk_delete_started', {
        userId,
        fileCount: fileIds.length,
        fileIds
      });

      // Delete files sequentially to prevent race conditions
      for (const fileId of fileIds) {
        await this.deleteLibraryFile(fileId, userId);
      }

      loggingCore.log(LogCategory.LIBRARY, 'bulk_delete_completed', {
        userId,
        fileCount: fileIds.length,
        fileIds
      });
    } finally {
      this.bulkOperationInProgress = false;
    }
  }
}

export const supabase = SupabaseClient.getInstance(); 