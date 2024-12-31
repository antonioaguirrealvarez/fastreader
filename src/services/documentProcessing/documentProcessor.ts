import { pdfExtractor } from '../extractors/pdf/pdfExtractor';
import { epubExtractor } from '../extractors/epub/epubExtractor';
import { logger, LogCategory } from '../utils/logger';
import { ProcessingOptions, ProcessingResult, ProgressCallback, ProcessingStep } from './types';
import { FileType } from '../types/files';
import { textProcessor } from '../textProcessing/textProcessor';
import { loggingCore } from '../logging/core';

export class DocumentProcessor {
  private steps: ProcessingStep[] = [];

  private async executeStep<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const step: ProcessingStep = {
      name,
      startTime: Date.now(),
      endTime: 0,
      status: 'success'
    };

    try {
      const result = await operation();
      step.endTime = Date.now();
      this.steps.push(step);
      return result;
    } catch (error) {
      step.status = 'error';
      step.error = error as Error;
      step.endTime = Date.now();
      this.steps.push(step);
      throw error;
    }
  }

  private getFileType(fileName: string): FileType {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'epub':
        return 'epub';
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  async processDocument(
    file: File,
    options: ProcessingOptions = {},
    onProgress?: ProgressCallback,
    useAI: boolean = false
  ): Promise<ProcessingResult> {
    const operationId = crypto.randomUUID();
    const startTime = Date.now();
    this.steps = [];

    try {
      loggingCore.startOperation(LogCategory.DOCUMENT_PROCESSING, 'process_document', {
        filename: file.name,
        size: file.size,
        useAI,
        options
      }, { operationId });

      // Step 1: Validate file
      await this.executeStep('validation', async () => {
        if (!file) throw new Error('No file provided');
        if (file.size === 0) throw new Error('File is empty');
        const fileType = this.getFileType(file.name);
        if (!['pdf', 'epub'].includes(fileType)) {
          throw new Error('Unsupported file type');
        }
      });

      // Step 2: Extract text
      const extractedText = await this.executeStep('extraction', async () => {
        const fileType = this.getFileType(file.name);
        
        switch (fileType) {
          case 'pdf':
            return await pdfExtractor.extract(file, options, onProgress);
          case 'epub':
            return await epubExtractor.extract(file, options, onProgress);
          default:
            throw new Error(`Unsupported file type: ${fileType}`);
        }
      });

      // Step 3: Optional AI Processing
      const processedText = await this.executeStep('processing', async () => {
        if (useAI) {
          return await textProcessor.processText(extractedText.text);
        }
        return extractedText.text;
      });

      // Step 4: Calculate metadata
      const metadata = await this.executeStep('metadata', async () => ({
        fileType: this.getFileType(file.name),
        fileName: file.name,
        originalSize: file.size,
        wordCount: processedText.split(/\s+/).length,
        pageCount: extractedText.pageCount,
        processedAt: new Date()
      }));

      loggingCore.endOperation(LogCategory.DOCUMENT_PROCESSING, 'process_document', operationId, {
        filename: file.name,
        processingTime: Date.now() - startTime,
        steps: this.steps
      });

      return {
        text: processedText,
        metadata,
        stats: {
          conversionTime: Date.now() - startTime,
          processingSteps: this.steps
        }
      };

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'document_processing_failed', {
        filename: file.name,
        error,
        steps: this.steps,
        operationId
      });
      throw error;
    }
  }
}

export const documentProcessor = new DocumentProcessor(); 