export enum LoggingMode {
  VERBOSE = 'VERBOSE',
  MINIMAL = 'MINIMAL'
}

interface LoggingConfig {
  mode: LoggingMode;
}

class LoggingConfigService {
  private config: LoggingConfig = {
    mode: LoggingMode.MINIMAL
  };

  setMode(mode: LoggingMode) {
    this.config.mode = mode;
  }

  shouldLog(category: string, event: string): boolean {
    // Always log errors
    if (category === 'ERROR') return true;

    const minimalEvents = new Set([
      'progress_save_success',
      'progress_save_failed',
      'session_start',
      'session_end',
      'progress_loaded',
      'settings_save_success',
      'settings_save_failed',
      'settings_loaded'
    ]);

    // In minimal mode, only allow specific events
    if (this.config.mode === LoggingMode.MINIMAL) {
      const minimalCategories = new Set(['PROGRESS', 'READING_STATE', 'ERROR', 'SETTINGS']);
      return minimalEvents.has(event) && minimalCategories.has(category);
    }

    // In verbose mode, allow all logs in development
    return process.env.NODE_ENV === 'development';
  }
}

export const loggingConfig = new LoggingConfigService(); 