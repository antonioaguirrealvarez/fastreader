export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
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