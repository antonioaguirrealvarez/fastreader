import { loggingCore, LogCategory, LogLevel } from '../logging/core';

export const progressLogger = {
  logProgress: (userId: string, fileId: string, progress: number) => {
    loggingCore.log(LogCategory.PROGRESS, 'progress_update', {
      userId,
      fileId,
      progress,
      timestamp: Date.now()
    }, { level: LogLevel.INFO });
  }
}; 