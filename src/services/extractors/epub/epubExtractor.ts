import { loggingCore, LogCategory } from '../../logging/core';
import { ProcessingOptions } from '../../documentProcessing/types';
import * as EPub from 'epubjs';

export class EpubExtractor {
  async extract(
    file: File,
    options: ProcessingOptions = {},
    onProgress?: (progress: number) => void
  ) {
    const operationId = crypto.randomUUID();

    try {
      loggingCore.startOperation(LogCategory.EPUB_PROCESSING, 'extract', {
        filename: file.name,
        size: file.size,
        options
      }, { operationId });

      const book = EPub(await file.arrayBuffer());
      await book.ready;

      loggingCore.log(LogCategory.EPUB_PROCESSING, 'document_loaded', {
        filename: file.name,
        chapterCount: book.spine.length,
        operationId
      });

      const chapters = await Promise.all(
        book.spine.map(async (chapter, index) => {
          const content = await chapter.load();
          
          loggingCore.log(LogCategory.EPUB_PROCESSING, 'chapter_processed', {
            filename: file.name,
            chapter: index + 1,
            totalChapters: book.spine.length,
            operationId
          });

          if (onProgress) {
            onProgress((index + 1) / book.spine.length);
          }

          return content;
        })
      );

      const finalText = chapters.join('\n\n');
      const wordCount = finalText.split(/\s+/).length;

      loggingCore.endOperation(LogCategory.EPUB_PROCESSING, 'extract', operationId, {
        filename: file.name,
        chapterCount: book.spine.length,
        wordCount,
        duration: performance.now()
      });

      return {
        text: finalText,
        pageCount: book.spine.length
      };

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'epub_extraction_failed', {
        filename: file.name,
        error,
        operationId
      });
      throw error;
    }
  }
}

export const epubExtractor = new EpubExtractor(); 