import { loggingCore, LogCategory } from './logging/core';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class GroqService {
  private readonly MODEL = 'llama-3.1-8b-instant';
  private readonly API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly API_KEY = process.env.GROQ_API_KEY || import.meta.env.VITE_GROQ_API_KEY;
  private readonly MAX_CHUNK_SIZE = 8000;
  private readonly EFFECTIVE_CHUNK_SIZE = 7000; // Leave room for prompt
  private readonly RATE_LIMIT_DELAY = 500; // Reduced to 500ms

  async processLargeText(text: string, prompt: string): Promise<string> {
    try {
      const operationId = loggingCore.startOperation(LogCategory.AI_PROCESSING, 'process_large_text', {
        textLength: text.length,
        model: this.MODEL
      });

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
        error
      });
      throw error;
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const operationId = loggingCore.startOperation(LogCategory.AI_PROCESSING, 'groq_chat', {
        messageCount: messages.length,
        model: this.MODEL
      });

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
        if (response.status === 429) {
          throw new Error('Groq API error: 429');
        }
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('No response content from Groq');
      }

      const content = data.choices[0].message.content;
      
      loggingCore.endOperation(LogCategory.AI_PROCESSING, 'groq_chat', operationId, {
        success: true,
        responseLength: content.length
      });

      return content;

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'groq_chat_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private splitIntoChunks(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    const chunks: string[] = [];
    let currentChunk = '';
    const paragraphs = text.split('\n\n');

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= this.EFFECTIVE_CHUNK_SIZE) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    loggingCore.log(LogCategory.AI_PROCESSING, 'chunk_analysis', {
      averageChunkSize: chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length,
      totalChunks: chunks.length
    });

    return chunks;
  }
}

export const groqService = new GroqService(); 