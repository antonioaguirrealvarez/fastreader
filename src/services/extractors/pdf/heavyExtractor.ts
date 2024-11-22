import { Extractor, ExtractionResult, ExtractionOptions } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import { processPageContent } from './utils';

export class PDFHeavyExtractor implements Extractor {
  name = 'pdf-heavy';

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
      const chapters = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        if (onProgress) {
          onProgress(i / pdf.numPages);
        }

        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const { processedText, title } = await processPageContent(content, i, options);
        
        const wordCount = processedText.trim().split(/\s+/).length;
        totalWordCount += wordCount;

        chapters.push({
          title,
          content: processedText,
          wordCount
        });

        text += processedText + '\n\n';
      }

      return {
        text,
        document: {
          chapters,
          totalWordCount
        },
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