import { supabase } from '../supabase/config';
import { User, AuthError } from '@supabase/supabase-js';
import { logger, LogCategory } from '../utils/logger';

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second
const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

async function retry<T>(
  operation: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (attempts <= 1) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(operation, attempts - 1, delay * 2); // Exponential backoff
  }
}

export const authService = {
  // Current user with retry
  getCurrentUser: async () => {
    return retry(async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        logger.error(LogCategory.AUTH, 'Failed to get current user', error);
        throw error;
      }
      return user;
    });
  },

  // Session management with retry
  getSession: async () => {
    return retry(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        logger.error(LogCategory.AUTH, 'Failed to get session', error);
        throw error;
      }
      return session;
    });
  },

  // Sign in with retry
  signInWithEmail: async (email: string, password: string) => {
    return retry(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      if (error) {
        logger.error(LogCategory.AUTH, 'Sign in failed', error);
        throw error;
      }
      return data;
    });
  },

  // Sign up with retry
  signUpWithEmail: async (email: string, password: string) => {
    return retry(async () => {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password 
      });
      if (error) {
        logger.error(LogCategory.AUTH, 'Sign up failed', error);
        throw error;
      }
      return data;
    });
  },

  // Sign out with retry
  signOut: async () => {
    return retry(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error(LogCategory.AUTH, 'Sign out failed', error);
        throw error;
      }
    });
  },

  // Enhanced auth state change listener
  onAuthStateChange: (callback: (user: User | null) => void) => {
    let refreshInterval: NodeJS.Timeout;

    const subscription = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info(LogCategory.AUTH, 'Auth state changed', { event });
      
      if (session?.user) {
        // Clear existing interval if any
        if (refreshInterval) clearInterval(refreshInterval);
        
        // Set up token refresh
        refreshInterval = setInterval(async () => {
          try {
            const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            logger.debug(LogCategory.AUTH, 'Token refreshed successfully');
          } catch (error) {
            logger.error(LogCategory.AUTH, 'Token refresh failed', error);
          }
        }, TOKEN_REFRESH_INTERVAL);
      } else {
        // Clear refresh interval on sign out
        if (refreshInterval) clearInterval(refreshInterval);
      }

      callback(session?.user ?? null);
    });

    // Return enhanced unsubscribe function
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      subscription.unsubscribe();
    };
  },

  // Enhanced redirect handler
  handleRedirect: async () => {
    return retry(async () => {
      const hash = window.location.hash;
      logger.debug(LogCategory.AUTH, 'Handling redirect', { hash });

      if (hash) {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          logger.error(LogCategory.AUTH, 'Redirect handling failed', error);
          throw error;
        }
        
        if (data?.session) {
          logger.info(LogCategory.AUTH, 'Successful redirect auth');
          window.location.href = '/library';
        }
      }
    });
  }
}; 