import axios from 'axios';

export interface LogData {
  filename?: string;
  size?: number;
  type?: string;
  method?: string;
  duration?: number;
  wordCount?: number;
  chapterCount?: number;
  error?: string;
  stack?: string;
  progress?: number;
  [key: string]: unknown;
}

export interface LoggerConfig {
  enabled: boolean;
  serverLogging: boolean;
  consoleLogging: boolean;
  logLevels: {
    debug: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;
  };
}

class LoggerService {
  private serverUrl = 'http://localhost:3000/api/logs';
  private config: LoggerConfig = {
    enabled: false, // Master switch
    serverLogging: false, // Send logs to server
    consoleLogging: false, // Console.log logs
    logLevels: {
      debug: false,
      info: false,
      warn: true, // Keep warnings on by default
      error: true  // Keep errors on by default
    }
  };

  configure(newConfig: Partial<LoggerConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      logLevels: {
        ...this.config.logLevels,
        ...(newConfig.logLevels || {})
      }
    };
  }

  async log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: LogData
  ) {
    // Check if logging is enabled and if this level is enabled
    if (!this.config.enabled || !this.config.logLevels[level]) {
      return;
    }

    const logEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Server logging
    if (this.config.serverLogging) {
      try {
        await axios.post(this.serverUrl, logEntry);
      } catch (error) {
        // Only console.error if console logging is enabled
        if (this.config.consoleLogging) {
          console.error('Failed to send log to server:', error);
        }
      }
    }

    // Console logging
    if (this.config.consoleLogging) {
      console.log(
        `[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`,
        data ? '\n' + JSON.stringify(data, null, 2) : ''
      );
    }
  }

  // Specialized logging methods
  async logExtraction(
    type: 'pdf' | 'epub' | 'txt',
    phase: 'start' | 'progress' | 'complete' | 'error',
    data: LogData
  ) {
    await this.log(
      phase === 'error' ? 'error' : 'info',
      `${type.toUpperCase()} extraction ${phase}`,
      data
    );
  }

  async logFileAnalysis(filename: string, content: string) {
    if (!this.config.enabled) return null;

    const analysis = {
      filename,
      wordCount: content.split(/\s+/).length,
      lineCount: content.split('\n').length,
      paragraphCount: content.split(/\n\s*\n/).length,
      timestamp: new Date().toISOString()
    };

    await this.log('info', 'File analysis completed', analysis);
    return analysis;
  }

  // Utility method to get current config
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

export const loggerService = new LoggerService();

// Example usage:
// Turn off all logging
loggerService.configure({
  enabled: false
});

// Enable only error logging to console
loggerService.configure({
  enabled: true,
  serverLogging: false,
  consoleLogging: true,
  logLevels: {
    debug: false,
    info: false,
    warn: false,
    error: true
  }
});

// Enable full logging
loggerService.configure({
  enabled: true,
  serverLogging: true,
  consoleLogging: true,
  logLevels: {
    debug: true,
    info: true,
    warn: true,
    error: true
  }
}); 