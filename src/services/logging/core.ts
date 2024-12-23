import { LogLevel, LogCategory, LogEntry, LogMetadata } from './types';

class LoggingCore {
  private static instance: LoggingCore;
  private isEnabled: boolean = true;
  private logLevels: Set<LogLevel> = new Set(['warn', 'error']);
  private buffer: LogEntry[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  private constructor() {
    if (process.env.NODE_ENV === 'development') {
      this.logLevels.add('debug');
      this.logLevels.add('info');
    }
    this.startBufferFlush();
  }

  static getInstance(): LoggingCore {
    if (!LoggingCore.instance) {
      LoggingCore.instance = new LoggingCore();
    }
    return LoggingCore.instance;
  }

  private startBufferFlush() {
    setInterval(() => this.flushBuffer(), this.FLUSH_INTERVAL);
  }

  private flushBuffer() {
    if (this.buffer.length === 0) return;

    // Group logs by category for better readability
    const groupedLogs = this.buffer.reduce((acc, log) => {
      const category = log.metadata.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(log);
      return acc;
    }, {} as Record<LogCategory, LogEntry[]>);

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      Object.entries(groupedLogs).forEach(([category, logs]) => {
        console.group(`[${category}] Logs`);
        logs.forEach(log => {
          const { level, message, metadata } = log;
          console[level](`[${new Date(metadata.timestamp).toISOString()}] ${message}`, metadata);
        });
        console.groupEnd();
      });
    }

    this.buffer = [];
  }

  log(level: LogLevel, category: LogCategory, message: string, metadata: Partial<LogMetadata> = {}) {
    if (!this.isEnabled || !this.logLevels.has(level)) return;

    const entry: LogEntry = {
      level,
      message,
      metadata: {
        timestamp: Date.now(),
        category,
        ...metadata
      }
    };

    this.buffer.push(entry);

    // Flush immediately for errors or if buffer is full
    if (level === 'error' || this.buffer.length >= this.BUFFER_SIZE) {
      this.flushBuffer();
    }
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  setLogLevels(levels: LogLevel[]) {
    this.logLevels = new Set(levels);
  }
}

export const loggingCore = LoggingCore.getInstance(); 