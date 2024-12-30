import * as pdfjs from 'pdfjs-dist';
import { loggingCore, LogCategory } from '../../logging/core';

export interface PdfExtractOptions {
  mode: 'light' | 'heavy';
  preserveFormatting?: boolean;
  extractImages?: boolean;
  extractMetadata?: boolean;
  removeHeaders?: boolean;
  removeFooters?: boolean;
  removePageNumbers?: boolean;
}

interface TextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

class PdfExtractor {
  async extract(
    file: File,
    options: PdfExtractOptions,
    onProgress?: (progress: number) => void
  ) {
    const operationId = loggingCore.startOperation(LogCategory.PDF, 'extract', {
      filename: file.name,
      size: file.size,
      options
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      loggingCore.log(LogCategory.PDF, 'document_loaded', {
        filename: file.name,
        pageCount: pdf.numPages,
        operationId
      });

      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: TextItem) => item.str)
          .join(' ');

        text += pageText + '\n\n';

        if (onProgress) {
          onProgress(i / pdf.numPages);
        }

        loggingCore.log(LogCategory.PDF, 'page_processed', {
          filename: file.name,
          page: i,
          totalPages: pdf.numPages,
          operationId
        });
      }

      const result = {
        text: text.trim(),
        metadata: await pdf.getMetadata().catch(() => ({}))
      };

      loggingCore.endOperation(LogCategory.PDF, 'extract', operationId, {
        filename: file.name,
        pageCount: pdf.numPages,
        wordCount: result.text.split(/\s+/).length
      });

      return result;
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'pdf_extraction_failed', {
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        operationId
      });
      throw error;
    }
  }
}

export const pdfExtractor = new PdfExtractor(); 