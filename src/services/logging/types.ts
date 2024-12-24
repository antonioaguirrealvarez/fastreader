export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export enum LogCategory {
  READING_STATE = 'READING_STATE',
  READING_PROGRESS = 'READING_PROGRESS',
  DISPLAY = 'DISPLAY',
  PERFORMANCE = 'PERFORMANCE',
  ERROR = 'ERROR'
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