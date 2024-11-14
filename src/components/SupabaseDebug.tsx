import React from 'react';

export function SupabaseDebug() {
  return (
    <div className="p-4 bg-gray-100 rounded">
      <h2 className="font-bold mb-2">Supabase Configuration</h2>
      <pre className="text-sm">
        URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}{'\n'}
        Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}
      </pre>
    </div>
  );
} 