import { groqService } from './groqService';
import { logger, LogCategory } from '../utils/logger';

interface ConversionOptions {
  cleanWithAI?: boolean;
}

class FileConversionService {
  async convertPDFToText(file: File, options: ConversionOptions = {}): Promise<string> {
    try {
      logger.debug(LogCategory.FILE_CONVERSION, 'Starting PDF conversion', {
        fileName: file.name,
        fileSize: file.size,
        cleanWithAI: options.cleanWithAI
      });

      // First, convert the PDF to text using the existing service
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/convert/pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to convert PDF');
      }

      let text = await response.text();

      // If AI cleaning is requested, process the text with Groq
      if (options.cleanWithAI) {
        logger.debug(LogCategory.FILE_CONVERSION, 'Starting AI cleaning');
        text = await groqService.processText(text);
      }

      logger.debug(LogCategory.FILE_CONVERSION, 'Conversion completed', {
        originalSize: file.size,
        resultSize: text.length,
        cleanWithAI: options.cleanWithAI
      });

      return text;
    } catch (error) {
      logger.error(LogCategory.FILE_CONVERSION, 'Error in PDF conversion', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to convert PDF');
    }
  }

  async convertEPUBToText(file: File, options: ConversionOptions = {}): Promise<string> {
    try {
      logger.debug(LogCategory.FILE_CONVERSION, 'Starting EPUB conversion', {
        fileName: file.name,
        fileSize: file.size,
        cleanWithAI: options.cleanWithAI
      });

      // First, convert the EPUB to text using the existing service
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/convert/epub', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to convert EPUB');
      }

      let text = await response.text();

      // If AI cleaning is requested, process the text with Groq
      if (options.cleanWithAI) {
        logger.debug(LogCategory.FILE_CONVERSION, 'Starting AI cleaning');
        text = await groqService.processText(text);
      }

      logger.debug(LogCategory.FILE_CONVERSION, 'Conversion completed', {
        originalSize: file.size,
        resultSize: text.length,
        cleanWithAI: options.cleanWithAI
      });

      return text;
    } catch (error) {
      logger.error(LogCategory.FILE_CONVERSION, 'Error in EPUB conversion', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to convert EPUB');
    }
  }
}

export const fileConversionService = new FileConversionService(); 