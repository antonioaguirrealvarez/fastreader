import { createClient } from '@supabase/supabase-js';

// Basic Supabase client setup with environment validation
export const supabase = createClient(url, key);
export const isSupabaseConfigured = () => {
  return (
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://mock.supabase.co'
  );
};