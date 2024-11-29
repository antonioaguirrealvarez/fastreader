export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

export enum LogCategory {
  FILES = 'FILES',
  LIBRARY = 'LIBRARY',
  SPRITZ = 'SPRITZ',
  PROGRESS = 'PROGRESS',
  AUTH = 'AUTH',
  READER = 'READER'
}

interface LogConfig {
  level: LogLevel;
  enabledCategories: Set<LogCategory>;
  isDevelopment: boolean;
}

class Logger {
  private config: LogConfig = {
    level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.ERROR,
    enabledCategories: new Set(Object.values(LogCategory)),
    isDevelopment: process.env.NODE_ENV === 'development'
  };

  setLevel(level: LogLevel) {
    this.config.level = level;
  }

  enableCategory(category: LogCategory) {
    this.config.enabledCategories.add(category);
  }

  disableCategory(category: LogCategory) {
    this.config.enabledCategories.delete(category);
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    return (
      this.config.level >= level &&
      this.config.enabledCategories.has(category)
    );
  }

  private formatMessage(level: string, category: LogCategory, message: string, data?: any): string {
    return `[${new Date().toISOString()}] ${level} [${category}]: ${message}${
      data ? '\nData: ' + JSON.stringify(data, null, 2) : ''
    }`;
  }

  debug(category: LogCategory, message: string, data?: any) {
    if (this.shouldLog(LogLevel.DEBUG, category)) {
      console.debug(this.formatMessage('DEBUG', category, message, data));
    }
  }

  info(category: LogCategory, message: string, data?: any) {
    if (this.shouldLog(LogLevel.INFO, category)) {
      console.info(this.formatMessage('INFO', category, message, data));
    }
  }

  warn(category: LogCategory, message: string, data?: any) {
    if (this.shouldLog(LogLevel.WARN, category)) {
      console.warn(this.formatMessage('WARN', category, message, data));
    }
  }

  error(category: LogCategory, message: string, error?: any, data?: any) {
    if (this.shouldLog(LogLevel.ERROR, category)) {
      console.error(
        this.formatMessage('ERROR', category, message, {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack
          } : error,
          ...data
        })
      );
    }
  }
}

export const logger = new Logger();

// Development helper to expose logger configuration
if (process.env.NODE_ENV === 'development') {
  (window as any).logger = logger;
} 