import React, { useState, useRef, useEffect, lazy } from 'react';
import { AuthError, Session, User, Subscription } from '@supabase/supabase-js';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { supabase } from '../lib/supabase/client';
import { loggingCore, LogCategory } from '../services/logging/core';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  content: string;
  url?: string;
}

interface TestResult {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface FileListResponse {
  files: {
    name: string;
    id: string;
    created_at: string;
    updated_at: string;
    last_accessed_at: string;
    metadata: {
      size: number;
      mimetype: string;
    };
  }[];
}

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-block ml-2">
    <span className="cursor-help text-gray-500">ⓘ</span>
    <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-2 text-sm text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
      {text}
    </div>
  </div>
);

export function UploadTest() {
  const [memoryFiles, setMemoryFiles] = useState<UploadedFile[]>([]);
  const [dbFiles, setDbFiles] = useState<UploadedFile[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const memoryTextRef = useRef<HTMLTextAreaElement>(null);
  const dbTextRef = useRef<HTMLTextAreaElement>(null);
  const [supabaseFiles, setSupabaseFiles] = useState<FileListResponse['files']>([]);

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      try {
        const session = await supabase.getSession();
        setUser(session?.user ?? null);
        loggingCore.log(LogCategory.DEBUG, 'session_check', { userId: session?.user?.id });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        loggingCore.log(LogCategory.ERROR, 'session_check_failed', { error: message });
      }
    };

    checkSession();

    // Listen for auth changes
    const subscription = supabase.onAuthStateChange((event: string, session: Session | null) => {
      setUser(session?.user ?? null);
      loggingCore.log(LogCategory.DEBUG, 'auth_state_changed', { event, userId: session?.user?.id });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [result, ...prev].slice(0, 10)); // Keep last 10 results
  };

  // Memory Storage Functions
  const handlePdfMemoryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      addTestResult({ type: 'error', message: 'Please upload a PDF file' });
      return;
    }

    try {
      const content = await readFileAsBase64(file);
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        content
      };
      setMemoryFiles(prev => [...prev, newFile]);
      addTestResult({ type: 'success', message: 'PDF stored in memory' });
    } catch (error) {
      addTestResult({ type: 'error', message: `Failed to store PDF: ${error.message}` });
    }
  };

  const handleTxtMemoryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      addTestResult({ type: 'error', message: 'Please upload a .txt file' });
      return;
    }

    try {
      const content = await readFileAsText(file);
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        type: 'text/plain',
        content
      };
      setMemoryFiles(prev => [...prev, newFile]);
      addTestResult({ type: 'success', message: 'Text file stored in memory' });
    } catch (error) {
      addTestResult({ type: 'error', message: `Failed to store text file: ${error.message}` });
    }
  };

  const handleTextMemoryUpload = () => {
    const content = memoryTextRef.current?.value;
    if (!content) {
      addTestResult({ type: 'error', message: 'Please enter some text' });
      return;
    }

    const newFile: UploadedFile = {
      id: Date.now().toString(),
      name: `text-${new Date().toISOString()}.txt`,
      type: 'text/plain',
      content
    };
    setMemoryFiles(prev => [...prev, newFile]);
    addTestResult({ type: 'success', message: 'Text stored in memory' });
    if (memoryTextRef.current) memoryTextRef.current.value = '';
  };

  // Supabase Storage Functions
  const handlePdfDbUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      addTestResult({ type: 'error', message: 'Please upload a PDF file' });
      return;
    }

    try {
      // Debug auth state before upload
      const session = await debugAuthState();
      if (!session) {
        throw new Error('No active session found. Please sign in again.');
      }

      // Debug storage permissions
      await debugStoragePermissions();

      console.log('Starting PDF upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(`pdfs/${Date.now()}-${file.name}`, file, {
          upsert: true,
          cacheControl: '3600'
        });

      if (error) {
        console.error('Upload error details:', {
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          statusCode: error.statusCode
        });
        throw error;
      }

      console.log('Upload successful:', data);

      const { data: publicUrl } = supabase.storage
        .from('uploads')
        .getPublicUrl(data.path);

      const newFile: UploadedFile = {
        id: data.path,
        name: file.name,
        type: file.type,
        content: '',
        url: publicUrl.publicUrl
      };

      setDbFiles(prev => [...prev, newFile]);
      addTestResult({ type: 'success', message: 'PDF uploaded to Supabase' });
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        `${error.message} ${(error as any).details || ''}` : 
        'Unknown error occurred';
      
      addTestResult({ type: 'error', message: `Failed to upload PDF: ${errorMessage}` });
      console.error('Upload error:', error);
    }
  };

  const handleTxtDbUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      addTestResult({ type: 'error', message: 'Please upload a .txt file' });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(`texts/${Date.now()}-${file.name}`, file);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('uploads')
        .getPublicUrl(data.path);

      const content = await readFileAsText(file);
      const newFile: UploadedFile = {
        id: data.path,
        name: file.name,
        type: 'text/plain',
        content,
        url: publicUrl.publicUrl
      };

      setDbFiles(prev => [...prev, newFile]);
      addTestResult({ type: 'success', message: 'Text file uploaded to Supabase' });
    } catch (error) {
      addTestResult({ type: 'error', message: `Failed to upload text file: ${error.message}` });
    }
  };

  const handleTextDbUpload = async () => {
    const content = dbTextRef.current?.value;
    if (!content) {
      addTestResult({ type: 'error', message: 'Please enter some text' });
      return;
    }

    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const filename = `text-${Date.now()}.txt`;

      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(`texts/${filename}`, blob);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('uploads')
        .getPublicUrl(data.path);

      const newFile: UploadedFile = {
        id: data.path,
        name: filename,
        type: 'text/plain',
        content,
        url: publicUrl.publicUrl
      };

      setDbFiles(prev => [...prev, newFile]);
      addTestResult({ type: 'success', message: 'Text uploaded to Supabase' });
      if (dbTextRef.current) dbTextRef.current.value = '';
    } catch (error) {
      addTestResult({ type: 'error', message: `Failed to upload text: ${error.message}` });
    }
  };

  // Helper functions
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Update auth methods
  const signInWithGoogle = async () => {
    try {
      await supabase.signInWithGoogle();
      loggingCore.log(LogCategory.DEBUG, 'google_signin_initiated');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      loggingCore.log(LogCategory.ERROR, 'google_signin_failed', { error: message });
      throw new Error(`Sign in failed: ${message}`);
    }
  };

  const signOut = async () => {
    try {
      await supabase.signOut();
      setUser(null);
      loggingCore.log(LogCategory.DEBUG, 'signout_success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      loggingCore.log(LogCategory.ERROR, 'signout_failed', { error: message });
      throw new Error(`Sign out failed: ${message}`);
    }
  };

  // Add these debug functions
  const debugAuthState = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('Current session:', session);
    console.log('Session error:', error);
    console.log('Current user:', user);
    return session;
  };

  const debugStoragePermissions = async () => {
    try {
      const { data: bucket, error: bucketError } = await supabase
        .storage
        .getBucket('uploads');
      
      console.log('Bucket info:', bucket);
      console.log('Bucket error:', bucketError);
      
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies', { bucket_id: 'uploads' });
      
      console.log('Storage policies:', policies);
      console.log('Policies error:', policiesError);
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  // Add useEffect to check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      await debugAuthState();
      await debugStoragePermissions();
    };
    
    checkAuth();
  }, []);

  const listSupabaseFiles = async () => {
    try {
      // First check if user is authenticated
      if (!user) {
        addTestResult({ type: 'error', message: 'Must be authenticated to list files' });
        return;
      }

      // Debug storage access
      await debugStoragePermissions();

      const { data, error } = await supabase.storage
        .from('uploads')
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      if (!data) {
        setSupabaseFiles([]);
        addTestResult({ type: 'info', message: 'No files found' });
        return;
      }

      console.log('Files retrieved:', data); // Debug log

      setSupabaseFiles(data);
      addTestResult({ type: 'success', message: `Listed ${data.length} files from Supabase` });
    } catch (error) {
      console.error('File listing error:', error);
      addTestResult({ 
        type: 'error', 
        message: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
      setSupabaseFiles([]); // Reset on error
    }
  };

  const downloadSupabaseFile = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .download(path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addTestResult({ type: 'success', message: 'File downloaded successfully' });
    } catch (error) {
      addTestResult({ 
        type: 'error', 
        message: `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  // Add this useEffect to handle initial file loading
  useEffect(() => {
    if (user) {
      listSupabaseFiles().catch(console.error);
    } else {
      setSupabaseFiles([]); // Reset when not authenticated
    }
  }, [user]);

  // Update file upload methods to use the client's storage methods
  const handleFileUpload = async (file: File, path: string) => {
    try {
      const { data, error } = await supabase.from('uploads').upload(path, file, {
        upsert: true,
        cacheControl: '3600'
      });

      if (error) throw error;

      const { data: publicUrl } = await supabase.from('uploads').getPublicUrl(data.path);

      return { data, publicUrl: publicUrl.publicUrl };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      loggingCore.log(LogCategory.ERROR, 'file_upload_failed', { error: message, path });
      throw new Error(`Upload failed: ${message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Upload Tests</h1>

      {/* Auth Status */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
        {user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {user.user_metadata.avatar_url && (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{user.user_metadata.full_name || user.email}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <Button onClick={signOut} variant="secondary">Sign Out</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-500">Sign in to enable Supabase storage</p>
            <Button onClick={signInWithGoogle} className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </div>
        )}
      </Card>

      {/* Disable Supabase upload sections if not authenticated */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Supabase Storage</h2>
        {!user ? (
          <p className="text-gray-500">Please sign in to use Supabase storage</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">PDF Upload</label>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfDbUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Text File Upload</label>
              <input
                type="file"
                accept=".txt"
                onChange={handleTxtDbUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Text Input</label>
              <textarea
                ref={dbTextRef}
                className="w-full p-2 border rounded-md"
                rows={4}
                placeholder="Enter text for Supabase storage..."
              />
              <Button onClick={handleTextDbUpload} className="mt-2">
                Upload Text
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Memory Storage Section */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">
          Memory Storage (Client-side Only)
          <InfoTooltip text="Files are stored temporarily in your browser's memory and will be lost when you refresh the page. They are never sent to our servers." />
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">PDF Upload (Memory)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={handlePdfMemoryUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Text File Upload (Memory)</label>
            <input
              type="file"
              accept=".txt"
              onChange={handleTxtMemoryUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Text Input (Memory)</label>
            <textarea
              ref={memoryTextRef}
              className="w-full p-2 border rounded-md"
              rows={4}
              placeholder="Enter text for memory storage..."
            />
            <Button onClick={handleTextMemoryUpload} className="mt-2">
              Store in Memory
            </Button>
          </div>
        </div>
      </Card>

      {/* Test Results */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        <div className="space-y-2">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-2 rounded ${
                result.type === 'success' ? 'bg-green-50 text-green-800' :
                result.type === 'error' ? 'bg-red-50 text-red-800' :
                'bg-blue-50 text-blue-800'
              }`}
            >
              {result.message}
            </div>
          ))}
        </div>
      </Card>

      {/* Memory Files Display */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Memory Files</h2>
        <div className="space-y-4">
          {memoryFiles.map(file => (
            <div key={file.id} className="border-b pb-4">
              <h3 className="font-medium">{file.name}</h3>
              <p className="text-sm text-gray-500">{file.type}</p>
              {file.type === 'text/plain' && (
                <pre className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  {file.content}
                </pre>
              )}
              {file.type === 'application/pdf' && (
                <div className="mt-2">
                  <embed
                    src={file.content}
                    type="application/pdf"
                    width="100%"
                    height="500px"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Database Files Display */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Database Files</h2>
        <div className="space-y-4">
          {dbFiles.map(file => (
            <div key={file.id} className="border-b pb-4">
              <h3 className="font-medium">{file.name}</h3>
              <p className="text-sm text-gray-500">{file.type}</p>
              {file.url && (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View File
                </a>
              )}
              {file.type === 'text/plain' && file.content && (
                <pre className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  {file.content}
                </pre>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Supabase Files Management */}
      <Card className="mb-8 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Supabase Files</h2>
          <Button onClick={listSupabaseFiles} variant="secondary">
            Refresh List
          </Button>
        </div>
        <div className="space-y-4">
          {supabaseFiles?.map(file => (
            <div key={file.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-medium">{file.name}</h3>
                <p className="text-sm text-gray-500">
                  Size: {file.metadata && typeof file.metadata.size === 'number' 
                    ? Math.round(file.metadata.size / 1024) 
                    : 'Unknown'} KB • 
                  Type: {file.metadata?.mimetype || 'Unknown'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => downloadSupabaseFile(file.name)}
                  variant="secondary"
                  size="sm"
                >
                  Download
                </Button>
              </div>
            </div>
          ))}
          {supabaseFiles?.length === 0 && (
            <p className="text-gray-500 text-center py-4">No files found</p>
          )}
        </div>
      </Card>
    </div>
  );
} 