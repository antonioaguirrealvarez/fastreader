import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.crypto for UUID generation
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    getRandomValues: vi.fn(),
  },
});

// Mock performance.now()
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => 1000),
  },
});

// Mock File API
class MockFile extends File {
  constructor(parts: BlobPart[], filename: string, options?: FilePropertyBag) {
    super(parts, filename, options);
    Object.defineProperty(this, 'size', {
      value: new Blob(parts).size,
    });
    Object.defineProperty(this, 'name', {
      value: filename,
    });
  }
}

// Custom render with providers
const customRender = (ui: React.ReactElement, options = {}) =>
  render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        {children}
      </BrowserRouter>
    ),
    ...options,
  });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Common test data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

// Helper to create File objects for testing
export const createTestFile = (name: string, type: string, content = 'test content') => {
  return new File([content], name, { type });
};

// Helper to wait for promises
export const waitForPromises = () => new Promise(setImmediate);

// Helper to mock PDF file content
export const mockPDFContent = `
This is a test PDF content.
It has multiple lines
and some punctuation marks!
Is this working? Yes, it is.
`;

// Helper to create blob URLs
export const createMockBlobURL = (content: string) => {
  const blob = new Blob([content], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
};

// Helper to cleanup blob URLs
export const cleanupBlobURL = (url: string) => {
  URL.revokeObjectURL(url);
};

// Mock console errors/warnings for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('React does not recognize the') ||
        args[0].includes('Invalid prop'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Create test PDF file
export const createTestPDF = (content: string = 'Test PDF content', name: string = 'test.pdf'): File => {
  return new MockFile([content], name, { type: 'application/pdf' });
};

// Create test EPUB file
export const createTestEPUB = (content: string = 'Test EPUB content', name: string = 'test.epub'): File => {
  return new MockFile([content], name, { type: 'application/epub+zip' });
};

// Create large test file
export const createLargeFile = (sizeInMB: number, type: 'pdf' | 'epub' = 'pdf'): File => {
  const content = 'A'.repeat(sizeInMB * 1024 * 1024); // Convert MB to bytes
  const extension = type === 'pdf' ? 'pdf' : 'epub';
  const mimeType = type === 'pdf' ? 'application/pdf' : 'application/epub+zip';
  return new MockFile([content], `large-file.${extension}`, { type: mimeType });
};

// Mock progress callback
export const createProgressCallback = () => {
  const progress = vi.fn();
  return {
    callback: (p: number) => progress(Math.round(p * 100) / 100), // Round to 2 decimal places
    mock: progress,
  };
};

// Mock logging service
export const mockLoggingService = {
  log: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  startOperation: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
  endOperation: vi.fn(),
};

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
}); 