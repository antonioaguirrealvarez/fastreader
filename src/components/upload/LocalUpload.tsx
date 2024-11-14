import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Banner } from '../ui/Banner';

interface UploadedFile {
  id: string;
  name: string;
  content: string;
  timestamp: number;
}

interface LocalUploadProps {
  onFileAdded: (file: UploadedFile) => void;
}

export function LocalUpload({ onFileAdded }: LocalUploadProps) {
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      setErrorMessage('Only .txt files are supported at this time');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      const content = await readFileAsText(file);
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        content,
        timestamp: Date.now(),
      };
      
      onFileAdded(newFile);
      setSuccessMessage(`${file.name} added to library`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Reset input
      event.target.value = '';
    } catch (error) {
      setErrorMessage('Failed to read file');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleTextSubmit = () => {
    const content = textInputRef.current?.value;
    if (!content?.trim()) {
      setErrorMessage('Please enter some text');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const newFile: UploadedFile = {
      id: Date.now().toString(),
      name: `Note ${new Date().toLocaleDateString()}`,
      content: content.trim(),
      timestamp: Date.now(),
    };

    onFileAdded(newFile);
    setSuccessMessage('Text added to library');
    setTimeout(() => setSuccessMessage(''), 3000);

    // Reset input
    if (textInputRef.current) {
      textInputRef.current.value = '';
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <Banner
          variant="success"
          title={successMessage}
          className="animate-fade-in"
        />
      )}
      
      {errorMessage && (
        <Banner
          variant="error"
          title={errorMessage}
          className="animate-fade-in"
        />
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Upload Text File</h2>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors p-4 rounded-lg"
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-600">
                Click or drag a .txt file here
              </span>
              <span className="text-xs text-gray-400">
                Only .txt files are supported
              </span>
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Add Text Directly</h2>
        <div className="space-y-4">
          <textarea
            ref={textInputRef}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={6}
            placeholder="Type or paste your text here..."
          />
          <Button
            onClick={handleTextSubmit}
            className="w-full flex items-center justify-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Add to Library
          </Button>
        </div>
      </Card>
    </div>
  );
} 