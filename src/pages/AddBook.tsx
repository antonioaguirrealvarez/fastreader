import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Upload, FileText, AlertCircle, File, Info } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Form, FormField } from '../components/ui/Form';
import { Banner } from '../components/ui/Banner';

export function AddBook() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && text) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-6xl mx-auto">
          {showSuccess && (
            <Banner
              variant="success"
              title="Book added successfully!"
              message="Your book has been added to your library."
              className="mb-6"
              onClose={() => setShowSuccess(false)}
            />
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Book</h1>
            <p className="text-gray-600">Import your content by uploading a file or pasting text directly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - File Upload */}
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload File</h2>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Drag and drop your file here, or</p>
                  <Button variant="secondary">Choose File</Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Supported Formats</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Text Files</p>
                      <p className="text-sm text-gray-600">.txt, .rtf, .doc, .docx</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <File className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">E-Books</p>
                      <p className="text-sm text-gray-600">.epub, .pdf, .mobi</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900">Maximum file size: 50MB</p>
                    <p className="text-sm text-blue-700 mt-1">
                      For larger files, please split them into smaller parts or use the text input option.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Text Input */}
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Manual Input</h2>
                
                <Form onSubmit={handleSubmit}>
                  <FormField
                    label="Title"
                    required
                    error={title ? '' : 'Title is required'}
                  >
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter book title"
                    />
                  </FormField>

                  <FormField
                    label="Text Content"
                    required
                    error={text ? '' : 'Content is required'}
                  >
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Paste your text here..."
                    />
                  </FormField>

                  <div className="flex justify-end mt-6">
                    <Button type="submit" variant="primary" size="lg" className="min-w-[200px]">
                      Add to Library
                    </Button>
                  </div>
                </Form>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}