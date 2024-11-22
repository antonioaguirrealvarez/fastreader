import { Extractor, ExtractionResult, ExtractionOptions } from '../types';
import * as epubjs from 'epubjs';
import { cleanText } from '../../../utils/textUtils';
import axios from 'axios';

export class EpubJsExtractor implements Extractor {
  name = 'epubjs';
  private serverUrl = 'http://localhost:3000/api/logs';

  private async log(level: string, message: string, data?: any) {
    try {
      await axios.post(this.serverUrl, {
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  }

  supports(filename: string): boolean {
    return filename.toLowerCase().endsWith('.epub');
  }

  async extract(
    file: File,
    options: ExtractionOptions,
    onProgress?: (progress: number) => void
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    try {
      await this.log('info', 'Starting EPUB extraction', {
        filename: file.name,
        size: file.size,
        method: this.name
      });

      // Create a blob URL for the file
      const blob = new Blob([await file.arrayBuffer()], { type: 'application/epub+zip' });
      const url = URL.createObjectURL(blob);
      
      // Initialize epub.js book
      const book = epubjs.default();
      await book.open(url);

      // Extract metadata
      const metadata = await book.loaded.metadata;
      const spine = await book.loaded.spine;
      
      let text = '';
      let totalWordCount = 0;
      const chapters = [];

      await this.log('debug', 'EPUB metadata loaded', { metadata });

      // Process each spine item
      for (let i = 0; i < spine.items.length; i++) {
        if (onProgress) {
          onProgress(i / spine.items.length);
        }

        const item = spine.items[i];
        const rendition = book.renderTo('viewer');
        await rendition.display(item.href);
        
        const doc = rendition.getContents()[0].content;
        const chapterText = options.preserveFormatting
          ? this.extractFormattedText(doc)
          : cleanText(doc.textContent || '');
        
        const wordCount = chapterText.split(/\s+/).length;

        chapters.push({
          title: item.label || metadata.title || `Chapter ${chapters.length + 1}`,
          content: chapterText,
          wordCount
        });

        totalWordCount += wordCount;
        text += chapterText + '\n\n';

        await this.log('debug', 'Chapter processed', {
          filename: file.name,
          chapterIndex: i,
          wordCount,
          title: item.label
        });

        rendition.destroy();
      }

      // Cleanup
      URL.revokeObjectURL(url);

      await this.log('info', 'EPUB extraction completed', {
        filename: file.name,
        totalWordCount,
        chapterCount: chapters.length,
        duration: Date.now() - startTime
      });

      return {
        text,
        document: {
          metadata: {
            title: metadata.title,
            creator: metadata.creator,
            publisher: metadata.publisher,
            language: metadata.language,
            rights: metadata.rights,
            identifier: metadata.identifier,
            pubdate: new Date().toISOString(),
            description: metadata.description
          },
          chapters,
          totalWordCount
        },
        metadata: {
          method: this.name,
          words: totalWordCount,
          title: metadata.title,
          author: metadata.creator
        },
        performance: {
          duration: Date.now() - startTime,
          method: this.name,
          success: true
        }
      };
    } catch (error) {
      await this.log('error', 'EPUB extraction failed', {
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      throw {
        performance: {
          duration: Date.now() - startTime,
          method: this.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private extractFormattedText(doc: Document): string {
    let text = '';
    
    // Process sections and articles
    doc.querySelectorAll('section, article').forEach(section => {
      const sectionTitle = section.querySelector('h1,h2,h3,h4,h5,h6')?.textContent?.trim();
      if (sectionTitle) {
        text += `\n## ${sectionTitle}\n\n`;
      }
    });
    
    // Process headings not in sections
    doc.querySelectorAll('body > h1, body > h2, body > h3, body > h4, body > h5, body > h6').forEach(heading => {
      const headingText = heading.textContent?.trim();
      if (headingText) {
        text += `\n# ${headingText}\n\n`;
      }
    });
    
    // Process paragraphs with better spacing
    doc.querySelectorAll('p').forEach(p => {
      const paragraphText = p.textContent?.trim();
      if (paragraphText) {
        text += `${paragraphText}\n\n`;
      }
    });
    
    // Process lists with proper indentation
    doc.querySelectorAll('ul,ol').forEach(list => {
      text += '\n';
      list.querySelectorAll('li').forEach((li, index) => {
        const listItemText = li.textContent?.trim();
        if (listItemText) {
          const bullet = list.tagName === 'OL' ? `${index + 1}.` : '•';
          text += `${bullet} ${listItemText}\n`;
        }
      });
      text += '\n';
    });

    return cleanText(text);
  }
} 