import React, { useState } from 'react';
import { Header } from '../components/Header';
import { useLibraryStore } from '../stores/libraryStore';
import { Button } from '../components/ui/Button';
import { BookOpen, Upload, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { loggerService } from '../services/loggerService';
import { Banner } from '../components/ui/Banner';
import { PageBackground } from '../components/ui/PageBackground';
import { pdfExtractor } from '../services/extractors/pdf/pdfExtractor';
import { epubExtractor } from '../services/extractors/epub/epubExtractor';
import { Progress } from '../components/ui/Progress';
import { useAuth } from '../contexts/AuthContext';

export function AddBook() {
  const addFile = useLibraryStore(state => state.addFile);
  const { user } = useAuth();
  const [textContent, setTextContent] = useState<string>('');
  const [textTitle, setTextTitle] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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

    await loggerService.log('info', 'File analysis completed', {
      filename,
      ...analysis
    });
    
    await addFile({
      id: Date.now().toString(),
      name: filename,
      content: normalizedContent,
      timestamp: Date.now(),
    }, user.id);

    await loggerService.log('info', 'File added to library', {
      fileName: filename,
      fileId: Date.now().toString(),
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
      await loggerService.log('info', 'File upload started', {
        filename: file.name,
        type: file.type,
        size: file.size
      });

      let text: string;
      const fileType = file.name.split('.').pop()?.toLowerCase();

      switch (fileType) {
        case 'pdf': {
          await loggerService.log('info', 'Starting PDF extraction', { filename: file.name });
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
          });
          text = result.text;
          break;
        }
        case 'epub': {
          await loggerService.log('info', 'Starting EPUB extraction', { filename: file.name });
          const result = await epubExtractor.extract(file, {
            mode: 'heavy',
            preserveFormatting: true,
            extractImages: false,
            extractMetadata: true,
            removeHeaders: true,
            removeFooters: true,
            removePageNumbers: true
          }, (progress) => {
            setUploadProgress(Math.round(progress * 100));
          });
          text = result.text;
          break;
        }
        case 'txt': {
          setUploadProgress(30);
          await loggerService.log('info', 'Starting TXT processing', { filename: file.name });
          const reader = new FileReader();
          text = await new Promise((resolve, reject) => {
            reader.onload = (e) => {
              setUploadProgress(100);
              resolve(e.target?.result as string);
            };
            reader.onerror = reject;
            reader.readAsText(file);
          });
          break;
        }
        default:
          throw new Error('Unsupported file type');
      }

      await handleFileAdded(text, file.name);
      
      await loggerService.log('info', 'File processing completed', {
        filename: file.name,
        contentLength: text.length,
        wordCount: text.split(/\s+/).length
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An error occurred while processing the file';
      setErrorMessage(errorMsg);
      
      await loggerService.log('error', 'File processing failed', {
        filename: file.name,
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      console.error('Error processing file:', error);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setUploadProgress(0), 1000);
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

                {/* Progress Bar */}
                {(isProcessing || uploadProgress > 0) && (
                  <div className="mt-4 w-full">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>{uploadProgress}% complete</span>
                      <span>{isProcessing ? 'Processing...' : 'Ready'}</span>
                    </div>
                  </div>
                )}
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