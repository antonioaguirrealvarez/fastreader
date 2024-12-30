import { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { FileMetadata, StoredFile } from '../../types/supabase';
import { loggingCore, LogCategory } from '../../services/logging/core';

export function FileUpload({ userId, onUploadComplete }: {
  userId: string;
  onUploadComplete?: (file: StoredFile) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const processFile = async (file: File): Promise<string> => {
    loggingCore.log(LogCategory.PROCESSING, 'file_processing_started', {
      filename: file.name,
      type: file.type,
      size: file.size
    });

    // Read file content
    const content = await file.text();
    
    // Process content
    const wordCount = content.split(/\s+/).length;
    const lineCount = content.split('\n').length;
    const paragraphCount = content.split(/\n\s*\n/).length;

    loggingCore.log(LogCategory.PROCESSING, 'file_analysis_completed', {
      filename: file.name,
      wordCount,
      lineCount,
      paragraphCount
    });

    return content;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      loggingCore.log(LogCategory.FILE, 'file_upload_started', {
        filename: file.name,
        type: file.type,
        size: file.size
      });

      // Process file content
      const content = await processFile(file);

      // Prepare metadata
      const metadata: FileMetadata = {
        title: file.name,
        size: file.size,
        mimeType: file.type,
        wordCount: content.split(/\s+/).length,
        readingTime: Math.ceil(content.split(/\s+/).length / 200) // Assuming 200 WPM
      };

      // Upload using centralized client
      const response = await supabase.uploadFile(file, metadata, userId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Upload failed');
      }

      loggingCore.log(LogCategory.FILE, 'file_upload_completed', {
        fileId: response.data.id,
        filename: file.name,
        metadata
      });

      onUploadComplete?.(response.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setError(message);
      loggingCore.log(LogCategory.ERROR, 'file_upload_failed', {
        error: message,
        filename: file.name
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        onChange={handleFileUpload}
        disabled={isUploading}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
      {isUploading && (
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Uploading...</div>
          {progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-500">{error}</div>
      )}
    </div>
  );
} 