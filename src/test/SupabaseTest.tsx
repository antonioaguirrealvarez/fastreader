import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';

interface TestResult {
  step: string;
  status: 'success' | 'error';
  message: string;
  data?: any;
}

export function SupabaseTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testConnection = async () => {
    if (!isConfigured) {
      addResult({
        step: 'Configuration Check',
        status: 'error',
        message: 'Supabase environment variables are not configured',
      });
      return;
    }

    try {
      const { data, error } = await supabase.from('test').select('*').limit(1);
      
      if (error) throw error;

      addResult({
        step: 'Connection Test',
        status: 'success',
        message: 'Successfully connected to Supabase',
        data,
      });
    } catch (error: any) {
      addResult({
        step: 'Connection Test',
        status: 'error',
        message: error.message,
      });
    }
  };

  // Rest of the component remains exactly the same...
  const testCRUD = async () => {
    if (!isConfigured) return;
    try {
      // Insert
      const { data: insertData, error: insertError } = await supabase
        .from('test')
        .insert([{ name: 'Test Item', description: 'Test Description' }])
        .select();

      if (insertError) throw insertError;

      addResult({
        step: 'Create Operation',
        status: 'success',
        message: 'Successfully inserted test data',
        data: insertData,
      });

      // Read
      const { data: readData, error: readError } = await supabase
        .from('test')
        .select('*')
        .eq('name', 'Test Item')
        .single();

      if (readError) throw readError;

      addResult({
        step: 'Read Operation',
        status: 'success',
        message: 'Successfully read test data',
        data: readData,
      });

      // Update
      const { data: updateData, error: updateError } = await supabase
        .from('test')
        .update({ description: 'Updated Description' })
        .eq('name', 'Test Item')
        .select();

      if (updateError) throw updateError;

      addResult({
        step: 'Update Operation',
        status: 'success',
        message: 'Successfully updated test data',
        data: updateData,
      });

      // Delete
      const { error: deleteError } = await supabase
        .from('test')
        .delete()
        .eq('name', 'Test Item');

      if (deleteError) throw deleteError;

      addResult({
        step: 'Delete Operation',
        status: 'success',
        message: 'Successfully deleted test data',
      });

    } catch (error: any) {
      addResult({
        step: 'CRUD Operations',
        status: 'error',
        message: error.message,
      });
    }
  };

  const testAuth = async () => {
    if (!isConfigured) return;
    try {
      const { data: { user }, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123',
      });

      if (error) throw error;

      addResult({
        step: 'Auth Test - Sign Up',
        status: 'success',
        message: 'Successfully created test user',
        data: user,
      });

      // Sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword123',
      });

      if (signInError) throw signInError;

      addResult({
        step: 'Auth Test - Sign In',
        status: 'success',
        message: 'Successfully signed in',
        data: signInData,
      });

    } catch (error: any) {
      addResult({
        step: 'Auth Test',
        status: 'error',
        message: error.message,
      });
    }
  };

  const testAuthenticatedOperations = async () => {
    if (!isConfigured) return;
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        throw new Error('No active session');
      }

      // Try to access protected table
      const { data, error } = await supabase
        .from('protected_test')
        .select('*')
        .limit(1);

      if (error) throw error;

      addResult({
        step: 'Authenticated Operation',
        status: 'success',
        message: 'Successfully accessed protected data',
        data,
      });

    } catch (error: any) {
      addResult({
        step: 'Authenticated Operation',
        status: 'error',
        message: error.message,
      });
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    clearResults();

    await testConnection();
    await testCRUD();
    await testAuth();
    await testAuthenticatedOperations();

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Supabase Integration Tests</h1>
          <p className="text-gray-600">
            Run various tests to verify Supabase integration and functionality.
          </p>
        </div>

        {!isConfigured && (
          <Banner
            variant="error"
            title="Configuration Error"
            message="Please configure your Supabase environment variables in .env.local"
            className="mb-6"
          />
        )}

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex gap-4 mb-6">
              <Button
                variant="primary"
                onClick={runAllTests}
                disabled={isLoading || !isConfigured}
              >
                Run All Tests
              </Button>
              <Button
                variant="secondary"
                onClick={clearResults}
                disabled={isLoading}
              >
                Clear Results
              </Button>
            </div>

            <div className="space-y-4">
              {results.map((result, index) => (
                <Banner
                  key={index}
                  variant={result.status}
                  title={result.step}
                  message={result.message}
                />
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results Log</h2>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96">
              {results.map((result, index) => (
                <div key={index} className="mb-4">
                  <div className={`font-bold ${
                    result.status === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {result.step}
                  </div>
                  <div className="text-gray-300">{result.message}</div>
                  {result.data && (
                    <div className="text-gray-400 text-sm">
                      {JSON.stringify(result.data, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
}