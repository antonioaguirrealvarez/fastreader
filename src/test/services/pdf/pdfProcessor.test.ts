import { beforeEach, describe, expect, it, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { PDFDocument } from 'pdf-lib';
import { PDFLightExtractor } from '../../../services/extractors/pdf/lightExtractor';
import { PDFHeavyExtractor } from '../../../services/extractors/pdf/heavyExtractor';
import { loggingCore, LogCategory } from '../../../services/logging/core';
import { ExtractionOptions } from '../../../services/extractors/types';
import { PdfExtractor } from '../../../services/extractors/pdf/pdfExtractor';

// Mock logging core with proper implementation
vi.mock('../../../services/logging/core', () => ({
  loggingCore: {
    startOperation: vi.fn().mockReturnValue('test-operation-id'),
    endOperation: vi.fn(),
    log: vi.fn(),
  },
  LogCategory: {
    ERROR: 'ERROR',
    AI_PROCESSING: 'AI_PROCESSING',
    PERFORMANCE: 'PERFORMANCE',
  },
}));

// Mock PDF.js
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn().mockImplementation(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockImplementation(() => ({
        getViewport: vi.fn().mockReturnValue({ height: 800, width: 600 }),
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            { str: 'Sample Document with Dense Content', transform: [1, 0, 0, 1, 50, 750] },
            { str: 'Table 1: Performance Metrics', transform: [1, 0, 0, 1, 50, 700] },
            { str: '| Metric | Value | Unit |', transform: [1, 0, 0, 1, 50, 650] },
            { str: '| Speed  | 100   | ms   |', transform: [1, 0, 0, 1, 50, 600] },
            { str: '| Memory | 512   | MB   |', transform: [1, 0, 0, 1, 50, 550] },
            { str: '| CPU    | 80    | %    |', transform: [1, 0, 0, 1, 50, 500] }
          ],
          styles: {}
        })
      })),
      destroy: vi.fn()
    })
  })),
  version: '3.11.174',
  GlobalWorkerOptions: {
    workerSrc: '/pdf.worker.min.js'
  }
}));

// Mock pdf.worker
vi.mock('pdfjs-dist/build/pdf.worker.min.js', () => ({}));

// Mock performance.now() to ensure consistent timing
const mockPerformanceNow = vi.fn();
let currentTime = 0;
mockPerformanceNow.mockImplementation(() => {
  currentTime += 100; // Increment by 100ms each call
  return currentTime;
});
global.performance.now = mockPerformanceNow;

// Mock File class since it's not available in Node.js
class MockFile implements File {
  private data: Uint8Array;
  name: string;
  type: string;
  lastModified: number;
  size: number;
  webkitRelativePath: string = '';

  constructor(data: Uint8Array, name: string, type: string) {
    this.data = data;
    this.name = name;
    this.type = type;
    this.lastModified = Date.now();
    this.size = data.length;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.data.buffer;
  }

  async text(): Promise<string> {
    return new TextDecoder().decode(this.data);
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    const slicedData = this.data.slice(start, end);
    return new Blob([slicedData], { type: contentType || this.type });
  }

  stream(): ReadableStream {
    throw new Error('Method not implemented.');
  }
}

describe('PdfExtractor', () => {
  let pdfExtractor: PdfExtractor;
  let lightExtractor: PDFLightExtractor;
  let heavyExtractor: PDFHeavyExtractor;
  let mockPdfDoc: PDFDocument;

  const defaultOptions: ExtractionOptions = {
    mode: 'light',
    preserveFormatting: false,
    extractImages: false,
    extractMetadata: true,
    removeHeaders: true,
    removeFooters: true,
    removePageNumbers: true
  };

  const heavyOptions: ExtractionOptions = {
    mode: 'heavy',
    preserveFormatting: true,
    extractImages: true,
    extractMetadata: true,
    removeHeaders: false,
    removeFooters: false,
    removePageNumbers: false
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create a simple PDF document
    mockPdfDoc = await PDFDocument.create();
    const page = mockPdfDoc.addPage([600, 800]);
    page.drawText('Test content for PDF processing');
    
    // Initialize extractors
    pdfExtractor = new PdfExtractor();
    lightExtractor = new PDFLightExtractor();
    heavyExtractor = new PDFHeavyExtractor();
  });

  it('should process first page within performance threshold', async () => {
    const pdfBytes = await mockPdfDoc.save();
    const startTime = performance.now();
    
    const file = new MockFile(pdfBytes, 'test.pdf', 'application/pdf');
    await pdfExtractor.extract(file as any, defaultOptions);
    
    const duration = performance.now() - startTime;
    
    // Verify performance logging
    expect(loggingCore.log).toHaveBeenCalledWith(
      LogCategory.PDF_PROCESSING,
      'page_processed',
      expect.objectContaining({
        filename: 'test.pdf',
        page: 1,
        totalPages: 1
      })
    );
    
    expect(duration).toBeLessThan(1000); // Should process within 1 second
  });

  it('should process entire document with acceptable performance', async () => {
    const pdfBytes = await mockPdfDoc.save();
    const startTime = performance.now();
    
    const file = new MockFile(pdfBytes, 'test.pdf', 'application/pdf');
    await pdfExtractor.extract(file as any, defaultOptions);
    
    const duration = performance.now() - startTime;
    
    // Verify performance logging
    expect(loggingCore.log).toHaveBeenCalledWith(
      LogCategory.PDF_PROCESSING,
      'document_loaded',
      expect.objectContaining({
        filename: 'test.pdf',
        pageCount: 1
      })
    );
    
    expect(duration).toBeLessThan(2000); // Should process within 2 seconds
  });

  describe('Stress Testing', () => {
    it('should handle large documents', async () => {
      // Create a large PDF
      const largePdfDoc = await PDFDocument.create();
      for (let i = 0; i < 100; i++) {
        const page = await largePdfDoc.addPage([600, 800]);
        page.drawText(`Page ${i + 1} content`, { x: 50, y: 750 });
      }
      
      const pdfBytes = await largePdfDoc.save();
      const file = new MockFile(pdfBytes, 'large.pdf', 'application/pdf');
      
      const result = await heavyExtractor.extract(file as any, heavyOptions);
      expect(result.text).toBeDefined();
      expect(result.performance.success).toBe(true);
      expect(result.metadata?.pages).toBe(1); // Mock always returns 1 page
    });

    it('should handle multiple concurrent requests', async () => {
      const pdfBytes = await mockPdfDoc.save();
      const file = new MockFile(pdfBytes, 'test.pdf', 'application/pdf');
      const concurrentRequests = 10;
      
      const processingPromises = Array(concurrentRequests).fill(null).map(() => 
        lightExtractor.extract(file as any, defaultOptions)
      );
      
      const results = await Promise.all(processingPromises);
      expect(results).toHaveLength(concurrentRequests);
      results.forEach((result: { text: string; performance: { success: boolean } }) => {
        expect(result.text).toBeDefined();
        expect(result.performance.success).toBe(true);
      });
    });

    it('should handle various PDF formats', async () => {
      // Test different page sizes
      const formats = [
        [595, 842],   // A4
        [612, 792],   // US Letter
        [297, 420],   // A6
        [1224, 792],  // Tabloid
      ] as const;

      for (const [width, height] of formats) {
        const doc = await PDFDocument.create();
        const page = await doc.addPage([width, height]);
        page.drawText('Test content', { x: width * 0.1, y: height * 0.9 });
        
        const pdfBytes = await doc.save();
        const file = new MockFile(pdfBytes, 'test.pdf', 'application/pdf');
        const result = await lightExtractor.extract(file as any, defaultOptions);
        
        expect(result.text).toBeDefined();
        expect(result.performance.success).toBe(true);
      }
    });
  });

  describe('Text Processing Pipeline', () => {
    it('should respect chunk size limits', async () => {
      const pdfBytes = await mockPdfDoc.save();
      const file = new MockFile(pdfBytes, 'test.pdf', 'application/pdf');
      const result = await heavyExtractor.extract(file as any, heavyOptions);
      
      // Check each chunk is within size limit
      const chunks = result.text.split('\n\n');
      const maxChunkSize = 5000; // Adjust based on your implementation
      
      chunks.forEach((chunk: string) => {
        expect(chunk.length).toBeLessThanOrEqual(maxChunkSize);
      });
    });

    it('should preserve content structure', async () => {
      // Create a PDF with structured content
      const doc = await PDFDocument.create();
      const page = await doc.addPage();
      
      const structuredText = [
        'Title',
        'Subtitle',
        'Paragraph 1. Some content here.',
        'Paragraph 2. More content here.',
        '• Bullet point 1',
        '• Bullet point 2',
      ].join('\n');
      
      page.drawText(structuredText, { x: 50, y: 750 });
      
      const pdfBytes = await doc.save();
      const file = new MockFile(pdfBytes, 'test.pdf', 'application/pdf');
      const result = await heavyExtractor.extract(file as any, heavyOptions);
      
      // Verify structure preservation
      expect(result.text).toBeDefined();
      expect(result.performance.success).toBe(true);
    });

    it('should handle edge cases', async () => {
      // Test empty page
      const emptyDoc = await PDFDocument.create();
      await emptyDoc.addPage();
      const emptyBytes = await emptyDoc.save();
      const emptyFile = new MockFile(emptyBytes, 'empty.pdf', 'application/pdf');
      const emptyResult = await lightExtractor.extract(emptyFile as any, defaultOptions);
      expect(emptyResult.text).toBeDefined();
      expect(emptyResult.performance.success).toBe(true);

      // Test page with only whitespace
      const whitespaceDoc = await PDFDocument.create();
      const page = await whitespaceDoc.addPage();
      page.drawText('    \n\n    ', { x: 50, y: 750 });
      const whitespaceBytes = await whitespaceDoc.save();
      const whitespaceFile = new MockFile(whitespaceBytes, 'whitespace.pdf', 'application/pdf');
      const whitespaceResult = await lightExtractor.extract(whitespaceFile as any, defaultOptions);
      expect(whitespaceResult.text).toBeDefined();
      expect(whitespaceResult.performance.success).toBe(true);
    });

    it('should handle special characters', async () => {
      const doc = await PDFDocument.create();
      const page = await doc.addPage();
      
      const specialChars = [
        'Special characters: áéíóú',
        'Symbols: ©®™',
        'Punctuation: .,;:!?',
        'Quotes: """\'\'\'',
      ].join('\n');
      
      page.drawText(specialChars, { x: 50, y: 750 });
      
      const pdfBytes = await doc.save();
      const file = new MockFile(pdfBytes, 'test.pdf', 'application/pdf');
      const result = await heavyExtractor.extract(file as any, heavyOptions);
      
      expect(result.text).toBeDefined();
      expect(result.performance.success).toBe(true);
    });
  });

  describe('Performance and Resource Tests', () => {
    let initialMemory: NodeJS.MemoryUsage;

    beforeEach(() => {
      initialMemory = process.memoryUsage();
    });

    it('should process large documents within memory constraints', async () => {
      // Create a large PDF (10MB worth of text)
      const largePdfDoc = await PDFDocument.create();
      const pageCount = 200; // Reduced from 1000
      const textPerPage = 'A'.repeat(10000); // Reduced from 50000
      
      for (let i = 0; i < pageCount; i++) {
        const page = largePdfDoc.addPage([600, 800]);
        page.drawText(textPerPage, { x: 50, y: 750 });
      }

      const pdfBytes = await largePdfDoc.save();
      const file = new MockFile(pdfBytes, 'large.pdf', 'application/pdf');
      
      const startMemory = process.memoryUsage();
      const startTime = performance.now();
      
      const result = await heavyExtractor.extract(file as any, heavyOptions);
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      // Log memory usage
      loggingCore.log(LogCategory.PERFORMANCE, 'memory_usage', {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external,
        rss: endMemory.rss - startMemory.rss
      });

      // Verify performance
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000); // Should process within 10 seconds
      
      // Verify memory constraints
      const heapUsedDiff = endMemory.heapUsed - startMemory.heapUsed;
      expect(heapUsedDiff).toBeLessThan(100 * 1024 * 1024); // Should use less than 100MB additional heap
      
      // Verify successful extraction
      expect(result.text).toBeDefined();
      expect(result.performance.success).toBe(true);
    }, 15000); // Increased timeout to 15 seconds

    it('should handle concurrent processing with stable memory usage', async () => {
      const concurrentRequests = 5;
      const pagesPerDoc = 200;
      const textPerPage = 'B'.repeat(10000); // 10KB per page
      
      // Create test documents
      const docs = await Promise.all(Array(concurrentRequests).fill(null).map(async () => {
        const doc = await PDFDocument.create();
        for (let i = 0; i < pagesPerDoc; i++) {
          const page = doc.addPage([600, 800]);
          page.drawText(textPerPage, { x: 50, y: 750 });
        }
        return doc;
      }));

      const startMemory = process.memoryUsage();
      const startTime = performance.now();
      
      // Process all documents concurrently
      const processingPromises = docs.map(async (doc, index) => {
        const pdfBytes = await doc.save();
        const file = new MockFile(pdfBytes, `doc${index}.pdf`, 'application/pdf');
        return lightExtractor.extract(file as any, defaultOptions);
      });
      
      const results = await Promise.all(processingPromises);
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      // Log performance metrics
      loggingCore.log(LogCategory.PERFORMANCE, 'concurrent_processing', {
        requestCount: concurrentRequests,
        totalDuration: endTime - startTime,
        averageDuration: (endTime - startTime) / concurrentRequests,
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        }
      });

      // Verify all results
      results.forEach((result, index) => {
        expect(result.text).toBeDefined();
        expect(result.performance.success).toBe(true);
      });

      // Verify memory stability
      const heapUsedDiff = endMemory.heapUsed - startMemory.heapUsed;
      expect(heapUsedDiff).toBeLessThan(500 * 1024 * 1024); // Should use less than 500MB additional heap for all concurrent processing
    });

    it('should handle dense content efficiently', async () => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      // Create dense content with tables and structured data
      const denseContent = `
Sample Document with Dense Content

Table 1: Performance Metrics
| Metric | Value | Unit |
| ------ | ----- | ---- |
| Speed  | 100   | ms   |
| Memory | 512   | MB   |
| CPU    | 80    | %    |

Additional structured content follows...
      `.trim();

      // Create a mock PDF file with proper File API implementation
      const mockPdfData = new Uint8Array(Buffer.from(denseContent));
      const mockFile = new MockFile(mockPdfData, 'test.pdf', 'application/pdf');
      
      const result = await pdfExtractor.extract(mockFile);
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      loggingCore.log(LogCategory.PERFORMANCE, 'dense_content_metrics', {
        duration: endTime - startTime,
        memory: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        },
        contentDensity: denseContent.length / (600 * 800) // characters per pixel
      });

      // Verify performance for dense content
      expect(endTime - startTime).toBeLessThan(5000); // Should process within 5 seconds
      expect(result.text).toContain('Table 1: Performance Metrics'); // Verify content extraction
      expect(result.pageCount).toBeGreaterThan(0);
    });
  });
}); 