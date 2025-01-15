import { AuthError, User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from './config';
import { loggingCore, LogCategory } from '../logging/core';

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second
const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

async function retry<T>(
  operation: () => Promise<T>,
  operationName: string,
  attempts: number = RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> {
  const operationId = crypto.randomUUID();
  
  try {
    loggingCore.startOperation(LogCategory.DEBUG, operationName, {
      attempt: RETRY_ATTEMPTS - attempts + 1,
      maxAttempts: RETRY_ATTEMPTS
    }, { operationId });

    const result = await operation();

    loggingCore.endOperation(LogCategory.DEBUG, operationName, operationId, {
      success: true
    });

    return result;
  } catch (error) {
    loggingCore.log(LogCategory.ERROR, `${operationName}_failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      attempt: RETRY_ATTEMPTS - attempts + 1,
      operationId
    });

    if (attempts <= 1) throw error;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(operation, operationName, attempts - 1, delay * 2);
  }
}

export const authService = {
  getCurrentUser: async () => {
    return retry(
      async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
      },
      'get_current_user'
    );
  },

  getSession: async () => {
    return retry(
      async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
      },
      'get_session'
    );
  },

  signInWithEmail: async (email: string, password: string) => {
    return retry(
      async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        return data;
      },
      'sign_in_email'
    );
  },

  signInWithProvider: async (provider: Provider) => {
    return retry(
      async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (error) throw error;
        return data;
      },
      'sign_in_provider'
    );
  },

  signUpWithEmail: async (email: string, password: string) => {
    return retry(
      async () => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        return data;
      },
      'sign_up_email'
    );
  },

  signOut: async () => {
    return retry(
      async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      'sign_out'
    );
  },

  onAuthStateChange: (callback: (user: User | null) => void) => {
    let refreshInterval: NodeJS.Timeout;

    const subscription = supabase.auth.onAuthStateChange(async (event, session) => {
      loggingCore.log(LogCategory.DEBUG, 'auth_state_change', {
        event,
        userId: session?.user?.id
      });

      if (session?.user) {
        if (refreshInterval) clearInterval(refreshInterval);

        refreshInterval = setInterval(async () => {
          try {
            const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            
            loggingCore.log(LogCategory.DEBUG, 'token_refresh_success', {
              userId: newSession?.user?.id
            });
          } catch (error) {
            loggingCore.log(LogCategory.ERROR, 'token_refresh_failed', {
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }, TOKEN_REFRESH_INTERVAL);
      } else {
        if (refreshInterval) clearInterval(refreshInterval);
      }

      callback(session?.user ?? null);
    });

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      subscription.unsubscribe();
    };
  },

  handleRedirect: async () => {
    return retry(
      async () => {
        const hash = window.location.hash;
        loggingCore.log(LogCategory.DEBUG, 'handling_auth_redirect', { hash });

        if (hash) {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (data?.session) {
            loggingCore.log(LogCategory.DEBUG, 'redirect_auth_success', {
              userId: data.session.user.id
            });
            window.location.href = '/library';
          }
        }
      },
      'handle_redirect'
    );
  }
}; 