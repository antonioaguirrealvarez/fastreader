import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Loader2, MessageSquare, Sparkles, FileText, Upload } from 'lucide-react';
import { loggingCore, LogCategory } from '../services/logging/core';
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

const WORDS_PER_CHUNK = 3750;
const DELAY_BETWEEN_REQUESTS = 5000; // 5 seconds

// Add a semaphore to prevent simultaneous calls
let isProcessing = false;

const splitTextIntoChunks = (text: string): string[] => {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
    chunks.push(words.slice(i, i + WORDS_PER_CHUNK).join(' '));
  }
  
  return chunks;
};

export function GroqTest() {
  // Chat state
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Text cleaning state
  const [textToClean, setTextToClean] = useState('');
  const [cleanedText, setCleanedText] = useState('');
  const [isCleaningText, setIsCleaningText] = useState(false);
  const [cleaningError, setCleaningError] = useState<string | null>(null);

  // File processing state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [convertedText, setConvertedText] = useState('');
  const [processedFileText, setProcessedFileText] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingLog, setProcessingLog] = useState<ProcessingLogEntry[]>([]);

  // Chapter detection state
  const [chapterText, setChapterText] = useState('');
  const [chapterStructure, setChapterStructure] = useState('');
  const [isAnalyzingChapters, setIsAnalyzingChapters] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [chapterProgress, setChapterProgress] = useState<{
    currentChunk: number;
    totalChunks: number;
    stage: 'extracting' | 'analyzing' | 'finalizing';
  } | null>(null);

  // Chat functionality
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await groqService.chat([...messages, userMessage]);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setError(message);
      loggingCore.log(LogCategory.ERROR, 'groq_test_error', {
        error: message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Text cleaning functionality
  const handleCleanText = async () => {
    if (!textToClean.trim() || isCleaningText) return;

    try {
      setIsCleaningText(true);
      setCleaningError(null);

      const messages: ChatMessage[] = [{
        role: 'user',
        content: `Clean this text by removing any formatting artifacts, fixing spacing issues, and correcting any obvious errors. Keep the meaning intact:

${textToClean}`
      }];

      const cleaned = await groqService.chat(messages);
      setCleanedText(cleaned);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clean text';
      setCleaningError(message);
      loggingCore.log(LogCategory.ERROR, 'text_cleaning_failed', {
        error: message
      });
    } finally {
      setIsCleaningText(false);
    }
  };

  // File processing functionality
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsConverting(true);
    setConversionError(null);
    setUploadProgress(0);
    setProcessingLog([]);

    const addToLog = (message: string, type: 'info' | 'error' = 'info') => {
      setProcessingLog(prev => [...prev, {
        timestamp: Date.now(),
        message,
        type
      }]);
    };

    try {
      // Read file content
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      setConvertedText(text);
      addToLog('File content extracted');

      // Process with AI
      const messages: ChatMessage[] = [{
        role: 'user',
        content: `Clean and improve the following text, maintaining its meaning but removing any metadata, headers, footers, or formatting artifacts:

${text}`
      }];

      addToLog('Starting AI processing');
      const processed = await groqService.chat(messages);
      setProcessedFileText(processed);
      addToLog('AI processing completed');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process file';
      setConversionError(message);
      addToLog(message, 'error');
      loggingCore.log(LogCategory.ERROR, 'file_processing_failed', {
        filename: file.name,
        error: message
      });
    } finally {
      setIsConverting(false);
      setUploadProgress(100);
    }
  };

  // Chapter detection functionality
  const handleChapterDetection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isProcessing) return;

    try {
      isProcessing = true;
      setIsAnalyzingChapters(true);
      setChapterError(null);
      setChapterText('');
      setChapterStructure('');
      setChapterProgress({ currentChunk: 0, totalChunks: 0, stage: 'extracting' });

      // Extract text using PDF extractor
      const extractedText = await pdfExtractor.extract(file, {}, (progress) => {
        setChapterProgress(prev => ({
          ...prev!,
          stage: 'extracting',
          currentChunk: Math.floor(progress * 100)
        }));
      });

      setChapterText(extractedText.text);

      // Split into chunks
      const chunks = splitTextIntoChunks(extractedText.text);
      setChapterProgress({
        currentChunk: 0,
        totalChunks: chunks.length,
        stage: 'analyzing'
      });

      const chapterAnalyses: string[] = [];

      // Process chunks sequentially with delay
      for (let i = 0; i < chunks.length; i++) {
        setChapterProgress(prev => ({
          ...prev!,
          currentChunk: i + 1
        }));

        // Ensure previous request is complete before starting next one
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));

        const chunkStartWord = i * WORDS_PER_CHUNK;
        
        const messages: ChatMessage[] = [{
          role: 'user',
          content: `Analyze this text segment (words ${chunkStartWord} to ${chunkStartWord + WORDS_PER_CHUNK}) and identify any chapters or major sections.
For each potential chapter found:
- Chapter number (if present)
- Chapter title (if present)
- First 5 words of the chapter

Format as a simple list. Only include these structural elements, no content or analysis.

Text to analyze:

${chunks[i]}`
        }];

        const analysis = await groqService.chat(messages);
        chapterAnalyses.push(analysis);
      }

      // Wait before final consolidation
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));

      // Final consolidation with focused prompt
      setChapterProgress(prev => ({
        ...prev!,
        stage: 'finalizing'
      }));

      const combinedAnalysis = chapterAnalyses.join('\n\n=== CHUNK BOUNDARY ===\n\n');

      // Same increased delay before final analysis
      await new Promise(resolve => setTimeout(resolve, 750));

      const finalMessages: ChatMessage[] = [{
        role: 'user',
        content: `Create a unified chapter structure from these analyses.
For each chapter, include only:
- Chapter number (if found)
- Chapter title (if found)
- First 5 words of the chapter

Remove any duplicates and maintain chronological order.

Raw analyses:

${combinedAnalysis}

Provide a clean, numbered list of chapters.`
      }];

      const finalStructure = await groqService.chat(finalMessages);
      setChapterStructure(finalStructure);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze chapters';
      setChapterError(message);
      loggingCore.log(LogCategory.ERROR, 'chapter_analysis_failed', {
        filename: file.name,
        error: message
      });
    } finally {
      isProcessing = false;
      setIsAnalyzingChapters(false);
      setChapterProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Chat Test Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Chat Test</h2>
          
          <div className="mb-4 space-y-4 h-[400px] overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-100 ml-12' 
                    : 'bg-gray-100 mr-12'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">
                    {message.role === 'user' ? 'You' : 'Assistant'}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send
            </Button>
          </form>
        </Card>

        {/* Text Cleaning Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Text Cleaning Test</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Text
              </label>
              <textarea
                value={textToClean}
                onChange={(e) => setTextToClean(e.target.value)}
                className="w-full h-[200px] p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paste text to clean..."
                disabled={isCleaningText}
              />
            </div>

            {cleaningError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                {cleaningError}
              </div>
            )}

            <Button
              onClick={handleCleanText}
              disabled={isCleaningText || !textToClean}
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

            {cleanedText && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cleaned Text
                </label>
                <div className="w-full h-[200px] p-3 bg-gray-50 border rounded-lg overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {cleanedText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* File Processing Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">File Processing Test</h2>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={isConverting}
              />
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center cursor-pointer ${
                  isConverting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="h-12 w-12 text-gray-400 mb-3" />
                <span className="text-sm font-medium text-gray-700">
                  {isConverting ? 'Processing...' : 'Click to upload'}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Supported format: .txt
                </span>
              </label>
            </div>

            {uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
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

            {/* Processing Log */}
            {processingLog.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processing Log
                </label>
                <div className="h-[200px] p-3 bg-gray-50 border rounded-lg overflow-y-auto font-mono text-xs">
                  {processingLog.map((log, index) => (
                    <div
                      key={index}
                      className={`mb-1 ${
                        log.type === 'error' ? 'text-red-600' : 'text-gray-600'
                      }`}
                    >
                      [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {convertedText && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Original Text
                </label>
                <div className="h-[200px] p-3 bg-gray-50 border rounded-lg overflow-y-auto font-mono text-sm">
                  {convertedText}
                </div>
              </div>
            )}

            {processedFileText && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processed Text
                </label>
                <div className="h-[200px] p-3 bg-gray-50 border rounded-lg overflow-y-auto font-mono text-sm">
                  {processedFileText}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Chapter Detection Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Chapter Structure Detection</h2>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
              <input
                type="file"
                accept=".pdf"
                onChange={handleChapterDetection}
                className="hidden"
                id="chapter-file-upload"
                disabled={isAnalyzingChapters}
              />
              <label
                htmlFor="chapter-file-upload"
                className={`flex flex-col items-center cursor-pointer ${
                  isAnalyzingChapters ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FileText className="h-12 w-12 text-gray-400 mb-3" />
                <span className="text-sm font-medium text-gray-700">
                  {isAnalyzingChapters ? 'Analyzing...' : 'Upload PDF for Chapter Analysis'}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Upload a book to detect chapters
                </span>
              </label>
            </div>

            {chapterError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                {chapterError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Original Text */}
              {chapterText && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Book Text
                  </label>
                  <div className="h-[400px] p-3 bg-gray-50 border rounded-lg overflow-y-auto font-mono text-sm">
                    <pre className="whitespace-pre-wrap">
                      {chapterText}
                    </pre>
                  </div>
                </div>
              )}

              {/* Chapter Structure */}
              {chapterStructure && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detected Chapter Structure
                  </label>
                  <div className="h-[400px] p-3 bg-gray-50 border rounded-lg overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {chapterStructure}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {chapterProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    {chapterProgress.stage === 'extracting' ? 'Extracting text...' :
                     chapterProgress.stage === 'analyzing' ? `Analyzing chunk ${chapterProgress.currentChunk} of ${chapterProgress.totalChunks}` :
                     'Finalizing analysis...'}
                  </span>
                  {chapterProgress.stage === 'analyzing' && (
                    <span>
                      {Math.round((chapterProgress.currentChunk / chapterProgress.totalChunks) * 100)}%
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: chapterProgress.stage === 'extracting' 
                        ? `${chapterProgress.currentChunk}%`
                        : chapterProgress.stage === 'analyzing'
                        ? `${(chapterProgress.currentChunk / chapterProgress.totalChunks) * 100}%`
                        : '90%'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* API Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">API Information</h2>
          <p className="text-sm text-gray-600">
            This test component uses the Groq API with the following configuration:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
            <li>Model: LLaMA 3.3 70B Versatile</li>
            <li>Temperature: 0.7</li>
            <li>Max Tokens: 4000</li>
            <li>API Key Status: {import.meta.env.VITE_GROQ_API_KEY ? 'Set' : 'Not Set'}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
} 