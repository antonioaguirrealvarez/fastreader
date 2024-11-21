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
  signInWithGoogle: async () => {
    const currentUrl = window.location.origin;
    const redirectUrl = currentUrl.includes('localhost') 
      ? 'http://localhost:5173/auth/callback'  // Local development
      : `${currentUrl}/auth/callback`;         // Production

    console.log('Auth redirect URL:', redirectUrl);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      console.log('Sign in response:', { data, error });
      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
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
  },

  // Add method to handle redirect
  handleRedirect: async () => {
    const hash = window.location.hash;
    console.log('Handling redirect with hash:', hash);

    if (hash) {
      const { data, error } = await supabase.auth.getSession();
      console.log('Session after redirect:', { data, error });
      
      // Redirect to library after successful auth
      if (data?.session) {
        window.location.href = '/library';
      }
    }
  }
}; 