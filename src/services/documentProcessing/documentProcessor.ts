import { pdfExtractor } from '../extractors/pdf/pdfExtractor';
import { epubExtractor } from '../extractors/epub/epubExtractor';
import { textProcessor } from '../textProcessing/textProcessor';
import { loggingCore, LogCategory } from '../logging/core';
import { 
  ProcessingOptions, 
  ProcessingResult, 
  ProcessingError,
  ProcessingProgress,
  ProcessingStep
} from '../../types/processing';

export class DocumentProcessor {
  private steps: ProcessingStep[] = [];

  private async executeStep<T>(
    name: string,
    operation: () => Promise<T>,
    operationId: string
  ): Promise<T> {
    const step: ProcessingStep = {
      name,
      startTime: Date.now(),
      endTime: 0,
      status: 'success'
    };

    try {
      loggingCore.log(LogCategory.DOCUMENT_PROCESSING, `starting_step_${name}`, {
        operationId
      });

      const result = await operation();
      
      step.endTime = Date.now();
      this.steps.push(step);
      
      loggingCore.log(LogCategory.DOCUMENT_PROCESSING, `completed_step_${name}`, {
        operationId,
        duration: step.endTime - step.startTime
      });

      return result;
    } catch (error) {
      step.status = 'error';
      step.error = error as Error;
      step.endTime = Date.now();
      this.steps.push(step);

      loggingCore.log(LogCategory.ERROR, `failed_step_${name}`, {
        operationId,
        error,
        duration: step.endTime - step.startTime
      });

      throw this.wrapError(error);
    }
  }

  private wrapError(error: unknown): ProcessingError {
    if (error instanceof ProcessingError) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new ProcessingError(
      message,
      'PROCESSING_ERROR',
      false,
      error instanceof Error ? error : undefined
    );
  }

  private getFileType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    if (!extension) {
      throw new ProcessingError(
        'Could not determine file type',
        'INVALID_FILE_TYPE',
        false
      );
    }
    return extension;
  }

  async processDocument(
    file: File,
    options: ProcessingOptions = { useAI: false },
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    const operationId = crypto.randomUUID();
    const startTime = Date.now();
    this.steps = [];

    try {
      loggingCore.startOperation(LogCategory.DOCUMENT_PROCESSING, 'process_document', {
        filename: file.name,
        size: file.size,
        options
      }, { operationId });

      // Step 1: Validate file
      await this.executeStep('validation', async () => {
        if (!file) throw new ProcessingError('No file provided', 'NO_FILE', false);
        if (file.size === 0) throw new ProcessingError('File is empty', 'EMPTY_FILE', false);
        
        const fileType = this.getFileType(file.name);
        if (!['pdf', 'epub', 'txt'].includes(fileType)) {
          throw new ProcessingError('Unsupported file type', 'UNSUPPORTED_FILE_TYPE', false);
        }

        onProgress?.({
          stage: 'initialization',
          progress: 0.1,
          details: 'File validation complete'
        });
      }, operationId);

      // Step 2: Extract text
      const extractedText = await this.executeStep('extraction', async () => {
        const fileType = this.getFileType(file.name);
        onProgress?.({
          stage: 'extraction',
          progress: 0.2,
          details: 'Starting text extraction'
        });
        
        let result;
        switch (fileType) {
          case 'pdf':
            result = await pdfExtractor.extract(file, options, progress => {
              onProgress?.({
                stage: 'extraction',
                progress: 0.2 + progress * 0.3,
                details: 'Extracting PDF content'
              });
            });
            break;
          case 'epub':
            result = await epubExtractor.extract(file, options, progress => {
              onProgress?.({
                stage: 'extraction',
                progress: 0.2 + progress * 0.3,
                details: 'Extracting EPUB content'
              });
            });
            break;
          case 'txt':
            result = await this.extractTextFile(file);
            break;
          default:
            throw new ProcessingError(
              'Unsupported file type',
              'UNSUPPORTED_FILE_TYPE',
              false
            );
        }
        return result;
      }, operationId);

      // Step 3: Text processing (AI cleaning or direct use)
      let processedText: string;
      if (options.useAI) {
        processedText = await this.executeStep('cleaning', async () => {
          onProgress?.({
            stage: 'cleaning',
            progress: 0.6,
            details: 'Cleaning extracted text with AI'
          });
          
          const cleaned = await textProcessor.processText(extractedText.text, {
            batchSize: 20,
            cleanupMode: 'aggressive'
          });

          onProgress?.({
            stage: 'cleaning',
            progress: 0.9,
            details: 'AI cleaning completed'
          });

          return cleaned;
        }, operationId);
      } else {
        // If AI is not enabled, use the extracted text directly
        processedText = extractedText.text;
        loggingCore.log(LogCategory.DOCUMENT_PROCESSING, 'skipping_ai_cleaning', {
          operationId,
          reason: 'AI cleaning not enabled'
        });
      }

      // Step 4: Calculate metadata
      const metadata = await this.executeStep('metadata', async () => ({
        fileType: this.getFileType(file.name),
        fileName: file.name,
        originalSize: file.size,
        wordCount: processedText.split(/\s+/).length,
        pageCount: extractedText.pageCount,
        processedAt: new Date()
      }), operationId);

      onProgress?.({
        stage: 'completion',
        progress: 1,
        details: 'Processing complete'
      });

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
      throw this.wrapError(error);
    }
  }

  private async extractTextFile(file: File): Promise<{ text: string; pageCount: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          text: reader.result as string,
          pageCount: 1
        });
      };
      reader.onerror = () => reject(new ProcessingError(
        'Failed to read text file',
        'TEXT_FILE_READ_ERROR',
        true
      ));
      reader.readAsText(file);
    });
  }
}

export const documentProcessor = new DocumentProcessor(); 