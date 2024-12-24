/**
 * @deprecated Use LogLevel from services/logging/core instead.
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

/**
 * @deprecated Use LogCategory from services/logging/core instead.
 */
export enum LogCategory {
  FILES = 'FILES',
  LIBRARY = 'LIBRARY',
  SPRITZ = 'SPRITZ',
  PROGRESS = 'PROGRESS',
  AUTH = 'AUTH',
  READER = 'READER',
  SETTINGS = 'SETTINGS',
  FILE_PROCESSING = 'FILE_PROCESSING',
  ANALYTICS = 'ANALYTICS',
  PERFORMANCE = 'PERFORMANCE'
}

/**
 * @deprecated Use loggingCore from services/logging/core instead.
 */
export const logger = {
  debug: (category: LogCategory, message: string, data?: any) => {
    console.warn('logger is deprecated, use loggingCore instead');
    loggingCore.log(category, message, data, { level: LogLevel.DEBUG });
  },
  info: (category: LogCategory, message: string, data?: any) => {
    console.warn('logger is deprecated, use loggingCore instead');
    loggingCore.log(category, message, data, { level: LogLevel.INFO });
  },
  warn: (category: LogCategory, message: string, data?: any) => {
    console.warn('logger is deprecated, use loggingCore instead');
    loggingCore.log(category, message, data, { level: LogLevel.WARN });
  },
  error: (category: LogCategory, message: string, error?: any, data?: any) => {
    console.warn('logger is deprecated, use loggingCore instead');
    loggingCore.log(category, message, { error, ...data }, { level: LogLevel.ERROR });
  }
}; 