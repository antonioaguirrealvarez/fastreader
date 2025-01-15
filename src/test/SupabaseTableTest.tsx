import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { loggingCore, LogCategory } from '../services/logging/core';

interface TestResult {
  operation: string;
  status: 'success' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

interface StorageTestResult {
  dbData: any;
  storageData: any;
  error?: string;
}

export function SupabaseTableTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [user, setUser] = useState<User | null>(null);

  // Helper to add test results
  const addResult = (result: TestResult) => {
    console.log(`Test ${result.operation}:`, result);
    setResults(prev => [...prev, result]);
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/supabase-test`
        }
      });

      if (error) throw error;

      addResult({
        operation: 'sign-in',
        status: 'success',
        message: 'Redirecting to Google sign in...',
      });
    } catch (error) {
      addResult({
        operation: 'sign-in',
        status: 'error',
        message: error instanceof Error ? error.message : 'Sign in failed',
      });
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      addResult({
        operation: 'sign-out',
        status: 'success',
        message: 'Successfully signed out',
      });
    } catch (error) {
      addResult({
        operation: 'sign-out',
        status: 'error',
        message: error instanceof Error ? error.message : 'Sign out failed',
      });
    }
  };

  // 1. Test Authentication
  const testAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      setUser(user);
      addResult({
        operation: 'auth-check',
        status: user ? 'success' : 'error',
        message: user ? `Authenticated as ${user.email}` : 'Not authenticated',
        data: { user, session } as Record<string, unknown>
      });
    } catch (error) {
      addResult({
        operation: 'auth-check',
        status: 'error',
        message: error instanceof Error ? error.message : 'Auth check failed',
      });
    }
  };

  // 2. Test Table Structure
  const testTableStructure = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .limit(1);

      if (error) throw error;

      addResult({
        operation: 'table-structure',
        status: 'success',
        message: 'Successfully queried table structure',
        data: { structure: data } as Record<string, unknown>
      });
    } catch (error) {
      addResult({
        operation: 'table-structure',
        status: 'error',
        message: error instanceof Error ? error.message : 'Table structure check failed',
      });
    }
  };

  // 3. Test Specific Column Query
  const testColumnQuery = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('id, user_id, name, timestamp, content, metadata')
        .limit(1);

      if (error) throw error;

      addResult({
        operation: 'column-query',
        status: 'success',
        message: 'Successfully queried specific columns',
        data: { columns: data } as Record<string, unknown>
      });
    } catch (error) {
      addResult({
        operation: 'column-query',
        status: 'error',
        message: error instanceof Error ? error.message : 'Column query failed',
      });
    }
  };

  // 4. Test User-Specific Query
  const testUserQuery = async () => {
    if (!user?.id) {
      addResult({
        operation: 'user-query',
        status: 'error',
        message: 'No authenticated user'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      addResult({
        operation: 'user-query',
        status: 'success',
        message: `Found ${data.length} files for user`,
        data: { files: data } as Record<string, unknown>
      });
    } catch (error) {
      addResult({
        operation: 'user-query',
        status: 'error',
        message: error instanceof Error ? error.message : 'User query failed',
      });
    }
  };

  // 5. Test Insert
  const testInsert = async () => {
    if (!user?.id) {
      addResult({
        operation: 'insert',
        status: 'error',
        message: 'No authenticated user'
      });
      return;
    }

    try {
      const testData = {
        id: Date.now().toString(),
        user_id: user.id,
        name: 'Test File',
        timestamp: Date.now(),
        content: 'Test content',
        metadata: {
          wordCount: 100,
          pageCount: 1,
          progress: 0
        }
      };

      console.log('Attempting to insert:', testData);

      const { data, error } = await supabase
        .from('files')
        .insert(testData)
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      addResult({
        operation: 'insert',
        status: 'success',
        message: 'Successfully inserted test data',
        data: { insertedFile: data[0] } as Record<string, unknown>
      });
    } catch (error) {
      console.error('Insert error details:', error);
      addResult({
        operation: 'insert',
        status: 'error',
        message: error instanceof Error 
          ? `Insert failed: ${error.message}` 
          : 'Insert failed with unknown error',
      });
    }
  };

  const testStorageAccess = async () => {
    if (!user?.id) {
      addResult({
        operation: 'storage-test',
        status: 'error',
        message: 'No authenticated user'
      });
      return;
    }

    const results: StorageTestResult = {
      dbData: null,
      storageData: null
    };

    try {
      // 1. First get file metadata from database
      const { data: dbFiles, error: dbError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (dbError) throw dbError;
      results.dbData = dbFiles;

      if (dbFiles && dbFiles.length > 0) {
        // 2. Try to get the corresponding file from storage
        const filePath = `${user.id}/${dbFiles[0].id}`;
        console.log('Attempting to access storage path:', filePath);

        const { data: storageData, error: storageError } = await supabase.storage
          .from('user-files')
          .download(filePath);

        if (storageError) {
          console.error('Storage error:', storageError);
          throw storageError;
        }

        if (storageData) {
          const content = await storageData.text();
          results.storageData = JSON.parse(content);
        }

        addResult({
          operation: 'storage-test',
          status: 'success',
          message: 'Successfully accessed both database and storage',
          data: {
            databaseRecord: dbFiles[0],
            storageContent: results.storageData,
            testedPath: filePath
          }
        });
      } else {
        addResult({
          operation: 'storage-test',
          status: 'warning',
          message: 'No files found in database to test storage access',
          data: { dbQuery: 'No records found' }
        });
      }
    } catch (error) {
      console.error('Storage test error:', error);
      addResult({
        operation: 'storage-test',
        status: 'error',
        message: error instanceof Error ? error.message : 'Storage test failed',
        data: {
          dbData: results.dbData,
          error: error instanceof Error ? error.message : 'Unknown error',
          storageData: results.storageData
        }
      });
    }
  };

  const testStorageBucketPolicies = async () => {
    try {
      const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets();

      if (bucketsError) throw bucketsError;

      const userFilesBucket = buckets.find(b => b.name === 'user-files');
      
      if (!userFilesBucket) {
        throw new Error('user-files bucket not found');
      }

      // Try to list files in the bucket
      const { data: files, error: listError } = await supabase
        .storage
        .from('user-files')
        .list(user?.id || '', {
          limit: 100,
          offset: 0,
        });

      addResult({
        operation: 'bucket-policy-test',
        status: 'success',
        message: 'Successfully checked bucket policies',
        data: {
          bucketInfo: userFilesBucket,
          filesInBucket: files,
          userFolder: user?.id
        }
      });
    } catch (error) {
      console.error('Bucket policy test error:', error);
      addResult({
        operation: 'bucket-policy-test',
        status: 'error',
        message: error instanceof Error ? error.message : 'Bucket policy test failed',
      });
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Table Test</h1>
      
      {/* Authentication Status */}
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Authentication Status</h2>
        <p>{user ? `Logged in as: ${user.email}` : 'Not logged in'}</p>
        {!user ? (
          <button 
            onClick={signInWithGoogle}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Sign in with Google
          </button>
        ) : (
          <button 
            onClick={signOut}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
          >
            Sign Out
          </button>
        )}
      </div>

      {/* Test Buttons */}
      <div className="space-x-2 mb-4">
        <button 
          onClick={testAuth}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test Auth
        </button>
        {user && (
          <>
            <button 
              onClick={testTableStructure}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Test Table Structure
            </button>
            <button 
              onClick={testColumnQuery}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Test Column Query
            </button>
            <button 
              onClick={testUserQuery}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Test User Query
            </button>
            <button 
              onClick={testInsert}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Test Insert
            </button>
            <button 
              onClick={testStorageAccess}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Test Storage Access
            </button>
            <button 
              onClick={testStorageBucketPolicies}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Test Storage Bucket Policies
            </button>
          </>
        )}
      </div>

      {/* Results Display */}
      <div className="space-y-4">
        {results.map((result, index) => (
          <div 
            key={index}
            className={`p-4 rounded ${
              result.status === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}
          >
            <h3 className="font-bold">{result.operation}</h3>
            <p>{result.message}</p>
            {result.data && (
              <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 