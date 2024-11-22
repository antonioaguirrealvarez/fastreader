import { EPUBLightExtractor } from './lightExtractor';
import { EPUBHeavyExtractor } from './heavyExtractor';
import { EpubJsExtractor } from './epubjs';
import { ExtractionOptions, ExtractionResult } from '../types';
import { loggerService } from '../../loggerService';

export class EPUBExtractorService {
  private extractors: {
    light: EPUBLightExtractor;
    heavy: EPUBHeavyExtractor;
    epubjs: EpubJsExtractor;
  };

  constructor() {
    this.extractors = {
      light: new EPUBLightExtractor(),
      heavy: new EPUBHeavyExtractor(),
      epubjs: new EpubJsExtractor()
    };
  }

  async extract(
    file: File, 
    options: ExtractionOptions,
    onProgress?: (progress: number) => void
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      loggerService.log('info', 'Starting EPUB extraction', {
        filename: file.name,
        mode: options.mode,
        size: file.size
      });

      const effectiveMode = options.mode === 'epub-convert' ? 'heavy' : options.mode;
      const extractor = this.getExtractor(effectiveMode);
      
      const result = await extractor.extract(file, options, onProgress);

      loggerService.log('info', 'EPUB extraction completed', {
        filename: file.name,
        mode: effectiveMode,
        duration: Date.now() - startTime,
        wordCount: result.metadata?.words
      });

      return result;
    } catch (error) {
      loggerService.log('error', 'EPUB extraction failed', {
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
      case 'epubjs':
        return this.extractors.epubjs;
      default:
        throw new Error(`Unknown extraction mode: ${mode}`);
    }
  }
}

export const epubExtractor = new EPUBExtractorService(); 