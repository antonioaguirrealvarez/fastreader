export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  data?: {
    filename?: string;
    size?: number;
    method?: string;
    chapterIndex?: number;
    wordCount?: number;
    title?: string;
    totalWordCount?: number;
    chapterCount?: number;
    duration?: number;
    error?: string;
    stack?: string;
    [key: string]: any;
  };
} 