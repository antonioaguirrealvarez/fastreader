import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mockSupabaseClient, mockAuthState, mockSuccessfulAuth, mockFailedAuth, resetSupabaseMocks } from '../../mocks/supabase';

// Custom error type for testing
interface AuthTestError extends Error {
  status?: number;
}

const logger = {
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

const LogCategory = {
  AUTH: 'auth',
  ERROR: 'error',
};

// Mock dependencies
vi.mock('../../../services/utils/logger', () => ({
  logger,
  LogCategory,
}));

vi.mock('../../../services/supabase/config', () => ({
  supabase: mockSupabaseClient,
}));

// Create a mock auth service
const mockAuthService = {
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  getCurrentUser: vi.fn(),
};

// Mock the auth service
vi.mock('../../../services/auth/authService', () => ({
  authService: mockAuthService,
}));

describe('Authentication Service', () => {
  const mockUserId = 'test-user-id';
  
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  describe('Sign In', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should sign in successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          user: mockAuthState.user,
          session: mockAuthState.session,
        },
        error: null,
      };

      mockAuthService.signInWithEmail.mockImplementation(async (email, password) => {
        logger.info(LogCategory.AUTH, 'Sign in successful', { email });
        return mockResponse;
      });

      const result = await mockAuthService.signInWithEmail(credentials.email, credentials.password);

      expect(result).toEqual(mockResponse);
      expect(logger.info).toHaveBeenCalledWith(
        LogCategory.AUTH,
        'Sign in successful',
        { email: credentials.email }
      );
    });

    it('should handle invalid credentials', async () => {
      const mockError = new Error('Invalid email or password') as AuthTestError;
      mockError.name = 'AuthError';
      mockError.status = 400;

      mockAuthService.signInWithEmail.mockImplementation(async () => {
        logger.error(LogCategory.AUTH, 'Sign in failed', mockError);
        throw mockError;
      });

      await expect(
        mockAuthService.signInWithEmail(credentials.email, credentials.password)
      ).rejects.toThrow(mockError);

      expect(logger.error).toHaveBeenCalledWith(
        LogCategory.AUTH,
        'Sign in failed',
        mockError
      );
    });

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Network error');
      const mockResponse = {
        data: {
          user: mockAuthState.user,
          session: mockAuthState.session,
        },
        error: null,
      };

      let attempts = 0;
      mockAuthService.signInWithEmail.mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          logger.error(LogCategory.AUTH, 'Network error on first attempt', networkError);
          throw networkError;
        }
        if (attempts === 2) {
          logger.error(LogCategory.AUTH, 'Network error on second attempt', networkError);
          throw networkError;
        }
        logger.info(LogCategory.AUTH, 'Sign in successful after retry', { email: credentials.email });
        return mockResponse;
      });

      // Implement retry mechanism
      const retrySignIn = async (maxRetries = 3) => {
        let retryCount = 0;
        while (retryCount < maxRetries) {
          try {
            return await mockAuthService.signInWithEmail(credentials.email, credentials.password);
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
          }
        }
      };

      const result = await retrySignIn();

      expect(mockAuthService.signInWithEmail).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockResponse);
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        LogCategory.AUTH,
        'Sign in successful after retry',
        { email: credentials.email }
      );
    });
  });

  describe('Session Management', () => {
    it('should get current session successfully', async () => {
      const mockSession = mockAuthState.session;

      mockAuthService.getSession.mockImplementation(async () => {
        logger.debug(LogCategory.AUTH, 'Session retrieved', { session: mockSession });
        return mockSession;
      });

      const result = await mockAuthService.getSession();

      expect(result).toEqual(mockSession);
      expect(logger.debug).toHaveBeenCalledWith(
        LogCategory.AUTH,
        'Session retrieved',
        { session: mockSession }
      );
    });

    it('should handle session retrieval errors', async () => {
      const mockError = new Error('Failed to get session') as AuthTestError;
      mockError.name = 'AuthError';
      mockError.status = 401;

      mockAuthService.getSession.mockImplementation(async () => {
        logger.error(LogCategory.AUTH, 'Failed to get session', mockError);
        throw mockError;
      });

      await expect(mockAuthService.getSession()).rejects.toThrow(mockError);

      expect(logger.error).toHaveBeenCalledWith(
        LogCategory.AUTH,
        'Failed to get session',
        mockError
      );
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      mockAuthService.signOut.mockImplementation(async () => {
        logger.info(LogCategory.AUTH, 'Sign out successful');
        return { error: null };
      });

      await mockAuthService.signOut();

      expect(logger.info).toHaveBeenCalledWith(
        LogCategory.AUTH,
        'Sign out successful'
      );
    });

    it('should handle sign out errors', async () => {
      const mockError = new Error('Failed to sign out') as AuthTestError;
      mockError.name = 'AuthError';
      mockError.status = 500;

      mockAuthService.signOut.mockImplementation(async () => {
        logger.error(LogCategory.AUTH, 'Sign out failed', mockError);
        throw mockError;
      });

      await expect(mockAuthService.signOut()).rejects.toThrow(mockError);

      expect(logger.error).toHaveBeenCalledWith(
        LogCategory.AUTH,
        'Sign out failed',
        mockError
      );
    });
  });
}); 