import React from 'react';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Header() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm z-50 border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-600">SpeedReader</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {user.user_metadata.full_name?.split(' ')[0] || 'Reader'}
                      </span>
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    </div>
                    <button 
                      onClick={() => signOut()}
                      className="text-xs text-gray-500 hover:text-gray-700 text-left"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Button 
                variant="primary"
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-2"
              >
                Sign In/Up
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}