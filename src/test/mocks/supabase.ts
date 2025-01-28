import { vi } from 'vitest';

// Mock Supabase Client
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      createSignedUrl: vi.fn(),
    }),
  },
};

// Mock auth state
export const mockAuthState = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User',
    },
  },
  session: {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() + 3600000, // 1 hour from now
  },
};

// Helper to simulate successful auth
export const mockSuccessfulAuth = () => {
  mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
    data: { session: mockAuthState.session },
    error: null,
  });
  
  mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
    data: { user: mockAuthState.user, session: mockAuthState.session },
    error: null,
  });
};

// Helper to simulate failed auth
export const mockFailedAuth = (errorMessage = 'Invalid credentials') => {
  mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
    data: { user: null, session: null },
    error: { message: errorMessage },
  });
};

// Helper to simulate database operations
export const mockDatabaseOperations = {
  // Settings operations
  mockGetSettings: (settings: any) => {
    mockSupabaseClient.from().select.mockResolvedValueOnce({
      data: [settings],
      error: null,
    });
  },
  mockUpdateSettings: () => {
    mockSupabaseClient.from().update.mockResolvedValueOnce({
      data: null,
      error: null,
    });
  },
  
  // Progress operations
  mockGetProgress: (progress: any) => {
    mockSupabaseClient.from().select.mockResolvedValueOnce({
      data: [progress],
      error: null,
    });
  },
  mockUpdateProgress: () => {
    mockSupabaseClient.from().upsert.mockResolvedValueOnce({
      data: null,
      error: null,
    });
  },
  
  // Book operations
  mockGetBooks: (books: any[]) => {
    mockSupabaseClient.from().select.mockResolvedValueOnce({
      data: books,
      error: null,
    });
  },
  mockAddBook: (book: any) => {
    mockSupabaseClient.from().insert.mockResolvedValueOnce({
      data: [book],
      error: null,
    });
  },
};

// Helper to simulate storage operations
export const mockStorageOperations = {
  mockUploadFile: (path: string) => {
    mockSupabaseClient.storage.from().upload.mockResolvedValueOnce({
      data: { path },
      error: null,
    });
  },
  mockDownloadFile: (blob: Blob) => {
    mockSupabaseClient.storage.from().download.mockResolvedValueOnce({
      data: blob,
      error: null,
    });
  },
};

// Reset all mocks
export const resetSupabaseMocks = () => {
  vi.clearAllMocks();
  Object.values(mockSupabaseClient.auth).forEach(mock => 
    (mock as any).mockReset?.()
  );
  Object.values(mockSupabaseClient.from()).forEach(mock => 
    (mock as any).mockReset?.()
  );
  Object.values(mockSupabaseClient.storage.from()).forEach(mock => 
    (mock as any).mockReset?.()
  );
}; 