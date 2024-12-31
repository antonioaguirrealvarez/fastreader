import { loggingCore, LogCategory } from './logging/core';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class GroqService {
  private readonly MODEL = 'llama-3.1-8b-instant';
  private readonly API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly API_KEY = import.meta.env.VITE_GROQ_API_KEY;
  private readonly MAX_CHUNK_SIZE = 8000;
  private readonly EFFECTIVE_CHUNK_SIZE = 7000; // Leave room for prompt
  private readonly RATE_LIMIT_DELAY = 500; // Reduced to 500ms

  async processLargeText(text: string, prompt: string): Promise<string> {
    const operationId = crypto.randomUUID();

    try {
      loggingCore.startOperation(LogCategory.AI_PROCESSING, 'process_large_text', {
        textLength: text.length,
        model: this.MODEL
      }, { operationId });

      // Split text into manageable chunks
      const chunks = this.splitIntoChunks(text);
      
      loggingCore.log(LogCategory.AI_PROCESSING, 'text_chunked', {
        chunkCount: chunks.length,
        operationId
      });

      // Process chunks with rate limiting
      const processedChunks: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        loggingCore.log(LogCategory.AI_PROCESSING, 'processing_chunk', {
          chunkNumber: i + 1,
          totalChunks: chunks.length,
          operationId
        });

        // Add delay between requests
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
        }

        const messages: ChatMessage[] = [{
          role: 'user',
          content: `${prompt}\n\n${chunks[i]}`
        }];

        const processed = await this.chat(messages);
        processedChunks.push(processed);
      }

      // Combine results
      const finalText = processedChunks.join('\n\n');

      loggingCore.endOperation(LogCategory.AI_PROCESSING, 'process_large_text', operationId, {
        originalLength: text.length,
        finalLength: finalText.length,
        chunksProcessed: chunks.length
      });

      return finalText;

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'large_text_processing_failed', {
        error,
        operationId
      });
      throw error;
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const operationId = crypto.randomUUID();

    try {
      loggingCore.startOperation(LogCategory.AI_PROCESSING, 'groq_chat', {
        messageCount: messages.length,
        model: this.MODEL
      }, { operationId });

      if (!this.API_KEY) {
        throw new Error('Groq API key not configured');
      }

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
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
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from Groq');
      }

      loggingCore.endOperation(LogCategory.AI_PROCESSING, 'groq_chat', operationId, {
        messageCount: messages.length,
        responseLength: content.length
      });

      return content;

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'groq_chat_failed', {
        error,
        operationId
      });
      throw error;
    }
  }

  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Split by paragraphs first
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

    for (const paragraph of paragraphs) {
      // If paragraph fits in current chunk
      if ((currentChunk + '\n\n' + paragraph).length <= this.EFFECTIVE_CHUNK_SIZE) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        continue;
      }

      // If current chunk has content, save it
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // If paragraph is larger than chunk size, split it
      if (paragraph.length > this.EFFECTIVE_CHUNK_SIZE) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        let sentenceChunk = '';

        for (const sentence of sentences) {
          if ((sentenceChunk + sentence).length <= this.EFFECTIVE_CHUNK_SIZE) {
            sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
          } else {
            if (sentenceChunk) chunks.push(sentenceChunk);
            sentenceChunk = sentence;
          }
        }

        if (sentenceChunk) {
          currentChunk = sentenceChunk;
        }
      } else {
        currentChunk = paragraph;
      }
    }

    // Add the last chunk if it exists
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    // Log chunk information
    loggingCore.log(LogCategory.AI_PROCESSING, 'chunk_analysis', {
      totalChunks: chunks.length,
      averageChunkSize: chunks.reduce((acc, chunk) => acc + chunk.length, 0) / chunks.length,
      chunkSizes: chunks.map(chunk => chunk.length)
    });

    return chunks;
  }
}

export const groqService = new GroqService(); 