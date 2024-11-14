import { supabase } from '../supabase/config';
import { User, AuthError } from '@supabase/supabase-js';

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

export const authService = {
  // Current user
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Session management
  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Sign in methods
  signInWithGoogle: async (redirectTo?: string) => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || `${window.location.origin}/library`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
  },

  signInWithEmail: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  // Sign up
  signUpWithEmail: async (email: string, password: string) => {
    return await supabase.auth.signUp({ email, password });
  },

  // Sign out
  signOut: async () => {
    return await supabase.auth.signOut();
  },

  // Auth state change listener
  onAuthStateChange: (callback: (user: User | null) => void) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  }
}; 