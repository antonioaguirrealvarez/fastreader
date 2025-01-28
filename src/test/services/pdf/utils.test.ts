import { describe, expect, it } from 'vitest';
import { isHeaderOrFooter, isPageNumber, processPageContent } from '../../../services/extractors/pdf/utils';
import { ExtractionOptions } from '../../../services/extractors/types';

describe('PDF Utils', () => {
  describe('isHeaderOrFooter', () => {
    const mockPageHeight = 1000;

    it('should identify text in header area', () => {
      const headerItem = {
        str: 'Header Text',
        transform: [1, 0, 0, 1, 100, 50], // y = 50 (top 5%)
        width: 100,
        height: 12,
        dir: 'ltr'
      };

      expect(isHeaderOrFooter(headerItem, mockPageHeight)).toBe(true);
    });

    it('should identify text in footer area', () => {
      const footerItem = {
        str: 'Footer Text',
        transform: [1, 0, 0, 1, 100, 950], // y = 950 (bottom 5%)
        width: 100,
        height: 12,
        dir: 'ltr'
      };

      expect(isHeaderOrFooter(footerItem, mockPageHeight)).toBe(true);
    });

    it('should not identify main content as header/footer', () => {
      const contentItem = {
        str: 'Main Content',
        transform: [1, 0, 0, 1, 100, 500], // y = 500 (middle)
        width: 100,
        height: 12,
        dir: 'ltr'
      };

      expect(isHeaderOrFooter(contentItem, mockPageHeight)).toBe(false);
    });
  });

  describe('isPageNumber', () => {
    const mockPageHeight = 1000;

    it('should identify simple page numbers in footer area', () => {
      expect(isPageNumber('1', 950, mockPageHeight)).toBe(true);
      expect(isPageNumber('42', 950, mockPageHeight)).toBe(true);
      expect(isPageNumber('199', 950, mockPageHeight)).toBe(true);
    });

    it('should identify simple page numbers in header area', () => {
      expect(isPageNumber('1', 50, mockPageHeight)).toBe(true);
      expect(isPageNumber('42', 50, mockPageHeight)).toBe(true);
      expect(isPageNumber('199', 50, mockPageHeight)).toBe(true);
    });

    it('should not identify years as page numbers', () => {
      expect(isPageNumber('2024', 950, mockPageHeight)).toBe(false);
      expect(isPageNumber('1999', 50, mockPageHeight)).toBe(false);
    });

    it('should not identify large numbers as page numbers', () => {
      expect(isPageNumber('1000', 950, mockPageHeight)).toBe(false);
      expect(isPageNumber('5432', 50, mockPageHeight)).toBe(false);
    });

    it('should not identify non-numeric text as page numbers', () => {
      expect(isPageNumber('Chapter 1', 950, mockPageHeight)).toBe(false);
      expect(isPageNumber('Page', 50, mockPageHeight)).toBe(false);
    });

    it('should not identify numbers in main content area as page numbers', () => {
      expect(isPageNumber('42', 500, mockPageHeight)).toBe(false);
    });
  });

  describe('processPageContent', () => {
    const mockContent = {
      items: [
        {
          str: 'Chapter 1',
          transform: [1, 0, 0, 1, 100, 900],
          width: 100,
          height: 12,
          dir: 'ltr'
        },
        {
          str: '1',
          transform: [1, 0, 0, 1, 500, 950],
          width: 20,
          height: 12,
          dir: 'ltr'
        },
        {
          str: 'First paragraph',
          transform: [1, 0, 0, 1, 100, 800],
          width: 200,
          height: 12,
          dir: 'ltr'
        },
        {
          str: 'continues here.',
          transform: [1, 0, 0, 1, 310, 800],
          width: 150,
          height: 12,
          dir: 'ltr'
        }
      ]
    };

    it('should process content with default options', async () => {
      const options: ExtractionOptions = {
        mode: 'light',
        preserveFormatting: false,
        extractImages: false,
        extractMetadata: false,
        removeHeaders: false,
        removeFooters: false,
        removePageNumbers: false
      };
      const { processedText, title } = await processPageContent(mockContent, 1, options);

      expect(title).toBe('Chapter 1');
      expect(processedText).toContain('Chapter 1');
      expect(processedText).toContain('First paragraph continues here.');
    });

    it('should remove headers when specified', async () => {
      const options: ExtractionOptions = {
        mode: 'light',
        preserveFormatting: false,
        extractImages: false,
        extractMetadata: false,
        removeHeaders: true,
        removeFooters: false,
        removePageNumbers: false
      };
      const { processedText } = await processPageContent(mockContent, 1, options);

      expect(processedText).not.toContain('Chapter 1');
      expect(processedText).toContain('First paragraph continues here.');
    });

    it('should remove page numbers when specified', async () => {
      const contentWithPageNumber = {
        items: [
          {
            str: 'Chapter Title',
            transform: [1, 0, 0, 1, 100, 800],
            width: 200,
            height: 12,
            dir: 'ltr'
          },
          {
            str: '42',
            transform: [1, 0, 0, 1, 500, 950], // In footer area
            width: 20,
            height: 12,
            dir: 'ltr'
          },
          {
            str: 'Some content with numbers like 123',
            transform: [1, 0, 0, 1, 100, 500],
            width: 300,
            height: 12,
            dir: 'ltr'
          }
        ]
      };

      const options: ExtractionOptions = {
        mode: 'light',
        preserveFormatting: false,
        extractImages: false,
        extractMetadata: false,
        removeHeaders: false,
        removeFooters: false,
        removePageNumbers: true
      };
      const { processedText } = await processPageContent(contentWithPageNumber, 1, options);

      expect(processedText).toContain('Chapter Title');
      expect(processedText).toContain('Some content with numbers like 123');
      expect(processedText).not.toContain('42'); // The page number should be removed
    });

    it('should handle empty content gracefully', async () => {
      const emptyContent = { items: [] };
      const options: ExtractionOptions = {
        mode: 'light',
        preserveFormatting: false,
        extractImages: false,
        extractMetadata: false,
        removeHeaders: false,
        removeFooters: false,
        removePageNumbers: false
      };
      const { processedText, title } = await processPageContent(emptyContent, 42, options);

      expect(processedText).toBe('');
      expect(title).toBe('Page 42');
    });

    it('should handle content with only numbers gracefully', async () => {
      const numberContent = {
        items: [
          {
            str: '42',
            transform: [1, 0, 0, 1, 100, 500],
            width: 20,
            height: 12,
            dir: 'ltr'
          }
        ]
      };
      const options: ExtractionOptions = {
        mode: 'light',
        preserveFormatting: false,
        extractImages: false,
        extractMetadata: false,
        removeHeaders: false,
        removeFooters: false,
        removePageNumbers: false
      };
      const { processedText, title } = await processPageContent(numberContent, 1, options);

      expect(processedText).toContain('42');
      expect(title).toBe('Page 1');
    });
  });
}); 