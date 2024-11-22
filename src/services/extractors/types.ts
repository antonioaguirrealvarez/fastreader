import { EPUBMetadata } from '../../types/epub';

export interface ExtractedDocument {
  metadata?: EPUBMetadata;
  chapters: {
    title: string;
    content: string;
    wordCount: number;
  }[];
  totalWordCount: number;
}

export interface ExtractionResult {
  text: string;
  document?: ExtractedDocument;
  metadata?: {
    method: string;
    words: number;
    pages?: number;
    title?: string;
    author?: string;
    [key: string]: unknown;
  };
  performance: {
    duration: number;
    method: string;
    success: boolean;
    error?: string;
  };
}

export interface Extractor {
  name: string;
  supports(filename: string): boolean;
  extract(
    file: File,
    options: ExtractionOptions,
    onProgress?: (progress: number) => void
  ): Promise<ExtractionResult>;
}

export interface ExtractionOptions {
  mode: 'light' | 'heavy' | 'epub-convert';
  preserveFormatting: boolean;
  extractImages: boolean;
  extractMetadata: boolean;
  removeHeaders: boolean;
  removeFooters: boolean;
  removePageNumbers: boolean;
} 