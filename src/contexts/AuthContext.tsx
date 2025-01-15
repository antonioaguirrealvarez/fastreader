import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { loggingCore, LogCategory } from '../services/logging/core';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const session = await supabase.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        loggingCore.log(LogCategory.DEBUG, 'auth_initialized', {
          userId: session?.user?.id,
          event: 'INITIAL_SESSION'
        });
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'auth_initialization_failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      loggingCore.log(LogCategory.DEBUG, 'auth_state_changed', {
        event,
        userId: session?.user?.id
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await supabase.signInWithGoogle();
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'google_signin_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.signOut();
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'signout_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 