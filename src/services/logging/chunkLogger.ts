import { loggingCore } from './core';
import { LogCategory } from './types';

// Update LogCategory type to include CHUNKED
declare module './types' {
  interface LogCategory {
    CHUNKED: 'CHUNKED';
  }
}

interface ChunkLogData {
  message: string;
  chunkId?: number;
  wordIndex?: number;
  totalWords?: number;
  [key: string]: unknown;
}

export const chunkLogger = {
  logInitialization: (data: any) => { /* ... */ },
  logNavigation: (data: any) => { /* ... */ },
  logPlayback: (data: any) => { /* ... */ },
  error: (error: Error, context?: any) => { /* ... */ },
  // Note: No 'warn' method
}; 