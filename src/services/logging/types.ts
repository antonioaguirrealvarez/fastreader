export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  ERROR = 'ERROR'
}

export enum LogCategory {
  PROGRESS = 'PROGRESS',
  ERROR = 'ERROR',
  READING_STATE = 'READING_STATE',
  DISPLAY = 'DISPLAY',
  SUPABASE = 'SUPABASE',
  DEBUG = 'DEBUG',
  SETTINGS = 'SETTINGS'
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  event: string;
  data: unknown;
  sessionId?: string;
  userId?: string;
}

export interface LoggingConfig {
  wordLevelLogging: {
    spritzAnalysis: boolean;
    displayProcessing: boolean;
    readingProgress: boolean;
  };
  // ... other config
} 