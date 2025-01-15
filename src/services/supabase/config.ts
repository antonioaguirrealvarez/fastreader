import { createClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { loggingCore, LogCategory } from '../logging/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log configuration on initialization
loggingCore.log(LogCategory.DEBUG, 'supabase_config_init', {
  url: supabaseUrl,
  hasKey: !!supabaseKey,
  environment: import.meta.env.MODE
});

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Check environment variables.');
}

// Create a single client instance
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Set up auth state change listener
supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
  loggingCore.log(LogCategory.DEBUG, 'auth_state_changed', {
    event,
    userId: session?.user?.id
  });
});

// Export types
export type FileMetadata = {
  title: string;
  author?: string;
  description?: string;
  tags?: string[];
  wordCount?: number;
  readingTime?: number;
  lastReadPosition?: number;
}; 