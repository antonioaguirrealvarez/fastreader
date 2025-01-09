import React, { useEffect, useState } from 'react';
import { FullTextReader } from '../components/reader/FullTextReader';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase/client';
import { loggingCore, LogCategory } from '../services/logging/core';
import { progressService } from '../services/database/progress';
import { useReaderStore } from '../stores/readerStore';

const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.`;

// Repeat the text 20 times with section markers
const SAMPLE_TEXT = Array(20).fill(0).map((_, i) => 
  `\n\n=== Section ${i + 1} ===\n\n${LOREM_IPSUM}`
).join('');

export function TestFullText() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState(SAMPLE_TEXT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialProgress, setInitialProgress] = useState<number>(0);
  const { fileId, fileName } = useReaderStore();

  useEffect(() => {
    const loadDocument = async () => {
      if (!user?.id || !fileId) {
        setContent(SAMPLE_TEXT);
        setIsLoading(false);
        return;
      }

      const operationId = crypto.randomUUID();
      setIsLoading(true);
      setError(null);

      try {
        // Load progress first
        const savedProgress = await progressService.getProgress(user.id, fileId);
        if (savedProgress) {
          setInitialProgress(savedProgress.current_word);
        }

        loggingCore.log(LogCategory.PROGRESS, 'progress_loaded', {
          userId: user.id,
          fileId,
          operationId,
          currentWord: savedProgress?.current_word || 0
        });

        // Try to load the file from Supabase
        const file = await supabase.downloadFile(fileId, user.id);
        const documentContent = await file.text();
        setContent(documentContent);

        loggingCore.log(LogCategory.FILE, 'document_loaded', {
          userId: user.id,
          fileId,
          operationId,
          contentLength: documentContent.length
        });

      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'document_load_failed', {
          userId: user.id,
          fileId,
          operationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // If loading fails, use the sample text
        setContent(SAMPLE_TEXT);
        setError('Failed to load document, using sample text instead');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [user?.id, fileId]);

  const handleBackToLibrary = () => {
    navigate('/library');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 fixed top-4 right-4 z-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1">
        <FullTextReader
          content={content}
          initialWpm={300}
          darkMode={false}
          title={fileName || 'Text Reader'}
          onBackToLibrary={handleBackToLibrary}
          fileId={fileId || 'default-test-file'}
          initialProgress={initialProgress}
        />
      </div>
    </div>
  );
} 