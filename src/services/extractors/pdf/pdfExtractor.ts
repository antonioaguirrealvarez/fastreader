import { PDFLightExtractor } from './lightExtractor';
import { PDFHeavyExtractor } from './heavyExtractor';
import { ExtractionOptions, ExtractionResult } from '../types';
import { loggerService } from '../../loggerService';
import { convertPDFToEPUB } from './pdfToEpub';
import { epubExtractor } from '../epub/epubExtractor';

export class PDFExtractorService {
  private extractors: {
    light: PDFLightExtractor;
    heavy: PDFHeavyExtractor;
  };

  constructor() {
    this.extractors = {
      light: new PDFLightExtractor(),
      heavy: new PDFHeavyExtractor()
    };
  }

  async extract(
    file: File, 
    options: ExtractionOptions,
    onProgress?: (progress: number) => void
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      loggerService.log('info', 'Starting PDF extraction', {
        filename: file.name,
        mode: options.mode,
        size: file.size
      });

      let result: ExtractionResult;

      if (options.mode === 'epub-convert') {
        // Convert PDF to EPUB and then extract using EPUB heavy extractor
        const epubFile = await convertPDFToEPUB(file, options, onProgress);
        result = await epubExtractor.extract(epubFile, {
          ...options,
          mode: 'heavy' // Force heavy mode for converted EPUBs
        }, onProgress);
      } else {
        const extractor = this.getExtractor(options.mode);
        result = await extractor.extract(file, options, onProgress);
      }

      loggerService.log('info', 'PDF extraction completed', {
        filename: file.name,
        mode: options.mode,
        duration: Date.now() - startTime,
        wordCount: result.metadata?.words
      });

      return result;
    } catch (error) {
      loggerService.log('error', 'PDF extraction failed', {
        filename: file.name,
        mode: options.mode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private getExtractor(mode: string) {
    switch (mode) {
      case 'light':
        return this.extractors.light;
      case 'heavy':
        return this.extractors.heavy;
      default:
        throw new Error(`Unknown extraction mode: ${mode}`);
    }
  }
}

export const pdfExtractor = new PDFExtractorService(); 