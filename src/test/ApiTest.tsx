import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface TestResult {
  endpoint: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
}

export function ApiTest() {
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testEndpoint = async (endpoint: string, options: RequestInit = {}) => {
    try {
      addResult({
        endpoint,
        status: 'pending',
        message: 'Testing endpoint...'
      });

      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      addResult({
        endpoint,
        status: 'success',
        message: 'Request successful',
        data
      });
    } catch (error) {
      addResult({
        endpoint,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const runAllTests = async () => {
    clearResults();
    
    // Add your API endpoints and test cases here
    await testEndpoint('/api/health');
    await testEndpoint('/api/books');
    await testEndpoint('/api/user/profile');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">API Integration Tests</h1>

      {/* Test Controls */}
      <Card className="mb-8 p-6">
        <div className="flex gap-4">
          <Button onClick={runAllTests}>Run All Tests</Button>
          <Button onClick={clearResults} variant="secondary">Clear Results</Button>
        </div>
      </Card>

      {/* Results Display */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="border-b pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{result.endpoint}</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  result.status === 'success' ? 'bg-green-100 text-green-800' :
                  result.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {result.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">{result.message}</p>
              {result.data && (
                <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {results.length === 0 && (
            <p className="text-gray-500 text-center py-4">No tests run yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}