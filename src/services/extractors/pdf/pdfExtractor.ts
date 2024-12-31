import { loggingCore, LogCategory } from '../../logging/core';
import { ProcessingOptions } from '../../documentProcessing/types';
import * as pdfjs from 'pdfjs-dist';

export class PdfExtractor {
  async extract(
    file: File,
    options: ProcessingOptions = {},
    onProgress?: (progress: number) => void
  ) {
    const operationId = crypto.randomUUID();

    try {
      loggingCore.startOperation(LogCategory.PDF_PROCESSING, 'extract', {
        filename: file.name,
        size: file.size,
        options
      }, { operationId });

      // Load the PDF document
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;

      loggingCore.log(LogCategory.PDF_PROCESSING, 'document_loaded', {
        filename: file.name,
        pageCount: pdf.numPages,
        operationId
      });

      // Process each page
      const textContent: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .map(item => 'str' in item ? item.str : '')
          .join(' ');
        
        textContent.push(text);

        loggingCore.log(LogCategory.PDF_PROCESSING, 'page_processed', {
          filename: file.name,
          page: i,
          totalPages: pdf.numPages,
          operationId
        });

        if (onProgress) {
          onProgress(i / pdf.numPages);
        }
      }

      const finalText = textContent.join('\n\n');
      const wordCount = finalText.split(/\s+/).length;

      loggingCore.endOperation(LogCategory.PDF_PROCESSING, 'extract', operationId, {
        filename: file.name,
        pageCount: pdf.numPages,
        wordCount,
        duration: performance.now()
      });

      return {
        text: finalText,
        pageCount: pdf.numPages
      };

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'pdf_extraction_failed', {
        filename: file.name,
        error,
        operationId
      });
      throw error;
    }
  }
}

export const pdfExtractor = new PdfExtractor(); 