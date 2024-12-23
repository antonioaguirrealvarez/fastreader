import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Loader2, MessageSquare, Sparkles, FileText, Upload } from 'lucide-react';
import { logger, LogCategory } from '../utils/logger';
import { groqService } from '../services/groqService';
import { pdfExtractor } from '../services/extractors/pdf/pdfExtractor';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ProcessingLogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'error';
}

export function GroqTest() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Text cleaning state
  const [textToClean, setTextToClean] = useState('');
  const [cleanedText, setCleanedText] = useState('');
  const [isCleaningText, setIsCleaningText] = useState(false);
  const [cleaningError, setCleaningError] = useState<string | null>(null);

  // Metadata removal state
  const [textToProcess, setTextToProcess] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [convertedText, setConvertedText] = useState('');
  const [processedFileText, setProcessedFileText] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingLog, setProcessingLog] = useState<ProcessingLogEntry[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };

    try {
      setIsLoading(true);
      setError(null);
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      // Get response from Groq
      const allMessages = [...messages, userMessage];
      const response = await groqService.chat(allMessages);

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      logger.error(LogCategory.ANALYTICS, 'Error in Groq chat', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanText = async () => {
    if (!textToClean.trim() || isCleaningText) return;

    try {
      setIsCleaningText(true);
      setCleaningError(null);

      const cleaned = await groqService.cleanText(textToClean);
      setCleanedText(cleaned);

    } catch (err) {
      logger.error(LogCategory.ANALYTICS, 'Error in text cleaning', err);
      setCleaningError(err instanceof Error ? err.message : 'Failed to clean text');
    } finally {
      setIsCleaningText(false);
    }
  };

  const handleRemoveMetadata = async () => {
    if (!textToProcess.trim() || isProcessing) return;

    try {
      setIsProcessing(true);
      setProcessingError(null);

      const processed = await groqService.removeMetadata(textToProcess);
      setProcessedText(processed);

    } catch (err) {
      logger.error(LogCategory.ANALYTICS, 'Error in metadata removal', err);
      setProcessingError(err instanceof Error ? err.message : 'Failed to remove metadata');
    } finally {
      setIsProcessing(false);
    }
  };

  const addToLog = (message: string, type: 'info' | 'error' = 'info') => {
    setProcessingLog(prev => [...prev, {
      timestamp: Date.now(),
      message,
      type
    }]);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setConversionError('Only PDF files are supported');
      return;
    }

    setSelectedFile(file);
    setConversionError(null);
    setUploadProgress(0);
    setProcessingLog([]);
    setProcessedFileText('');

    try {
      setIsConverting(true);
      
      addToLog(`Starting PDF extraction for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      logger.info(LogCategory.GROQ_PROCESSING, 'Starting PDF extraction', {
        filename: file.name,
        size: file.size
      });

      // Extract text using the PDF extractor
      const result = await pdfExtractor.extract(file, {
        mode: 'heavy',
        preserveFormatting: true,
        extractImages: false,
        extractMetadata: true,
        removeHeaders: true,
        removeFooters: true,
        removePageNumbers: true
      }, (progress) => {
        setUploadProgress(Math.round(progress * 100));
        if (progress === 1) {
          addToLog('PDF extraction completed');
        }
      });

      setConvertedText(result.text);
      addToLog(`Extracted ${result.text.length} characters of text`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF';
      setConversionError(errorMessage);
      addToLog(errorMessage, 'error');
      logger.error(LogCategory.GROQ_PROCESSING, 'PDF processing failed', error);
    } finally {
      setIsConverting(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleCleanWithAI = async () => {
    if (!convertedText || isConverting) return;

    try {
      setIsConverting(true);
      addToLog('Starting AI cleaning process');

      // Split text into sentences
      addToLog('Splitting text into sentences');
      const sentences = convertedText.match(/[^.!?]+[.!?]+/g) || [convertedText];
      addToLog(`Found ${sentences.length} sentences`);

      // Create batches
      const BATCH_SIZE = 20;
      const batches: string[][] = [];
      for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
        batches.push(sentences.slice(i, i + BATCH_SIZE));
      }
      addToLog(`Created ${batches.length} batches of ${BATCH_SIZE} sentences each`);

      // Process each batch with rate limiting
      const processedBatches: string[] = [];
      for (let i = 0; i < batches.length; i++) {
        addToLog(`Processing batch ${i + 1}/${batches.length}`);
        const batch = batches[i];
        const batchText = batch.join(' ');

        // Add delay between batches to respect rate limits
        if (i > 0) {
          const delaySeconds = 2; // 2 second delay between batches
          addToLog(`Rate limit pause: waiting ${delaySeconds} seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }

        try {
          // Process with Groq
          addToLog(`Sending batch ${i + 1} to Groq (${batchText.length} characters)`);
          const processed = await groqService.processText(batchText);
          processedBatches.push(processed);
          addToLog(`Received cleaned text for batch ${i + 1} (${processed.length} characters)`);
        } catch (error) {
          if (error instanceof Error && error.message.includes('rate_limit_exceeded')) {
            // If we hit rate limit, wait longer and retry
            const retryDelay = 5; // 5 seconds for rate limit retry
            addToLog(`Rate limit reached, waiting ${retryDelay} seconds before retrying...`, 'error');
            await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
            
            // Retry the same batch
            addToLog(`Retrying batch ${i + 1}`);
            i--; // Decrement i to retry the same batch
            continue;
          }
          throw error; // Re-throw other errors
        }
      }

      // Combine results
      const finalText = processedBatches.join(' ');
      addToLog('Combining processed batches');
      addToLog(`Final text length: ${finalText.length} characters (Original: ${convertedText.length} characters)`);
      setProcessedFileText(finalText);

      logger.info(LogCategory.GROQ_PROCESSING, 'AI cleaning completed', {
        originalLength: convertedText.length,
        finalLength: finalText.length,
        batchesProcessed: batches.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clean text with AI';
      setConversionError(errorMessage);
      addToLog(errorMessage, 'error');
      logger.error(LogCategory.GROQ_PROCESSING, 'AI cleaning failed', error);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Chat and Text Cleaning Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chat Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Chat Test</h2>
            </div>
            
            {/* Messages */}
            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white ml-12'
                      : 'bg-gray-100 text-gray-900 mr-12'
                  }`}
                >
                  {message.content}
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  'Send'
                )}
              </Button>
            </form>
          </Card>

          {/* Text Cleaning Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Text Cleaning</h2>
            </div>

            <div className="space-y-4">
              {/* Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text to Clean
                </label>
                <textarea
                  value={textToClean}
                  onChange={(e) => setTextToClean(e.target.value)}
                  placeholder="Paste your text here..."
                  className="w-full h-[200px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  disabled={isCleaningText}
                />
              </div>
              
              {/* Clean Button */}
              <Button
                onClick={handleCleanText}
                disabled={isCleaningText || !textToClean.trim()}
                className="w-full flex items-center justify-center gap-2"
              >
                {isCleaningText ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Clean Text
                  </>
                )}
              </Button>

              {/* Error Message */}
              {cleaningError && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                  {cleaningError}
                </div>
              )}

              {/* Output */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cleaned Text
                </label>
                <div className="w-full h-[200px] p-3 bg-gray-50 border rounded-lg overflow-y-auto">
                  {cleanedText || (
                    <span className="text-gray-400">
                      Cleaned text will appear here...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Metadata Removal Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Text with Metadata</h2>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={textToProcess}
                onChange={(e) => setTextToProcess(e.target.value)}
                placeholder="Paste text with metadata here..."
                className="w-full h-[300px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={isProcessing}
              />

              <Button
                onClick={handleRemoveMetadata}
                disabled={isProcessing || !textToProcess.trim()}
                className="w-full flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Remove Metadata
                  </>
                )}
              </Button>

              {processingError && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                  {processingError}
                </div>
              )}
            </div>
          </Card>

          {/* Output Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Clean Content</h2>
            </div>

            <div className="h-[300px] p-3 bg-gray-50 border rounded-lg overflow-y-auto">
              {processedText || (
                <span className="text-gray-400">
                  Clean content will appear here...
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* File Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">PDF Upload Test</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={isConverting}
                />
              </div>

              {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              {conversionError && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                  {conversionError}
                </div>
              )}

              {selectedFile && (
                <div className="text-sm text-gray-600">
                  Selected file: {selectedFile.name}
                </div>
              )}

              {convertedText && (
                <Button
                  onClick={handleCleanWithAI}
                  disabled={isConverting}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Clean with AI
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>

          {/* Output Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Extracted Text</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Original Text
                </label>
                <div className="h-[200px] p-3 bg-gray-50 border rounded-lg overflow-y-auto font-mono text-sm">
                  {convertedText || (
                    <span className="text-gray-400">
                      Extracted text will appear here...
                    </span>
                  )}
                </div>
              </div>

              {processedFileText && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Cleaned Text
                  </label>
                  <div className="h-[200px] p-3 bg-gray-50 border rounded-lg overflow-y-auto font-mono text-sm">
                    {processedFileText}
                  </div>
                </div>
              )}

              {/* Processing Log */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processing Log
                </label>
                <div className="h-[200px] p-3 bg-gray-50 border rounded-lg overflow-y-auto font-mono text-xs">
                  {processingLog.map((log, index) => (
                    <div key={index} className={`mb-1 ${log.type === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                      [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* API Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">API Information</h2>
          <p className="text-sm text-gray-600">
            This test component uses the Groq API with the following configuration:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
            <li>Model: LLaMA 3.3 70B Versatile</li>
            <li>Temperature: 0.7 (Chat) / 0.3 (Text Processing)</li>
            <li>Max Tokens: 4000</li>
            <li>Batch Size: 20 sentences per request</li>
            <li>API Key Status: {import.meta.env.VITE_GROQ_API_KEY ? 'Set' : 'Not Set'}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
} 