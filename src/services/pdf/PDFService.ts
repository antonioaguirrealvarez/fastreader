import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';
import { loggingCore, LogCategory } from '../logging/core';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let isInitialized = false;

export function initializePDFWorker() {
  if (isInitialized) return;
  
  try {
    GlobalWorkerOptions.workerSrc = workerUrl;
    isInitialized = true;
    loggingCore.log(LogCategory.PDF_PROCESSING, 'worker_initialized', {
      workerSrc: workerUrl
    });
  } catch (error) {
    loggingCore.log(LogCategory.ERROR, 'worker_initialization_failed', {
      error
    });
    throw error;
  }
}

// Types
export interface PDFProcessingOptions {
  // ... rest of the code ...
} 