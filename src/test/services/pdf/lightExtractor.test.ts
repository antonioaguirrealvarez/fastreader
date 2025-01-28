import { describe, expect, it, vi, beforeEach } from 'vitest';
import { pdfExtractor } from '../../../services/extractors/pdf/pdfExtractor';
import { ProcessingOptions } from '../../../services/documentProcessing/types';
import { initializePDFWorker } from '../../../services/pdf/PDFService';
import { loggingCore, LogCategory } from '../../../services/logging/core';
import path from 'path';
import fs from 'fs';

// Mock the logging service
vi.mock('../../../services/logging/core', () => ({
  LogCategory: {
    PDF_PROCESSING: 'PDF_PROCESSING',
    ERROR: 'ERROR'
  },
  loggingCore: {
    log: vi.fn(),
    startOperation: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    endOperation: vi.fn()
  }
}));

// Mock PDF.js
vi.mock('pdfjs-dist/build/pdf.mjs', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: vi.fn((pageNum) => ({
        getTextContent: vi.fn(() => Promise.resolve({
          items: [
            { str: 'Test content for page ' + pageNum },
            { str: 'More content for page ' + pageNum }
          ]
        }))
      }))
    })
  })),
  GlobalWorkerOptions: {
    workerSrc: null
  }
}));

// Mock worker URL
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mocked-worker-url'
}));

describe('PDF Extractor', () => {
  let defaultOptions: ProcessingOptions;
  let testPdfFile: File;
  let testPdfBuffer: Buffer;

  beforeEach(async () => {
    defaultOptions = {
      preserveFormatting: false,
      extractImages: false,
      extractMetadata: false,
      removeHeaders: false,
      removeFooters: false,
      removePageNumbers: false
    };

    // Initialize PDF.js worker
    initializePDFWorker();

    // Load the actual test PDF file
    const pdfPath = path.join(process.cwd(), 'src', 'test', 'data', 'pdf', 'Antonio Aguirregomezcorta - Op-Ed NCA.pdf');
    testPdfBuffer = await fs.promises.readFile(pdfPath);
    
    // Create a File object with arrayBuffer method
    const blob = new Blob([testPdfBuffer], { type: 'application/pdf' });
    testPdfFile = new File([blob], 'Antonio Aguirregomezcorta - Op-Ed NCA.pdf', { type: 'application/pdf' });
    Object.defineProperty(testPdfFile, 'arrayBuffer', {
      value: async () => testPdfBuffer.buffer.slice(
        testPdfBuffer.byteOffset,
        testPdfBuffer.byteOffset + testPdfBuffer.byteLength
      )
    });

    // Clear mock calls
    vi.clearAllMocks();
  });

  describe('Text Extraction', () => {
    it('should extract text from PDF with default options', async () => {
      const result = await pdfExtractor.extract(testPdfFile, defaultOptions);

      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.pageCount).toBe(2);
      expect(loggingCore.startOperation).toHaveBeenCalledWith(
        LogCategory.PDF_PROCESSING,
        'extract',
        expect.objectContaining({
          filename: testPdfFile.name,
          size: testPdfFile.size
        }),
        expect.anything()
      );
      expect(loggingCore.endOperation).toHaveBeenCalled();
    });

    it('should handle progress reporting', async () => {
      const progressMock = vi.fn();
      await pdfExtractor.extract(testPdfFile, defaultOptions, progressMock);

      expect(progressMock).toHaveBeenCalled();
      const calls = progressMock.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(1); // Last call should be with progress 1
    });

    it('should handle extraction errors gracefully', async () => {
      // Create an invalid PDF file
      const invalidPdfFile = new File(['invalid pdf content'], 'invalid.pdf', { type: 'application/pdf' });
      Object.defineProperty(invalidPdfFile, 'arrayBuffer', {
        value: async () => {
          throw new Error('Failed to read PDF');
        }
      });

      await expect(pdfExtractor.extract(invalidPdfFile, defaultOptions)).rejects.toThrow();
      expect(loggingCore.log).toHaveBeenCalledWith(
        LogCategory.ERROR,
        'pdf_extraction_failed',
        expect.objectContaining({
          filename: 'invalid.pdf',
          error: expect.any(Error)
        })
      );
    });
  });
}); 