import React, { useState } from 'react';
import { Header } from '../components/Header';
import { useLibraryStore } from '../stores/libraryStore';
import { Button } from '../components/ui/Button';
import { BookOpen, Upload, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { PageBackground } from '../components/ui/PageBackground';
import { pdfExtractor } from '../services/extractors/pdf/pdfExtractor';
import { epubExtractor } from '../services/extractors/epub/epubExtractor';
import { useAuth } from '../contexts/AuthContext';
import { loggingCore, LogCategory } from '../services/logging/core';
import { supabase } from '../lib/supabase/client';
import { FileMetadata } from '../types/supabase';
import { Toggle } from '../components/ui/Toggle';
import { storageService } from '../services/storageService';
import { documentProcessor } from '../services/documentProcessing/documentProcessor';
import { ProcessingError } from '../types/processing';

// Add this type for tracking steps
interface ProcessingStep {
  id: number;
  name: string;
  description: string;
  progress: number;
  status: 'waiting' | 'in-progress' | 'completed' | 'error';
}

export function AddBook() {
  const { user } = useAuth();
  const [textContent, setTextContent] = useState<string>('');
  const [textTitle, setTextTitle] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [useAI, setUseAI] = useState(false);

  // Add state for tracking steps
  const [processingSteps] = useState<ProcessingStep[]>([
    { id: 1, name: 'Loading', description: 'Loading book file', progress: 0, status: 'waiting' },
    { id: 2, name: 'Converting', description: 'Converting to text format', progress: 0, status: 'waiting' },
    { id: 3, name: 'Chunking', description: 'Preparing text for AI processing', progress: 0, status: 'waiting' },
    { id: 4, name: 'Cleaning', description: 'Removing artifacts and metadata', progress: 0, status: 'waiting' },
    { id: 5, name: 'Assembling', description: 'Piecing document together', progress: 0, status: 'waiting' },
    { id: 6, name: 'Uploading', description: 'Saving to your library', progress: 0, status: 'waiting' }
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  
  // Update the progress handler
  const handleProgress = (progress: ProcessingProgress) => {
    setUploadProgress(progress.progress * 100);
    
    // Add debug logging
    loggingCore.log(LogCategory.DEBUG, 'processing_progress', {
      stage: progress.stage,
      progress: progress.progress,
      details: progress.details
    });
    
    // Update current step based on stage
    switch (progress.stage) {
      case 'validation':
        setCurrentStep(1);
        break;
      case 'extraction':
        setCurrentStep(2);
        break;
      case 'chunking':
        setCurrentStep(3);
        break;
      case 'cleaning':
        setCurrentStep(4);
        break;
      case 'assembly':
        setCurrentStep(5);
        break;
      case 'upload':
        setCurrentStep(6);
        break;
    }
  };

  const handleFileAdded = async (content: string, filename: string) => {
    if (!user) {
      setErrorMessage('Please sign in to add files');
      return;
    }

    const normalizedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const analysis = {
      wordCount: normalizedContent.split(/\s+/).length,
      lineCount: normalizedContent.split('\n').length,
      paragraphCount: normalizedContent.split(/\n\s*\n/).length,
      timestamp: new Date().toISOString()
    };

    // Create file metadata
    const metadata: FileMetadata = {
      title: filename,
      word_count: analysis.wordCount,
      reading_time: Math.ceil(analysis.wordCount / 200), // 200 WPM average
      size: new Blob([normalizedContent]).size,
      mime_type: 'text/plain'
    };

    const file = new File(
      [new Blob([normalizedContent], { type: 'text/plain' })],
      filename,
      { type: 'text/plain', lastModified: Date.now() }
    );

    // Upload using centralized client
    const response = await supabase.uploadFile(file, metadata, user.id);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Upload failed');
    }

    loggingCore.log(LogCategory.FILE, 'file_upload_completed', {
      fileId: response.data.id,
      filename,
      metadata,
      analysis
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage('');
    setShowSuccess(false);
    setUploadProgress(0);

    try {
      loggingCore.log(LogCategory.FILE, 'file_upload_started', {
        filename: file.name,
        type: file.type,
        size: file.size,
        useAI
      });

      // Process document using the centralized processor
      const result = await documentProcessor.processDocument(
        file,
        {
          useAI,
          preserveFormatting: true,
          extractImages: false,
          extractMetadata: true,
          removeHeaders: true,
          removeFooters: true,
          removePageNumbers: true
        },
        handleProgress
      );

      // Handle the processed result
      await handleFileAdded(result.text, file.name);

      loggingCore.log(LogCategory.FILE, 'file_processing_completed', {
        filename: file.name,
        metadata: result.metadata,
        stats: result.stats
      });

    } catch (error) {
      const message = error instanceof ProcessingError 
        ? error.message 
        : 'An error occurred while processing the file';
      
      setErrorMessage(message);
      
      loggingCore.log(LogCategory.ERROR, 'file_processing_failed', {
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleTextInput = async () => {
    if (!textContent.trim()) return;
    if (!textTitle.trim()) {
      alert('Please provide a title for your text');
      return;
    }

    await handleFileAdded(textContent, textTitle.trim());
    
    // Clear inputs after successful addition
    setTextContent('');
    setTextTitle('');
  };

  return (
    <PageBackground>
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Banner */}
          {showSuccess && (
            <Banner
              variant="success"
              title="Successfully added to your library!"
              className="mb-6 animate-fade-in"
              onClose={() => setShowSuccess(false)}
            />
          )}

          {/* Error Banner */}
          {errorMessage && (
            <Banner
              variant="error"
              title="Error processing file"
              description={errorMessage}
              className="mb-6 animate-fade-in"
              onClose={() => setErrorMessage('')}
            />
          )}

          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Add to Library</h1>
              <p className="mt-1 text-sm text-gray-500">
                Upload text files or paste content directly to your library
              </p>
            </div>
            <Button 
              variant="primary"
              onClick={() => window.location.href = '/library'}
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Go to Library
            </Button>
          </div>

          {/* Upload Section - Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload Card */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="space-y-6">
                {/* AI Toggle */}
                <div className="border-b pb-4">
                  <Toggle
                    defaultEnabled={useAI}
                    onChange={setUseAI}
                  />
                </div>

                {/* Existing Upload UI */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Upload File</h2>
                    <p className="text-sm text-gray-500">Drag and drop or click to upload</p>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 transition-colors hover:border-gray-300 h-[calc(100%-88px)] flex flex-col">
                  <input
                    type="file"
                    accept=".txt,.pdf,.epub"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`flex-1 flex flex-col items-center cursor-pointer justify-center ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="h-12 w-12 text-gray-400 mb-3" />
                    <span className="text-sm font-medium text-gray-700">
                      {isProcessing ? 'Processing...' : 'Click to upload'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                    <span className="text-xs text-gray-400 mt-2">
                      Supported formats: .txt, .pdf, .epub
                    </span>
                  </label>

                  {/* Enhanced Progress Indicator */}
                  {isProcessing && (
                    <div className="space-y-3 mt-4">
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>

                      {/* Current Step Display */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                            {currentStep}
                          </span>
                          <span className="font-medium text-gray-700">
                            {processingSteps[currentStep - 1]?.name}
                          </span>
                        </div>
                        <span className="text-gray-500">
                          {Math.round(uploadProgress)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {processingSteps[currentStep - 1]?.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Direct Text Input Card */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Add Text Directly</h2>
                  <p className="text-sm text-gray-500">Type or paste your text below</p>
                </div>
              </div>
              <div className="h-[calc(100%-88px)] flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Enter a title..."
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  className="flex-1 min-h-[400px] p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter your text here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
                <Button 
                  variant="primary"
                  className="flex items-center gap-2"
                  onClick={handleTextInput}
                >
                  <FileText className="h-4 w-4" />
                  Add to Library
                </Button>
              </div>
            </Card>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-4 mt-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Tips</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Files are stored locally in your browser</li>
              <li>• Supported formats: .txt, .pdf, .epub</li>
              <li>• Your content is private and secure</li>
            </ul>
          </div>
        </div>
      </main>
    </PageBackground>
  );
}