import { create } from 'zustand';
import { loggingCore, LogCategory } from '../services/logging/core';
import { supabase } from '../lib/supabase/client';

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

interface LibraryState {
  files: StoredFile[];
  lastReadFileId: string | null;
  isLoading: boolean;
  error: string | null;
  loadFiles: (userId: string) => Promise<void>;
  addFile: (file: Omit<StoredFile, 'userId'>, userId: string) => Promise<void>;
  removeFile: (fileId: string, userId: string) => Promise<void>;
  setLastReadFile: (fileId: string) => void;
  updateProgress: (fileId: string, progress: number, userId: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set) => {
  let loadDebounceTimer: NodeJS.Timeout | null = null;

  return {
    files: [],
    lastReadFileId: null,
    isLoading: false,
    error: null,

    loadFiles: async (userId: string) => {
      if (!userId) return;

      // Clear any pending load
      if (loadDebounceTimer) {
        clearTimeout(loadDebounceTimer);
      }

      // Debounce the load operation
      loadDebounceTimer = setTimeout(async () => {
        set({ isLoading: true, error: null });
        try {
          const files = await supabase.listLibraryFiles(userId);
          set({ files, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load files',
            isLoading: false 
          });
        }
      }, 100); // 100ms debounce
    },

    addFile: async (file, userId) => {
      try {
        loggingCore.log(LogCategory.FILE, 'library_add_started', {
          filename: file.name,
          userId
        });

        if (!userId) return;

        set({ isLoading: true, error: null });
        try {
          const success = await storageService.uploadFile(
            { ...file, userId },
            userId
          );
          if (success) {
            const files = await storageService.getFiles(userId);
            set({ files, isLoading: false });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to add file',
            isLoading: false 
          });
        }

        loggingCore.log(LogCategory.FILE, 'library_add_completed', {
          filename: file.name,
          userId
        });
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'library_add_failed', {
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    },

    removeFile: async (fileId, userId) => {
      if (!userId) return;

      set({ isLoading: true, error: null });
      try {
        const success = await storageService.deleteFile(fileId, userId);
        if (success) {
          const files = await storageService.getFiles(userId);
          set({ files, isLoading: false });
        }
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to remove file',
          isLoading: false 
        });
      }
    },

    setLastReadFile: (fileId) => {
      set({ lastReadFileId: fileId });
    },

    updateProgress: async (fileId, progress, userId) => {
      if (!userId) return;

      try {
        await storageService.updateFileProgress(fileId, userId, progress);
        const files = await storageService.getFiles(userId);
        set({ files });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update progress'
        });
      }
    }
  };
}); 