import { Extractor, ExtractionResult, ExtractionOptions } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import { cleanText } from '../../../utils/textUtils';
import { isHeaderOrFooter, isPageNumber } from './utils';

export class PDFLightExtractor implements Extractor {
  name = 'pdf-light';

  supports(filename: string): boolean {
    return filename.toLowerCase().endsWith('.pdf');
  }

  async extract(
    file: File,
    options: ExtractionOptions,
    onProgress?: (progress: number) => void
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      let totalWordCount = 0;
      
      for (let i = 1; i <= pdf.numPages; i++) {
        if (onProgress) {
          onProgress(i / pdf.numPages);
        }

        const page = await pdf.getPage(i);
        const { height } = page.getViewport({ scale: 1.0 });
        const content = await page.getTextContent();
        
        const filteredItems = content.items
          .filter(item => {
            if (options.removeHeaders && isHeaderOrFooter(item, height)) {
              return false;
            }
            if (options.removePageNumbers && isPageNumber(item.str, item.transform[5], height)) {
              return false;
            }
            return true;
          })
          .map(item => ({
            ...item,
            str: cleanText(item.str)
          }));

        const pageText = filteredItems.map(item => item.str).join(' ') + '\n';
        text += pageText;
        totalWordCount += pageText.trim().split(/\s+/).length;
      }

      return {
        text,
        metadata: {
          method: this.name,
          words: totalWordCount,
          pages: pdf.numPages
        },
        performance: {
          duration: Date.now() - startTime,
          method: this.name,
          success: true
        }
      };
    } catch (error) {
      throw {
        performance: {
          duration: Date.now() - startTime,
          method: this.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
} 