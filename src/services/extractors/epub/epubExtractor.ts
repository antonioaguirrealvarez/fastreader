import { Book } from 'epubjs';
import { loggingCore, LogCategory } from '../../logging/core';

export interface EpubExtractOptions {
  mode: 'light' | 'heavy';
  preserveFormatting?: boolean;
  extractImages?: boolean;
  extractMetadata?: boolean;
  removeHeaders?: boolean;
  removeFooters?: boolean;
  removePageNumbers?: boolean;
}

class EpubExtractor {
  async extract(
    file: File,
    options: EpubExtractOptions,
    onProgress?: (progress: number) => void
  ) {
    const operationId = loggingCore.startOperation(LogCategory.FILE, 'epub_extract', {
      filename: file.name,
      size: file.size,
      options
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const book = new Book(arrayBuffer);
      await book.ready;

      loggingCore.log(LogCategory.FILE, 'epub_loaded', {
        filename: file.name,
        chapterCount: book.spine.length,
        operationId
      });

      let text = '';
      let processedChapters = 0;

      for (const chapter of book.spine) {
        const content = await chapter.load();
        const chapterText = content.textContent || '';
        text += chapterText + '\n\n';

        processedChapters++;
        if (onProgress) {
          onProgress(processedChapters / book.spine.length);
        }

        loggingCore.log(LogCategory.FILE, 'epub_chapter_processed', {
          filename: file.name,
          chapter: processedChapters,
          totalChapters: book.spine.length,
          operationId
        });
      }

      const result = {
        text: text.trim(),
        metadata: book.metadata
      };

      loggingCore.endOperation(LogCategory.FILE, 'epub_extract', operationId, {
        filename: file.name,
        chapterCount: book.spine.length,
        wordCount: result.text.split(/\s+/).length
      });

      return result;
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'epub_extraction_failed', {
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        operationId
      });
      throw error;
    }
  }
}

export const epubExtractor = new EpubExtractor(); 