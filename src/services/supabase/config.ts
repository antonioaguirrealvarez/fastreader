import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type FileMetadata = {
  title: string;
  author?: string;
  description?: string;
  tags?: string[];
  wordCount?: number;
  readingTime?: number;
  lastReadPosition?: number;
}; 