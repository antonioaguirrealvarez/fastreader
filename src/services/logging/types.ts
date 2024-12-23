export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory = 
  | 'SPRITZ'
  | 'READER'
  | 'PERFORMANCE'
  | 'USER_INTERACTION'
  | 'ERROR'
  | 'ANALYTICS'
  | 'FULLTEXT';

export interface LogMetadata {
  timestamp: number;
  category: LogCategory;
  component?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  metadata: LogMetadata;
} 