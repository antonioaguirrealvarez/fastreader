import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../../lib/supabase/client';
import { loggingCore, LogCategory } from '../../../services/logging/core';
import { documentProcessor } from '../../../services/documentProcessing/documentProcessor';
import { StorageService } from '../../../services/storageService';
import { ProcessingOptions } from '../../../services/documentProcessing/types';
import { StorageClient } from '@supabase/storage-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import { Database } from '../../../types/supabase';
import { auth } from '../../../lib/supabase/auth';

// Mock Supabase client
vi.mock('../../../lib/supabase/client', () => {
  const mockSupabase = {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
    })),
  };

  return { supabase: mockSupabase };
});

// Mock auth
vi.mock('../../../lib/supabase/auth', () => ({
  auth: {
    getUser: vi.fn(() => ({ id: '123e4567-e89b-12d3-a456-426614174000' })),
    getSession: vi.fn(() => ({ user: { id: '123e4567-e89b-12d3-a456-426614174000' } })),
  },
}));

// Mock logging core
vi.mock('../../../services/logging/core', () => ({
  LogCategory: {
    UPLOAD: 'UPLOAD',
    ERROR: 'ERROR',
    DOCUMENT_PROCESSING: 'DOCUMENT_PROCESSING',
  },
  loggingCore: {
    log: vi.fn(),
    startOperation: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    endOperation: vi.fn(),
  },
}));

// Mock document processor
vi.mock('../../../services/documentProcessing/documentProcessor', () => ({
  documentProcessor: {
    processDocument: vi.fn().mockResolvedValue({ text: 'processed text', metadata: { wordCount: 100 } }),
  },
}));

describe('Storage Service', () => {
  let storageService: StorageService;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

  beforeEach(() => {
    vi.clearAllMocks();
    storageService = new StorageService();

    // Reset document processor mock to success state
    (documentProcessor.processDocument as any).mockResolvedValue({
      text: 'processed text',
      metadata: { title: 'Test Book', author: 'Test Author' }
    });
  });

  describe('Book Upload', () => {
    it('should upload a book successfully', async () => {
      const uploadMock = vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null });
      const insertMock = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null });
      
      (supabase.storage.from as any).mockReturnValue({ upload: uploadMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await storageService.uploadBook(mockFile, mockUserId);

      expect(uploadMock).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalled();
      expect(documentProcessor.processDocument).toHaveBeenCalled();
      expect(loggingCore.log).toHaveBeenCalledWith(
        LogCategory.UPLOAD,
        'file_stored',
        expect.objectContaining({
          filename: 'test.pdf',
          path: 'test.pdf',
        })
      );
    });

    it('should handle storage upload errors', async () => {
      // Ensure document processing succeeds
      (documentProcessor.processDocument as any).mockResolvedValue({
        text: 'processed text',
        metadata: { title: 'Test Book', author: 'Test Author' }
      });

      // Mock storage error
      const uploadError = new Error('Storage upload failed');
      const uploadMock = vi.fn().mockRejectedValue(uploadError);
      (supabase.storage.from as any).mockReturnValue({ upload: uploadMock });

      await expect(
        storageService.uploadBook(mockFile, mockUserId)
      ).rejects.toThrow(uploadError);

      expect(loggingCore.log).toHaveBeenCalledWith(
        LogCategory.ERROR,
        'upload_failed',
        expect.objectContaining({
          error: uploadError,
          filename: mockFile.name
        })
      );
    });

    it('should handle metadata save errors', async () => {
      // Ensure document processing and storage upload succeed
      (documentProcessor.processDocument as any).mockResolvedValue({
        text: 'processed text',
        metadata: { title: 'Test Book', author: 'Test Author' }
      });

      // Mock successful storage upload
      const uploadMock = vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null });
      (supabase.storage.from as any).mockReturnValue({ upload: uploadMock });

      // Mock database error
      const dbError = new Error('Database insert failed');
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: dbError });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await expect(
        storageService.uploadBook(mockFile, mockUserId)
      ).rejects.toThrow(dbError);

      expect(loggingCore.log).toHaveBeenCalledWith(
        LogCategory.ERROR,
        'upload_failed',
        expect.objectContaining({
          error: dbError,
          filename: mockFile.name
        })
      );
    });

    it('should track upload progress', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const onProgress = vi.fn();
      
      // Mock document processor to call progress callback
      (documentProcessor.processDocument as any).mockImplementation(async (file, options, progressCallback) => {
        progressCallback(0.5);
        return { text: 'processed text', metadata: {} };
      });

      // Mock storage upload to succeed
      const uploadMock = vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null });
      (supabase.storage.from as any).mockReturnValue({ upload: uploadMock });

      // Mock database insert to succeed
      const insertMock = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await storageService.uploadBook(mockFile, mockUserId, {}, onProgress);

      expect(onProgress).toHaveBeenCalledWith(0.5);
      expect(loggingCore.log).toHaveBeenCalledWith(
        LogCategory.UPLOAD,
        'file_stored',
        expect.objectContaining({
          filename: 'test.pdf',
          path: 'test.pdf',
          operationId: expect.any(String)
        })
      );
    });

    it('should handle AI processing options', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const onProgress = vi.fn();

      // Mock document processor to succeed with AI processing
      (documentProcessor.processDocument as any).mockImplementation(async (file, options, progressCallback, useAI) => {
        expect(useAI).toBe(true);
        return { text: 'processed text', metadata: { aiProcessed: true } };
      });

      // Mock storage upload to succeed
      const uploadMock = vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null });
      (supabase.storage.from as any).mockReturnValue({ upload: uploadMock });

      // Mock database insert to succeed
      const insertMock = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await storageService.uploadBook(mockFile, mockUserId, {}, onProgress, true);

      expect(documentProcessor.processDocument).toHaveBeenCalledWith(
        mockFile,
        {},
        expect.any(Function),
        true
      );
    });
  });
}); 