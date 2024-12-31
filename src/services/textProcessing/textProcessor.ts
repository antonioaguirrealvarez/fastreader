import { groqService } from '../groqService';
import { loggingCore, LogCategory } from '../logging/core';

interface TextProcessingOptions {
  batchSize?: number;
  cleanupMode?: 'light' | 'aggressive';
}

export class TextProcessor {
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

      const prompt = options.cleanupMode === 'aggressive' 
        ? `Clean and improve the following text:
           - Remove metadata, headers, footers, and page numbers
           - Fix formatting artifacts and broken words/sentences
           - Preserve meaningful paragraph breaks and line structure
           - Maintain the original content's meaning and flow
           - Keep intentional line breaks for lists, dialogue, or poetry
           - Standardize spacing while respecting structural formatting

Text to clean:
`
        : `Clean this text while preserving structure:
           - Fix basic formatting issues and obvious errors
           - Keep all paragraph breaks and line structure
           - Maintain original formatting where intentional
           - Preserve lists, dialogue, and special formatting
           - Only remove clear artifacts or errors

Text to clean:
`;

      const processedText = await groqService.processLargeText(text, prompt);

      loggingCore.endOperation(LogCategory.AI_PROCESSING, 'process_text', operationId, {
        originalLength: text.length,
        finalLength: processedText.length
      });

      return processedText;

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'text_processing_failed', {
        error,
        operationId
      });
      throw error;
    }
  }
}

export const textProcessor = new TextProcessor(); 