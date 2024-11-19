import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseKey,
  environment: import.meta.env.MODE
});

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export type FileMetadata = {
  title: string;
  author?: string;
  description?: string;
  tags?: string[];
  wordCount?: number;
  readingTime?: number;
  lastReadPosition?: number;
}; 