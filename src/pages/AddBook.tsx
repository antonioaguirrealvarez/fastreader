import React, { useState } from 'react';
import { Header } from '../components/Header';
import { LocalUpload } from '../components/upload/LocalUpload';
import { useLibraryStore } from '../stores/libraryStore';
import { Button } from '../components/ui/Button';
import { BookOpen, Upload, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { loggerService } from '../services/loggerService';
import { Banner } from '../components/ui/Banner';
import { PageBackground } from '../components/ui/PageBackground';

export function AddBook() {
  const addFile = useLibraryStore(state => state.addFile);
  const [textContent, setTextContent] = useState<string>('');
  const [textTitle, setTextTitle] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const handleFileAdded = (file: {
    id: string;
    name: string;
    content: string;
    timestamp: number;
  }) => {
    addFile(file);
  };

  const handleFileUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      
      await loggerService.log('info', 'Starting file processing', {
        fileName: file.name,
        fileSize: file.size,
        originalLength: content.length,
        paragraphCount: content.split('\n\n').length,
        wordCount: content.split(/\s+/).length,
        lineCount: content.split('\n').length,
        timestamp: new Date().toISOString()
      });

      const normalizedContent = content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const analysis = await loggerService.analyzeFile(normalizedContent, file.name);
      
      handleFileAdded({
        id: Date.now().toString(),
        name: file.name,
        content: normalizedContent,
        timestamp: Date.now(),
      });

      await loggerService.log('info', 'File added to library', {
        fileName: file.name,
        fileId: Date.now().toString(),
        analysis
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    };

    reader.readAsText(file);
  };

  const handleTextInput = async () => {
    if (!textContent.trim()) return;
    if (!textTitle.trim()) {
      alert('Please provide a title for your text');
      return;
    }

    const normalizedContent = textContent
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    handleFileAdded({
      id: Date.now().toString(),
      name: textTitle.trim(),
      content: normalizedContent,
      timestamp: Date.now(),
    });

    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

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
                  <h2 className="text-lg font-semibold text-gray-900">Upload Text File</h2>
                  <p className="text-sm text-gray-500">Drag and drop or click to upload</p>
                </div>
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 transition-colors hover:border-gray-300 h-[calc(100%-88px)] flex items-center justify-center">
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center cursor-pointer w-full h-full justify-center"
                >
                  <Upload className="h-12 w-12 text-gray-400 mb-3" />
                  <span className="text-sm font-medium text-gray-700">Click to upload</span>
                  <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                  <span className="text-xs text-gray-400 mt-2">Only .txt files are supported</span>
                </label>
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
              <li>• Text files should be in plain text format (.txt)</li>
              <li>• Your content is private and secure</li>
            </ul>
          </div>
        </div>
      </main>
    </PageBackground>
  );
}