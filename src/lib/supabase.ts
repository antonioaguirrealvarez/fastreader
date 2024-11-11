import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const validateSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase configuration missing. Using mock values for development.');
    return {
      url: 'https://mock.supabase.co',
      key: 'mock-key'
    };
  }

  try {
    new URL(url);
    return { url, key };
  } catch (e) {
    console.error('Invalid Supabase URL provided');
    return {
      url: 'https://mock.supabase.co',
      key: 'mock-key'
    };
  }
};

const { url, key } = validateSupabaseConfig();

export const supabase = createClient(url, key);

export const isSupabaseConfigured = () => {
  return (
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://mock.supabase.co'
  );
};