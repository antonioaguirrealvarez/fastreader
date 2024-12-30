import { useState } from 'react';
import { supabase } from '../../lib/supabase/client';

export function StorageDiagnostics() {
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const diagnostics = await supabase.testStorageSetup();
      setResults(diagnostics);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Storage Diagnostics</h2>
      <button
        onClick={runDiagnostics}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {isLoading ? 'Running...' : 'Run Diagnostics'}
      </button>

      {results && (
        <div className="mt-4">
          <h3 className="font-medium">Results:</h3>
          <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 