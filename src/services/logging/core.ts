import { LogLevel, LogCategory, LogEntry } from './types';

export { LogLevel, LogCategory };

interface LogOptions {
  level: LogLevel;
  category: LogCategory;
  timestamp?: number;
  correlationId?: string;
  groupId?: string;
}

interface PerformanceMetrics {
  renderTime: number;
  operationDuration?: number;
  memoryUsage?: number;
}

interface LoggingConfig {
  wordLevelLogging: {
    spritzAnalysis: boolean;
    displayProcessing: boolean;
    readingProgress: boolean;
  };
  thresholds: {
    [key in LogCategory]: {
      [key: string]: LogLevel;
    };
  };
}

const DEFAULT_CONFIG: LoggingConfig = {
  wordLevelLogging: {
    spritzAnalysis: false,
    displayProcessing: false,
    readingProgress: false
  },
  thresholds: {
    DISPLAY: {
      word_processing_start: LogLevel.ERROR,
      word_processing_end: LogLevel.ERROR,
      word_render: LogLevel.ERROR
    },
    SPRITZ: {
      analysis: LogLevel.WARN
    },
    READING: {
      word_change: LogLevel.INFO,
      session_start: LogLevel.INFO,
      session_end: LogLevel.INFO
    },
    PROGRESS: {
      sync: LogLevel.DEBUG,
      batch_update: LogLevel.INFO
    }
  }
};

const PRODUCTION_LOG_LEVELS = {
  SESSION: LogLevel.INFO,
  READING: LogLevel.WARN,
  DISPLAY: LogLevel.WARN,
  PROCESSING: LogLevel.ERROR,
  PROGRESS: LogLevel.INFO
};

const DEVELOPMENT_LOG_LEVELS = {
  SESSION: LogLevel.DEBUG,
  READING: LogLevel.DEBUG,
  DISPLAY: LogLevel.DEBUG,
  PROCESSING: LogLevel.DEBUG,
  PROGRESS: LogLevel.DEBUG
};

const LOG_THRESHOLDS = {
  production: {
    DISPLAY: {
      word_processing_start: LogLevel.ERROR,
      word_processing_end: LogLevel.ERROR,
      word_render: LogLevel.ERROR
    },
    SPRITZ: {
      analysis: LogLevel.WARN // Only log special cases
    },
    PROGRESS: {
      sync: LogLevel.DEBUG,
      batch_update: LogLevel.INFO
    }
  },
  development: {
    // ... development levels
  }
} as const;

class LoggingCore {
  private lastLog: Map<string, number>;
  private debounceTime: number;
  private activeGroups: Set<string>;
  private activeOperations: Map<string, {
    startTime: number;
    category: LogCategory;
    operation: string;
  }>;
  private logLevels: Set<LogLevel>;
  private config: LoggingConfig = DEFAULT_CONFIG;
  private lastWordRender: number = 0;
  private readonly WORD_RENDER_INTERVAL = 10;

  constructor() {
    this.lastLog = new Map();
    this.debounceTime = 100; // ms
    this.activeGroups = new Set();
    this.activeOperations = new Map();
    this.logLevels = new Set([LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]);
    if (process.env.NODE_ENV === 'development') {
      this.logLevels.add(LogLevel.DEBUG);
    }
  }

  private collectPerformanceMetrics(): PerformanceMetrics {
    return {
      renderTime: performance.now(),
      memoryUsage: window.performance?.memory?.usedJSHeapSize,
    };
  }

  private shouldLogWordRender(wordIndex: number): boolean {
    return Math.abs(wordIndex - this.lastWordRender) >= this.WORD_RENDER_INTERVAL;
  }

  private shouldLog(category: LogCategory, event: string, level: LogLevel, data?: any): boolean {
    // Special handling for word_render events
    if (category === LogCategory.DISPLAY && event === 'word_render') {
      if (!data?.wordIndex) return false;
      const shouldLog = this.shouldLogWordRender(data.wordIndex);
      if (shouldLog) {
        this.lastWordRender = data.wordIndex;
      }
      return shouldLog;
    }

    // Check word-level logging settings
    if (category === LogCategory.DISPLAY && event.includes('word_processing')) {
      return this.shouldLogWordProcessing();
    }
    
    const threshold = this.config.thresholds[category]?.[event];
    return level >= (threshold ?? LogLevel.INFO);
  }

  shouldLogWord(): boolean {
    return this.config.wordLevelLogging.displayProcessing;
  }

  log(category: LogCategory, event: string, data: unknown, options?: LogOptions) {
    try {
      if (!this.shouldLog(category, event, options?.level ?? LogLevel.INFO, data)) {
        return;
      }

      const timestamp = options?.timestamp || Date.now();
      const level = options?.level || LogLevel.INFO;
      const correlationId = options?.correlationId || crypto.randomUUID();

      // Remove grouping logic, just log directly
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[${level}] ${category}:${event}`,
          {
            ...data,
            _meta: {
              timestamp: new Date(timestamp).toISOString(),
              correlationId
            }
          }
        );
      }

      return {
        timestamp,
        category,
        event,
        data,
        level,
        correlationId
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Logging error:', error);
      }
    }
  }

  startOperation(category: LogCategory, operation: string, data?: unknown, options?: LogOptions) {
    try {
      const groupId = crypto.randomUUID();
      const startTime = performance.now();
      
      this.activeOperations.set(groupId, {
        startTime,
        category,
        operation
      });

      this.log(category, `${operation}_start`, {
        ...data,
        operationId: groupId,
        startTime
      }, { groupId, ...options });

      return groupId;
    } catch (error) {
      // Fail silently but return a valid operation ID
      return crypto.randomUUID();
    }
  }

  endOperation(category: LogCategory, operation: string, groupId: string, data?: unknown) {
    const operationInfo = this.activeOperations.get(groupId);
    if (operationInfo) {
      const duration = performance.now() - operationInfo.startTime;
      this.log(category, `${operation}_end`, {
        ...data,
        operationId: groupId,
        duration
      }, { groupId, level: LogLevel.INFO });
      this.activeOperations.delete(groupId);
    }
  }

  setWordLevelLogging(type: keyof LoggingConfig['wordLevelLogging'], enabled: boolean): void {
    this.config.wordLevelLogging[type] = enabled;
  }

  shouldLogSpritzAnalysis(): boolean {
    return this.config.wordLevelLogging.spritzAnalysis;
  }

  shouldLogWordProcessing(): boolean {
    return this.config.wordLevelLogging.displayProcessing;
  }
}

// Export a singleton instance
export const loggingCore = new LoggingCore(); 