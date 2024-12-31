export type ProcessingStage = 
  | 'validation'
  | 'extraction'
  | 'chunking'
  | 'cleaning'
  | 'assembly'
  | 'upload';

export interface ProcessingProgress {
  stage: ProcessingStage;
  progress: number;
  details?: string;
}

export interface ProcessingOptions {
  useAI: boolean;
  preserveFormatting?: boolean;
  extractImages?: boolean;
  extractMetadata?: boolean;
  removeHeaders?: boolean;
  removeFooters?: boolean;
  removePageNumbers?: boolean;
  chunkSize?: number;
}

export interface ProcessingResult {
  text: string;
  metadata: DocumentMetadata;
  stats: ProcessingStats;
}

export interface DocumentMetadata {
  fileType: string;
  fileName: string;
  originalSize: number;
  wordCount: number;
  pageCount?: number;
  processedAt: Date;
}

export interface ProcessingStats {
  conversionTime: number;
  processingSteps: ProcessingStep[];
}

export interface ProcessingStep {
  name: string;
  startTime: number;
  endTime: number;
  status: 'success' | 'error';
  error?: Error;
}

export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProcessingError';
  }
} 