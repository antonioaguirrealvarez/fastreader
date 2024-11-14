import { supabase } from '../supabase/config';
import type { FileMetadata } from '../supabase/config';
import { FileObject } from '@supabase/storage-js';

export interface FileUploadResponse {
  success: boolean;
  data?: {
    path: string;
    url: string;
    metadata: FileMetadata;
  };
  error?: string;
}

export interface FileListResponse {
  files: (FileObject & { metadata: FileMetadata; url: string })[];
  error?: string;
}

export const fileService = {
  // Upload file with metadata
  uploadFile: async (
    file: File,
    metadata: FileMetadata,
    userId: string
  ): Promise<FileUploadResponse> => {
    try {
      // Upload file
      const fileName = `${userId}/${Date.now()}-${file.name}`;
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('books')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store metadata
      const { error: metadataError } = await supabase
        .from('book_metadata')
        .insert([{
          file_path: fileData.path,
          user_id: userId,
          ...metadata
        }]);

      if (metadataError) throw metadataError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('books')
        .getPublicUrl(fileData.path);

      return {
        success: true,
        data: {
          path: fileData.path,
          url: publicUrl,
          metadata
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  // List user's files
  listFiles: async (userId: string): Promise<FileListResponse> => {
    try {
      // Get metadata
      const { data: metadataList, error: metadataError } = await supabase
        .from('book_metadata')
        .select('*')
        .eq('user_id', userId);

      if (metadataError) throw metadataError;

      // Get files and combine with metadata
      const files = await Promise.all(
        metadataList.map(async (metadata) => {
          const { data: fileData } = await supabase.storage
            .from('books')
            .list(userId, {
              limit: 1,
              search: metadata.file_path.split('/').pop()
            });

          const { data: { publicUrl } } = supabase.storage
            .from('books')
            .getPublicUrl(metadata.file_path);

          return {
            ...fileData?.[0],
            metadata,
            url: publicUrl
          };
        })
      );

      return { files };
    } catch (error) {
      return {
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  // Get file content
  getFileContent: async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('books')
      .download(path);

    if (error) throw error;

    return await data.text();
  },

  // Update reading progress
  updateReadingProgress: async (
    userId: string,
    filePath: string,
    position: number
  ) => {
    return await supabase
      .from('book_metadata')
      .update({ lastReadPosition: position })
      .match({ user_id: userId, file_path: filePath });
  }
}; 