import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Get the base URL for redirects based on environment
const getRedirectUrl = (type: 'auth' | 'post-auth' = 'auth') => {
  // In development, use localhost
  const baseUrl = import.meta.env.DEV 
    ? 'http://localhost:5173' 
    : window.location.origin;

  // Return appropriate URL based on type
  if (type === 'post-auth') {
    return `${baseUrl}/library`;
  }
  return `${baseUrl}/auth/callback`;
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key) => globalThis?.localStorage?.getItem(key),
      setItem: (key, value) => globalThis?.localStorage?.setItem(key, value),
      removeItem: (key) => globalThis?.localStorage?.removeItem(key),
    }
  }
});

// Utility function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return (
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== 'https://mock.supabase.co'
  );
};

// Export the getRedirectUrl function for use in other components
export { getRedirectUrl };