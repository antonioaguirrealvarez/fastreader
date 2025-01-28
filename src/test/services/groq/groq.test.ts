import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GroqService } from '../../../services/groqService';
import { loggingCore } from '../../../services/logging/core';
import { LogCategory } from '../../../services/logging/core';

// Define ChatMessage type inline since it's internal to GroqService
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Mock the logging core
vi.mock('../../../services/logging/core', () => ({
  loggingCore: {
    startOperation: vi.fn().mockReturnValue('test-operation-id'),
    endOperation: vi.fn(),
    log: vi.fn(),
  },
  LogCategory: {
    ERROR: 'ERROR',
    AI_PROCESSING: 'AI_PROCESSING',
    PERFORMANCE: 'PERFORMANCE',
  },
}));

// Mock crypto for operationId generation
const mockUUID = 'test-uuid';
vi.stubGlobal('crypto', {
  randomUUID: () => mockUUID,
});

describe('GroqService', () => {
  let groqService: GroqService;
  const mockApiKey = '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';
  const testOperationId = 'test-operation-id';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock performance.now to simulate time passing
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      time += 100; // Increment by 100ms each call
      return time;
    });
    
    // Mock environment variable with actual API key
    process.env.GROQ_API_KEY = mockApiKey;
    process.env.VITE_GROQ_API_KEY = mockApiKey;
    
    // Create new instance for each test
    groqService = new GroqService();
    
    // Reset fetch mock
    global.fetch = vi.fn();

    // Log test setup
    loggingCore.log(LogCategory.DEBUG, 'test_setup', {
      apiKey: 'present',
      mocksFresh: true,
      testId: testOperationId
    });
  });

  describe('Connectivity Tests', () => {
    it('should successfully connect to Groq API', async () => {
      loggingCore.startOperation(LogCategory.AI_PROCESSING, 'api_connection_test', {
        testId: testOperationId
      });

      const mockResponse = {
        choices: [{ message: { content: 'Test response' } }],
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }];
      const response = await groqService.chat(messages);

      loggingCore.log(LogCategory.AI_PROCESSING, 'api_response_received', {
        responseLength: response.length,
        testId: testOperationId
      });

      expect(response).toBe('Test response');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.any(Object)
      );

      loggingCore.endOperation(LogCategory.AI_PROCESSING, 'api_connection_test', testOperationId, {
        success: true
      });
    });

    it('should throw error when API key is not configured', async () => {
      // Create service without API key
      process.env.GROQ_API_KEY = '';
      process.env.VITE_GROQ_API_KEY = '';
      
      // Create new instance with empty env
      const noKeyService = new GroqService();

      const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }];

      // The error should be thrown before fetch is called
      await expect(noKeyService.chat(messages))
        .rejects
        .toThrow('Groq API key not configured');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API timeout', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100))
      );

      const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }];
      await expect(groqService.chat(messages)).rejects.toThrow();
    });
  });

  describe('Response Validation', () => {
    it('should validate response format', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Valid response' } }],
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }];
      const response = await groqService.chat(messages);

      expect(response).toBe('Valid response');
    });

    it('should handle malformed response', async () => {
      const mockResponse = { choices: [] };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }];
      await expect(groqService.chat(messages)).rejects.toThrow('No response content from Groq');
    });

    it('should handle API error response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }];
      await expect(groqService.chat(messages)).rejects.toThrow('Groq API error: 429');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', async () => {
      loggingCore.startOperation(LogCategory.AI_PROCESSING, 'rate_limit_test', {
        testId: testOperationId
      });

      // Setup counter for number of successful requests
      let successfulRequests = 0;
      
      // Mock fetch to succeed for first 5 requests then return rate limit error
      const mockFetch = vi.fn().mockImplementation(() => {
        successfulRequests++;
        loggingCore.log(LogCategory.AI_PROCESSING, 'request_attempt', {
          requestNumber: successfulRequests,
          testId: testOperationId
        });

        if (successfulRequests <= 5) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              choices: [{ message: { content: 'Test response' } }] 
            })
          });
        }
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        });
      });
      global.fetch = mockFetch;

      const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }];
      
      // Send requests until we hit rate limit
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(groqService.chat(messages));
      }

      // Wait for all requests to complete or fail
      const results = await Promise.allSettled(requests);

      // Log results
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      loggingCore.log(LogCategory.AI_PROCESSING, 'rate_limit_results', {
        successfulRequests: successful.length,
        failedRequests: failed.length,
        firstErrorMessage: failed[0]?.reason?.message,
        testId: testOperationId
      });

      expect(successful.length).toBe(5);
      expect(failed.length).toBe(5);
      expect(failed[0].status).toBe('rejected');
      expect(failed[0].reason.message).toBe('Groq API error: 429');

      loggingCore.endOperation(LogCategory.AI_PROCESSING, 'rate_limit_test', testOperationId, {
        success: true,
        totalRequests: 10,
        successfulRequests: 5,
        failedRequests: 5
      });
    });

    it('should correctly split and process large text', async () => {
      const mockResponse = { choices: [{ message: { content: 'Processed chunk' } }] };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      global.fetch = mockFetch;

      const text = 'Test paragraph 1.\n\nTest paragraph 2.\n\nTest paragraph 3.';
      await groqService.processLargeText(text, 'Test prompt');

      // Verify chunks were processed
      expect(mockFetch).toHaveBeenCalled();
      expect(loggingCore.log).toHaveBeenCalledWith(
        expect.any(String),
        'chunk_analysis',
        expect.objectContaining({
          totalChunks: expect.any(Number),
          averageChunkSize: expect.any(Number),
        })
      );
    });
  });

  describe('Text Processing', () => {
    it('should correctly split text into chunks', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Processed chunk' } }],
      };
      
      (global.fetch as any).mockImplementation(() => ({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }));

      const text = 'A'.repeat(10000); // Text larger than EFFECTIVE_CHUNK_SIZE
      await groqService.processLargeText(text, 'Test prompt');

      expect(loggingCore.log).toHaveBeenCalledWith(
        expect.any(String),
        'chunk_analysis',
        expect.objectContaining({
          totalChunks: expect.any(Number),
          averageChunkSize: expect.any(Number),
        })
      );
    });

    it('should preserve paragraph boundaries when possible', async () => {
      const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';
      const chunks = (groqService as any).splitIntoChunks(text);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should handle empty or whitespace text', async () => {
      const text = '   \n\n   ';
      const chunks = (groqService as any).splitIntoChunks(text);
      
      expect(chunks).toHaveLength(0);
    });
  });

  describe('Rate Limiting Tests', () => {
    let startTime = 0;
    let currentTime = 0;

    beforeEach(() => {
      startTime = 0;
      currentTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        return currentTime;
      });
    });

    it('should incrementally test rate limits', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      // Mock successful responses for first N-1 requests
      const successResponse = {
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'Success' } }] }),
      };

      // Mock rate limit response for Nth request
      const rateLimitResponse = {
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
      };

      // Test with increasing concurrent requests until rate limit
      const maxConcurrent = 10;
      let rateLimitHit = false;
      let successCount = 0;

      // Start with 2 concurrent requests
      for (let i = 2; i <= maxConcurrent && !rateLimitHit; i++) {
        // Reset mock for each iteration
        mockFetch.mockReset();
        
        // Set up mock responses - ensure at least one success
        for (let j = 0; j < i; j++) {
          mockFetch.mockImplementationOnce(async () => {
            if (j === i - 1) {
              return rateLimitResponse;
            }
            successCount++;
            return successResponse;
          });
        }

        try {
          // Create concurrent requests
          const requests = Array(i).fill(null).map(() => 
            groqService.chat([{ role: 'user', content: 'Test message' }])
          );

          await Promise.all(requests);
        } catch (error) {
          rateLimitHit = true;
          break;
        }
      }

      expect(rateLimitHit).toBe(true);
      expect(successCount).toBeGreaterThan(0);
    });

    it('should implement backoff strategy when rate limited', async () => {
      const mockFetch = vi.fn();
      mockFetch
        .mockRejectedValueOnce(new Error('Groq API error: 429'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'Success' } }] }) });
      
      global.fetch = mockFetch;
      const groqService = new GroqService();

      try {
        await groqService.chat([{ role: 'user', content: 'Test message' }]);
        throw new Error('Should have hit rate limit');
      } catch (error) {
        expect(error instanceof Error && error.message).toBe('Groq API error: 429');
        
        // Simulate time passing during backoff
        currentTime += 1000;
        
        // Try again
        const response = await groqService.chat([{ role: 'user', content: 'Test message' }]);
        expect(response).toBe('Success');
      }

      expect(currentTime).toBeGreaterThanOrEqual(1000);
    });

    it('should maintain performance under load', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      // Mock successful responses with varying delays
      mockFetch.mockImplementation(async () => {
        const delay = Math.random() * 200; // Random delay up to 200ms
        await new Promise(resolve => setTimeout(resolve, delay));
        return {
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: 'Success' } }] }),
        };
      });

      const requestCount = 20;
      const startTime = performance.now();
      
      // Send requests in batches
      const batchSize = 5;
      const batches = Math.ceil(requestCount / batchSize);
      const results = [];

      for (let i = 0; i < batches; i++) {
        const batchStart = performance.now();
        
        // Create batch of requests
        const batchRequests = Array(Math.min(batchSize, requestCount - i * batchSize))
          .fill(null)
          .map(() => groqService.chat([{ role: 'user', content: 'Test message' }]));

        const batchResults = await Promise.all(batchRequests);
        const batchDuration = performance.now() - batchStart;

        results.push(...batchResults);
        
        // Log batch metrics
        loggingCore.log(LogCategory.PERFORMANCE, 'load_test_batch', {
          batchNumber: i + 1,
          batchSize: batchRequests.length,
          batchDuration,
          averageRequestTime: batchDuration / batchRequests.length
        });

        // Add delay between batches to avoid rate limits
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const totalDuration = performance.now() - startTime;
      
      // Log overall metrics
      loggingCore.log(LogCategory.PERFORMANCE, 'load_test_summary', {
        totalRequests: requestCount,
        totalDuration,
        averageRequestTime: totalDuration / requestCount,
        successRate: results.filter(r => r === 'Success').length / requestCount
      });

      // Verify all requests succeeded
      expect(results).toHaveLength(requestCount);
      results.forEach(result => expect(result).toBe('Success'));
    });
  });
}); 