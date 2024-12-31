import { groqService } from '../groqService';
import { loggingCore, LogCategory } from '../logging/core';

interface TextProcessingOptions {
  batchSize?: number;
  cleanupMode?: 'light' | 'aggressive';
}

export class TextProcessor {
  private async chunkText(text: string): Promise<string[]> {
    // Split into paragraphs while preserving meaningful breaks
    return text
      .split(/\n\s*\n/)
      .filter(chunk => chunk.trim().length > 0)
      .map(chunk => chunk.trim());
  }

  private async cleanChunk(chunk: string): Promise<string> {
    const messages = [{
      role: 'user',
      content: `Clean this text by removing artifacts, fixing formatting issues, and standardizing spacing. Preserve the meaning and content structure:

${chunk}`
    }];

    return await groqService.chat(messages);
  }

  private async removeMetadata(text: string): Promise<string> {
    const messages = [{
      role: 'user',
      content: `Remove any headers, footers, page numbers, and metadata while preserving the main content. Keep paragraph structure intact:

${text}`
    }];

    return await groqService.chat(messages);
  }

  async processText(
    text: string,
    options: TextProcessingOptions = {}
  ): Promise<string> {
    const operationId = crypto.randomUUID();
    
    try {
      loggingCore.startOperation(LogCategory.AI_PROCESSING, 'process_text', {
        textLength: text.length,
        options
      }, { operationId });

      // Step 1: Split into chunks
      const chunks = await this.chunkText(text);
      loggingCore.log(LogCategory.AI_PROCESSING, 'text_chunked', {
        chunkCount: chunks.length,
        averageChunkSize: chunks.reduce((acc, c) => acc + c.length, 0) / chunks.length,
        operationId
      });

      // Step 2: Clean each chunk
      const cleanedChunks = await Promise.all(
        chunks.map(async (chunk, index) => {
          const cleaned = await this.cleanChunk(chunk);
          loggingCore.log(LogCategory.AI_PROCESSING, 'chunk_cleaned', {
            chunkIndex: index,
            originalSize: chunk.length,
            cleanedSize: cleaned.length,
            operationId
          });
          return cleaned;
        })
      );

      // Step 3: Join chunks
      const combinedText = cleanedChunks.join('\n\n');
      
      // Step 4: Final metadata removal
      const finalText = await this.removeMetadata(combinedText);

      loggingCore.endOperation(LogCategory.AI_PROCESSING, 'process_text', operationId, {
        originalLength: text.length,
        finalLength: finalText.length,
        chunksProcessed: chunks.length
      });

      return finalText;

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'ai_processing_failed', {
        error,
        operationId
      });
      throw error;
    }
  }
}

export const textProcessor = new TextProcessor(); 