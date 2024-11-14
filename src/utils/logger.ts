type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  sessionId: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private sessionId: string;

  private constructor() {
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(level: LogLevel, message: string, data?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      sessionId: this.sessionId
    };
    this.logs.push(logEntry);
    console.log(`[${level.toUpperCase()}] ${message}`, data || '');

    // Save to localStorage
    localStorage.setItem('app_logs', JSON.stringify(this.logs));
  }

  downloadLogs() {
    const logContent = this.logs
      .map(entry => `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}\n${
        entry.data ? JSON.stringify(entry.data, null, 2) : ''
      }\n---\n`)
      .join('\n');

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speedreader-logs-${this.sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('app_logs');
  }
}

export const logger = Logger.getInstance(); 