import { FileType } from '../types/files';

export interface ProcessingOptions {
  preserveFormatting?: boolean;
  extractImages?: boolean;
  extractMetadata?: boolean;
  removeHeaders?: boolean;
  removeFooters?: boolean;
  removePageNumbers?: boolean;
}

export interface ProcessingResult {
  text: string;
  metadata: DocumentMetadata;
  stats: ProcessingStats;
}

export interface DocumentMetadata {
  fileType: FileType;
  fileName: string;
  originalSize: number;
  pageCount?: number;
  wordCount: number;
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

export type ProgressCallback = (progress: number) => void; 