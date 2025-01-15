import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase/config';
import { loggingCore, LogCategory } from '../../services/logging/core';

export default function AuthCallback() {
  const navigate = useNavigate();
  const redirectUrl = import.meta.env.VITE_REDIRECT_URL;

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // First check if we have a session from the URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          loggingCore.log(LogCategory.ERROR, 'auth_callback_session_error', { error: sessionError });
          throw sessionError;
        }

        // If we have a session, redirect to library
        if (session) {
          loggingCore.log(LogCategory.DEBUG, 'auth_callback_success', {
            userId: session.user.id,
            redirectUrl
          });
          
          // Use window.location for hard redirect to ensure clean state
          window.location.href = redirectUrl;
          return;
        }

        // If no session, try to exchange the auth code
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.search);
        
        if (exchangeError) {
          loggingCore.log(LogCategory.ERROR, 'auth_callback_exchange_error', { error: exchangeError });
          throw exchangeError;
        }

        // After successful exchange, redirect
        window.location.href = redirectUrl;
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'auth_callback_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          search: window.location.search,
          hash: window.location.hash
        });
        navigate('/', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, redirectUrl]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
        <p className="text-gray-600">Please wait while we redirect you.</p>
      </div>
    </div>
  );
} 