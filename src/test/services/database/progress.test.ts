import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { progressService, ProgressService } from '../../../services/database/progress';
import { supabase } from '../../../lib/supabase/client';
import { loggingCore, LogCategory } from '../../../services/logging/core';
import { ProgressData } from '../../../types/supabase';

// Mock Supabase client
vi.mock('../../../lib/supabase/client', () => ({
  supabase: {
    upsertProgress: vi.fn(),
    getProgress: vi.fn(),
    getAllProgress: vi.fn()
  }
}));

// Mock logging core
vi.mock('../../../services/logging/core', () => ({
  loggingCore: {
    log: vi.fn(),
    startOperation: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    endOperation: vi.fn()
  },
  LogCategory: {
    PROGRESS: 'PROGRESS',
    ERROR: 'ERROR'
  }
}));

describe('Progress Service', () => {
  let progressService: ProgressService;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockFileId = '987fcdeb-51a2-43d6-9012-345678901234';

  beforeEach(() => {
    vi.clearAllMocks();
    progressService = new ProgressService();
    (progressService as any).lastSavedProgress = new Map();
    (progressService as any).progressCache = new Map();
    (progressService as any).loadPromise = null;
  });

  describe('Progress Updates', () => {
    it('should update progress on 100-word intervals', async () => {
      const progress: ProgressData = {
        user_id: mockUserId,
        file_id: mockFileId,
        current_word: 100,
        total_words: 1000
      };

      await progressService.updateProgress(progress);

      expect(supabase.upsertProgress).toHaveBeenCalledWith(progress);
      expect(loggingCore.log).toHaveBeenCalledWith(
        LogCategory.PROGRESS,
        'progress_updated',
        expect.objectContaining({
          userId: mockUserId,
          fileId: mockFileId,
          currentWord: 100,
          totalWords: 1000
        })
      );
    });

    it('should not update progress on non-100-word intervals', async () => {
      const progress: ProgressData = {
        user_id: mockUserId,
        file_id: mockFileId,
        current_word: 50,
        total_words: 1000
      };

      await progressService.updateProgress(progress);

      expect(supabase.upsertProgress).not.toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      const progress: ProgressData = {
        user_id: mockUserId,
        file_id: mockFileId,
        current_word: 100,
        total_words: 1000
      };

      const mockError = new Error('Database error');
      (supabase.upsertProgress as Mock).mockRejectedValueOnce(mockError);

      await progressService.updateProgress(progress);

      expect(loggingCore.log).toHaveBeenCalledWith(
        LogCategory.ERROR,
        'progress_update_failed',
        expect.objectContaining({
          error: mockError,
          userId: mockUserId,
          fileId: mockFileId
        })
      );
    });
  });

  describe('Progress Retrieval', () => {
    it('should get progress for a specific file', async () => {
      const mockProgress = {
        user_id: mockUserId,
        file_id: mockFileId,
        current_word: 100,
        total_words: 1000
      };

      (supabase.getProgress as Mock).mockResolvedValueOnce(mockProgress);

      const result = await progressService.getProgress(mockUserId, mockFileId);

      expect(result).toEqual(mockProgress);
      expect(supabase.getProgress).toHaveBeenCalledWith(mockUserId, mockFileId);
    });

    it('should handle null progress', async () => {
      (supabase.getProgress as Mock).mockResolvedValueOnce(null);

      const result = await progressService.getProgress(mockUserId, mockFileId);

      expect(result).toBeNull();
    });

    it('should handle progress fetch errors', async () => {
      const mockError = new Error('Database error');
      (supabase.getProgress as Mock).mockRejectedValueOnce(mockError);

      const result = await progressService.getProgress(mockUserId, mockFileId);

      expect(result).toBeNull();
      expect(loggingCore.log).toHaveBeenCalledWith(
        LogCategory.ERROR,
        'progress_fetch_failed',
        expect.objectContaining({
          error: mockError,
          userId: mockUserId,
          fileId: mockFileId
        })
      );
    });
  });

  describe('Bulk Progress Operations', () => {
    it('should get all progress for a user', async () => {
      const mockProgress = [
        { id: '1', user_id: mockUserId, file_id: mockFileId, current_word: 100, total_words: 1000 },
        { id: '2', user_id: mockUserId, file_id: 'file2', current_word: 200, total_words: 2000 }
      ];

      (supabase.getAllProgress as Mock).mockResolvedValueOnce(mockProgress);

      const result = await progressService.getAllProgress(mockUserId);

      expect(result).toEqual(mockProgress);
      expect(supabase.getAllProgress).toHaveBeenCalledWith(mockUserId);
    });

    it('should use cached progress when available', async () => {
      const mockProgress = [
        { user_id: mockUserId, file_id: mockFileId, current_word: 100, total_words: 1000 }
      ];

      (progressService as any).progressCache.set(mockUserId, mockProgress);

      const result = await progressService.getAllProgress(mockUserId);

      expect(result).toEqual(mockProgress);
      expect(supabase.getAllProgress).not.toHaveBeenCalled();
    });

    it('should handle bulk progress fetch errors', async () => {
      const mockError = new Error('Bulk fetch error');
      (supabase.getAllProgress as Mock).mockRejectedValueOnce(mockError);

      const result = await progressService.getAllProgress(mockUserId);

      expect(result).toBeNull();
      expect(loggingCore.log).toHaveBeenCalledWith(
        LogCategory.ERROR,
        'progress_fetch_failed',
        expect.objectContaining({
          error: mockError,
          userId: mockUserId
        })
      );
    });
  });

  describe('Progress Initialization', () => {
    it('should initialize progress for a new file', async () => {
      (supabase.getProgress as Mock).mockResolvedValueOnce(null);

      await progressService.initializeProgress(mockUserId, mockFileId, 1000);

      expect(supabase.upsertProgress).toHaveBeenCalledWith({
        user_id: mockUserId,
        file_id: mockFileId,
        current_word: 0,
        total_words: 1000
      });
    });

    it('should not initialize if progress exists', async () => {
      const existingProgress = {
        user_id: mockUserId,
        file_id: mockFileId,
        current_word: 100,
        total_words: 1000
      };

      (supabase.getProgress as Mock).mockResolvedValueOnce(existingProgress);

      await progressService.initializeProgress(mockUserId, mockFileId, 1000);

      expect(supabase.upsertProgress).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const mockError = new Error('Initialization error');
      (supabase.getProgress as Mock).mockRejectedValueOnce(mockError);

      const result = await progressService.initializeProgress(mockUserId, mockFileId, 1000);

      expect(result).toBeUndefined();
      expect(loggingCore.log).toHaveBeenCalledWith(
        LogCategory.ERROR,
        'progress_fetch_failed',
        expect.objectContaining({
          error: mockError,
          userId: mockUserId,
          fileId: mockFileId
        })
      );
    });
  });

  describe('Cache Management', () => {
    it('should clear progress cache for a user', async () => {
      const mockProgress = [
        { user_id: mockUserId, file_id: mockFileId, current_word: 100, total_words: 1000 }
      ];

      (progressService as any).progressCache.set(mockUserId, mockProgress);
      expect((progressService as any).progressCache.has(mockUserId)).toBe(true);

      progressService.clearCache(mockUserId);
      expect((progressService as any).progressCache.has(mockUserId)).toBe(false);
    });

    it('should handle clearing non-existent cache', () => {
      expect(() => progressService.clearCache(mockUserId)).not.toThrow();
    });
  });
}); 