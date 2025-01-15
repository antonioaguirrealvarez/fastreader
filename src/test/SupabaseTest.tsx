import React, { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { supabase } from '../services/supabase/config';
import { authService } from '../services/supabase/auth.service';
import { loggingCore, LogCategory, LogLevel } from '../services/logging/core';

// Test item interface
interface TestItem {
  id: number;
  created_at: string;
  name: string;
  description: string;
}

// Protected item interface
interface ProtectedItem {
  id: number;
  created_at: string;
  user_id: string;
  content: string;
}

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [testItems, setTestItems] = useState<TestItem[]>([]);
  const [protectedItems, setProtectedItems] = useState<ProtectedItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('Not checked');
  const [testResults, setTestResults] = useState<{[key: string]: {status: string, message: string}}>({});

  // Helper function to update test results
  const updateTestResult = (testName: string, status: string, message: string) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: { status, message }
    }));
  };

  // Test 1: Connection Test
  const testConnection = async () => {
    const operationId = crypto.randomUUID();
    try {
      loggingCore.startOperation(
        LogCategory.DEBUG,
        'test_connection',
        {},
        { level: LogLevel.DEBUG, category: LogCategory.DEBUG }
      );

      const { error: pingError } = await supabase.from('test_table').select('count');
      
      if (pingError) {
        if (pingError.message.includes('connection refused')) {
          throw new Error('Could not connect to Supabase. Please check if the URL is correct and the service is available.');
        }
        if (pingError.message.includes('relation "test_table" does not exist')) {
          throw new Error('Connected to Supabase, but test_table does not exist. Please run the setup SQL.');
        }
        throw pingError;
      }

      setConnectionStatus('success');
      updateTestResult('connection', 'success', 'Successfully connected to Supabase');
      
      loggingCore.endOperation(LogCategory.DEBUG, 'test_connection', operationId, {
        status: 'success'
      });
    } catch (error) {
      setConnectionStatus('error');
      updateTestResult('connection', 'error', `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      loggingCore.log(LogCategory.ERROR, 'test_connection_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Test 2: Read Table
  const testReadTable = async () => {
    const operationId = crypto.randomUUID();
    try {
      loggingCore.startOperation(
        LogCategory.DEBUG,
        'test_read_table',
        {},
        { level: LogLevel.DEBUG, category: LogCategory.DEBUG }
      );

      const { data, error } = await supabase
        .from('test_table')
        .select('*');
      
      if (error) throw error;
      
      setTestItems(data);
      updateTestResult('read', 'success', `Successfully read ${data.length} items`);
      
      loggingCore.endOperation(LogCategory.DEBUG, 'test_read_table', operationId, {
        itemCount: data.length
      });
    } catch (error) {
      updateTestResult('read', 'error', `Failed to read table: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      loggingCore.log(LogCategory.ERROR, 'test_read_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Test 3: CRUD Operations
  const testCRUD = async () => {
    const operationId = crypto.randomUUID();
    try {
      loggingCore.startOperation(
        LogCategory.DEBUG,
        'test_crud',
        {},
        { level: LogLevel.DEBUG, category: LogCategory.DEBUG }
      );

      // Create
      const { data: insertData, error: insertError } = await supabase
        .from('test_table')
        .insert([
          { name: 'Test Item', description: 'Created for testing' }
        ])
        .select();
      
      if (insertError) throw insertError;
      updateTestResult('create', 'success', 'Successfully created item');
      
      // Refresh table display after create
      await testReadTable();

      // Update
      if (insertData?.[0]?.id) {
        const { error: updateError } = await supabase
          .from('test_table')
          .update({ description: 'Updated description' })
          .eq('id', insertData[0].id);
        
        if (updateError) throw updateError;
        updateTestResult('update', 'success', 'Successfully updated item');
        
        // Refresh table display after update
        await testReadTable();

        // Delete
        const { error: deleteError } = await supabase
          .from('test_table')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) throw deleteError;
        updateTestResult('delete', 'success', 'Deleted item');
        
        // Refresh table display after delete
        await testReadTable();
      }

      loggingCore.endOperation(LogCategory.DEBUG, 'test_crud', operationId, {
        success: true
      });
    } catch (error) {
      updateTestResult('crud', 'error', `CRUD operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      loggingCore.log(LogCategory.ERROR, 'test_crud_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Test 4: Authentication
  const testAuth = async () => {
    const operationId = crypto.randomUUID();
    try {
      loggingCore.startOperation(
        LogCategory.DEBUG,
        'test_auth',
        {},
        { level: LogLevel.DEBUG, category: LogCategory.DEBUG }
      );

      const data = await authService.signInWithEmail('test@example.com', 'testpassword123');
      setUser(data.user);
      updateTestResult('auth', 'success', 'Successfully authenticated');
      
      loggingCore.endOperation(LogCategory.DEBUG, 'test_auth', operationId, {
        success: true
      });
    } catch (error) {
      updateTestResult('auth', 'error', `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      loggingCore.log(LogCategory.ERROR, 'test_auth_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Test 5: Session Management
  const testSession = async () => {
    const operationId = crypto.randomUUID();
    try {
      loggingCore.startOperation(
        LogCategory.DEBUG,
        'test_session',
        {},
        { level: LogLevel.DEBUG, category: LogCategory.DEBUG }
      );

      const session = await authService.getSession();
      
      if (session) {
        setSessionStatus('Active session found');
        updateTestResult('session', 'success', 'Active session found');
      } else {
        setSessionStatus('No active session');
        updateTestResult('session', 'warning', 'No active session found');
      }

      loggingCore.endOperation(LogCategory.DEBUG, 'test_session', operationId, {
        hasSession: !!session
      });
    } catch (error) {
      updateTestResult('session', 'error', `Session check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      loggingCore.log(LogCategory.ERROR, 'test_session_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Test 6: Protected CRUD Operations
  const testProtectedCRUD = async () => {
    if (!user) {
      updateTestResult('protected', 'error', 'Must be authenticated for protected operations');
      return;
    }

    const operationId = crypto.randomUUID();
    try {
      loggingCore.startOperation(
        LogCategory.DEBUG,
        'test_protected_crud',
        {},
        { level: LogLevel.DEBUG, category: LogCategory.DEBUG }
      );

      // Create protected item
      const { data: insertData, error: insertError } = await supabase
        .from('protected_table')
        .insert([
          { user_id: user.id, content: 'Protected content' }
        ])
        .select();
      
      if (insertError) throw insertError;
      updateTestResult('protected_create', 'success', 'Created protected item');

      // Read protected items
      const { data: readData, error: readError } = await supabase
        .from('protected_table')
        .select('*')
        .eq('user_id', user.id);
      
      if (readError) throw readError;
      setProtectedItems(readData);
      updateTestResult('protected_read', 'success', `Read ${readData.length} protected items`);

      // Cleanup
      if (insertData?.[0]?.id) {
        const { error: deleteError } = await supabase
          .from('protected_table')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) throw deleteError;
        updateTestResult('protected_delete', 'success', 'Deleted protected item');
      }

      loggingCore.endOperation(LogCategory.DEBUG, 'test_protected_crud', operationId, {
        success: true
      });
    } catch (error) {
      updateTestResult('protected', 'error', `Protected operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      loggingCore.log(LogCategory.ERROR, 'test_protected_crud_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Add OAuth sign in function
  const signInWithGoogle = async () => {
    const operationId = crypto.randomUUID();
    try {
      loggingCore.startOperation(
        LogCategory.DEBUG,
        'test_google_signin',
        {},
        { level: LogLevel.DEBUG, category: LogCategory.DEBUG }
      );

      await authService.signInWithProvider('google');
      
      loggingCore.endOperation(LogCategory.DEBUG, 'test_google_signin', operationId, {
        success: true
      });
    } catch (error) {
      updateTestResult('auth', 'error', `Google sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      loggingCore.log(LogCategory.ERROR, 'test_google_signin_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Add sign out function
  const signOut = async () => {
    const operationId = crypto.randomUUID();
    try {
      loggingCore.startOperation(
        LogCategory.DEBUG,
        'test_signout',
        {},
        { level: LogLevel.DEBUG, category: LogCategory.DEBUG }
      );

      await authService.signOut();
      setUser(null);
      updateTestResult('auth', 'success', 'Successfully signed out');
      
      loggingCore.endOperation(LogCategory.DEBUG, 'test_signout', operationId, {
        success: true
      });
    } catch (error) {
      updateTestResult('auth', 'error', `Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      loggingCore.log(LogCategory.ERROR, 'test_signout_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Run initial connection test and set up auth state listener
  useEffect(() => {
    testConnection();
    
    // Set up auth state listener
    const unsubscribe = authService.onAuthStateChange((newUser) => {
      setUser(newUser);
      if (newUser) {
        updateTestResult('auth', 'success', 'Successfully authenticated');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Rest of your component JSX...
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Supabase Integration Tests</h1>

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
            <p className="text-gray-500">Not signed in</p>
            <div className="flex gap-4">
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
              <Button onClick={testAuth} variant="secondary">
                Test Email Auth
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Connection Status */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm
          ${connectionStatus === 'success' ? 'bg-green-100 text-green-800' : 
            connectionStatus === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-gray-100 text-gray-800'}`}>
          {connectionStatus === 'success' ? 'Connected' : 
           connectionStatus === 'error' ? 'Connection Failed' : 
           'Not Connected'}
        </div>
      </Card>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Button onClick={testReadTable}>Test Read Table</Button>
        <Button onClick={testCRUD}>Test CRUD Operations</Button>
        <Button onClick={testSession}>Test Session</Button>
        <Button onClick={testProtectedCRUD} 
          disabled={!user}
          className={!user ? 'opacity-50 cursor-not-allowed' : ''}>
          Test Protected Operations
        </Button>
      </div>

      {/* Test Results */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        <div className="space-y-4">
          {Object.entries(testResults).map(([test, result]) => (
            <div key={test} className="border-b pb-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{test}</span>
                <span className={`px-2 py-1 rounded text-sm
                  ${result.status === 'success' ? 'bg-green-100 text-green-800' : 
                    result.status === 'error' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'}`}>
                  {result.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{result.message}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Data Display */}
      {testItems.length > 0 && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Test Table Items</h2>
          <div className="space-y-2">
            {testItems.map(item => (
              <div key={item.id} className="border-b pb-2">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Protected Items Display */}
      {protectedItems.length > 0 && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Protected Items</h2>
          <div className="space-y-2">
            {protectedItems.map(item => (
              <div key={item.id} className="border-b pb-2">
                <p className="text-sm text-gray-600">{item.content}</p>
                <span className="text-xs text-gray-400">ID: {item.user_id}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}