import { logger, LogCategory } from '../utils/logger';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class GroqService {
  private readonly MODEL = 'llama-3.3-70b-versatile';
  private readonly BATCH_SIZE = 20;
  private readonly CHAT_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly COMPLETION_API_URL = 'https://api.groq.com/v1/completions';

  async processText(text: string): Promise<string> {
    const startTime = Date.now();
    try {
      logger.info(LogCategory.GROQ_PROCESSING, 'Starting text processing', {
        textLength: text.length,
        model: this.MODEL,
        batchSize: this.BATCH_SIZE
      });

      // Split text into sentences
      const sentences = this.splitIntoSentences(text);
      logger.debug(LogCategory.GROQ_PROCESSING, 'Text split into sentences', {
        totalSentences: sentences.length
      });

      // Create batches
      const batches = this.createBatches(sentences);
      logger.debug(LogCategory.GROQ_PROCESSING, 'Created sentence batches', {
        totalBatches: batches.length,
        batchSize: this.BATCH_SIZE
      });

      // Process each batch
      const processedBatches = await Promise.all(
        batches.map(async (batch, index) => {
          logger.debug(LogCategory.GROQ_PROCESSING, `Processing batch ${index + 1}/${batches.length}`, {
            batchSize: batch.length
          });

          const result = await this.processBatch(batch);
          
          logger.debug(LogCategory.GROQ_PROCESSING, `Completed batch ${index + 1}`, {
            inputSize: batch.join(' ').length,
            outputSize: result.length
          });

          return result;
        })
      );

      // Combine results
      const finalText = processedBatches.join(' ');
      logger.info(LogCategory.GROQ_PROCESSING, 'Text processing completed', {
        originalLength: text.length,
        finalLength: finalText.length,
        totalBatches: batches.length,
        processingTime: Date.now() - startTime
      });

      return finalText;
    } catch (error) {
      logger.error(LogCategory.GROQ_PROCESSING, 'Error processing text with Groq', error, {
        textLength: text.length,
        model: this.MODEL,
        processingTime: Date.now() - startTime
      });
      throw this.formatError(error);
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const startTime = Date.now();
    try {
      logger.debug(LogCategory.GROQ_PROCESSING, 'Starting chat request', {
        messageCount: messages.length,
        model: this.MODEL
      });

      const response = await fetch(this.CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Groq API error: ${response.status} - ${response.statusText}${
          errorData ? '\n' + JSON.stringify(errorData, null, 2) : ''
        }`);
      }

      const data = await response.json();
      const result = data.choices[0]?.message?.content;

      if (!result) {
        throw new Error('No response content from Groq');
      }

      logger.debug(LogCategory.GROQ_PROCESSING, 'Chat request completed', {
        inputMessages: messages.length,
        outputLength: result.length,
        processingTime: Date.now() - startTime,
        tokensUsed: data.usage
      });

      return result;
    } catch (error) {
      logger.error(LogCategory.GROQ_PROCESSING, 'Error in chat request', error, {
        messageCount: messages.length,
        model: this.MODEL,
        processingTime: Date.now() - startTime
      });
      throw this.formatError(error);
    }
  }

  // Alias methods for backward compatibility
  async cleanText(text: string): Promise<string> {
    return this.processTextWithChat(text, 'Clean this text by removing any formatting artifacts, fixing spacing issues, and correcting any obvious errors. Keep the meaning intact.');
  }

  async removeMetadata(text: string): Promise<string> {
    return this.processTextWithChat(text, 'Remove any metadata, headers, footers, and formatting artifacts from this text while preserving its core content.');
  }

  private async processTextWithChat(text: string, instruction: string): Promise<string> {
    return this.chat([{
      role: 'user',
      content: `${instruction}\n\nText:\n${text}`
    }]);
  }

  private splitIntoSentences(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    logger.debug(LogCategory.GROQ_PROCESSING, 'Split text into sentences', {
      sentenceCount: sentences.length,
      averageLength: sentences.reduce((acc, s) => acc + s.length, 0) / sentences.length
    });
    return sentences;
  }

  private createBatches(sentences: string[]): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < sentences.length; i += this.BATCH_SIZE) {
      batches.push(sentences.slice(i, i + this.BATCH_SIZE));
    }
    return batches;
  }

  private async processBatch(sentences: string[]): Promise<string> {
    try {
      const messages: ChatMessage[] = [{
        role: 'user',
        content: `Clean and improve the following text, maintaining its meaning but removing any metadata, headers, footers, or formatting artifacts:\n\n${sentences.join(' ')}`
      }];

      logger.debug(LogCategory.GROQ_PROCESSING, 'Sending batch to Groq API', {
        messageCount: messages.length,
        sentenceCount: sentences.length
      });

      const response = await fetch(this.CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Groq API error: ${response.status} - ${response.statusText}${
          errorData ? '\n' + JSON.stringify(errorData, null, 2) : ''
        }`);
      }

      const data = await response.json();
      const cleanedText = data.choices[0]?.message?.content?.trim();

      if (!cleanedText) {
        throw new Error('No response content from Groq');
      }

      logger.debug(LogCategory.GROQ_PROCESSING, 'Received Groq API response', {
        inputLength: sentences.join(' ').length,
        outputLength: cleanedText.length,
        tokensUsed: data.usage?.total_tokens
      });

      return cleanedText;
    } catch (error) {
      logger.error(LogCategory.GROQ_PROCESSING, 'Error processing batch with Groq API', error);
      throw this.formatError(error);
    }
  }

  private formatError(error: unknown): Error {
    if (error instanceof Error) {
      // If it's already an Error instance, return it
      return error;
    }
    // If it's a string or something else, wrap it in an Error
    return new Error(typeof error === 'string' ? error : 'Unknown error occurred');
  }
}

export const groqService = new GroqService(); 