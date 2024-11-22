import { Extractor, ExtractionResult, ExtractionOptions } from '../types';
import JSZip from 'jszip';
import { cleanText } from '../../../utils/textUtils';
import { EPUBMetadata } from '../../../types/epub';

export class EPUBLightExtractor implements Extractor {
  name = 'epub-light';

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
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      // Extract metadata if enabled
      let metadata: Partial<EPUBMetadata> = {};
      if (options.extractMetadata) {
        metadata = await this.extractMetadata(contents);
      }
      
      // Extract content
      const { text, chapters, totalWordCount } = await this.extractContent(contents, options);

      return {
        text,
        document: {
          metadata: metadata as EPUBMetadata,
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

  private async extractMetadata(zip: JSZip): Promise<Partial<EPUBMetadata>> {
    const metadata: Partial<EPUBMetadata> = {};
    
    try {
      const containerXml = await zip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) return metadata as EPUBMetadata;

      const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1];
      if (!opfPath) return metadata as EPUBMetadata;

      const opfContent = await zip.file(opfPath)?.async('text');
      if (!opfContent) return metadata as EPUBMetadata;

      const parser = new DOMParser();
      const opfDoc = parser.parseFromString(opfContent, 'text/xml');

      const getDC = (element: string) => {
        return (
          opfDoc.querySelector(`dc\\:${element}`)?.textContent ||
          opfDoc.querySelector(`DC\\:${element}`)?.textContent ||
          opfDoc.querySelector(`metadata>${element}`)?.textContent ||
          opfDoc.querySelector(`metadata>dc\\:${element}`)?.textContent ||
          ''
        );
      };

      metadata.title = getDC('title');
      metadata.creator = getDC('creator');
      metadata.publisher = getDC('publisher');
      metadata.language = getDC('language');
      metadata.identifier = getDC('identifier');
      metadata.pubdate = getDC('date');
      metadata.description = getDC('description');
      metadata.rights = getDC('rights');
    } catch (error) {
      console.error('Error extracting metadata:', error);
    }

    return metadata as EPUBMetadata;
  }

  private async extractContent(zip: JSZip, options: ExtractionOptions) {
    const contentFiles = Object.keys(zip.files)
      .filter(name => name.endsWith('.html') || name.endsWith('.xhtml'))
      .sort();

    let text = '';
    let totalWordCount = 0;
    const chapters = [];

    for (const filename of contentFiles) {
      const content = await zip.file(filename)?.async('text');
      if (!content) continue;

      const doc = new DOMParser().parseFromString(content, 'text/html');
      
      // Try to get chapter title
      const title = doc.querySelector('h1')?.textContent?.trim() ||
                   doc.querySelector('h2')?.textContent?.trim() ||
                   doc.querySelector('title')?.textContent?.trim() ||
                   `Chapter ${chapters.length + 1}`;

      // Extract text based on formatting option
      let chapterText;
      if (options.preserveFormatting) {
        chapterText = this.extractFormattedText(doc);
      } else {
        chapterText = cleanText(doc.body.textContent || '');
      }
      
      const wordCount = chapterText.split(/\s+/).length;
      
      if (chapterText) {
        chapters.push({
          title,
          content: chapterText,
          wordCount
        });
        totalWordCount += wordCount;
        text += chapterText + '\n\n';
      }
    }

    return { text, chapters, totalWordCount };
  }

  private extractFormattedText(doc: Document): string {
    let text = '';
    
    // Extract headings
    doc.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(heading => {
      const headingText = heading.textContent?.trim();
      if (headingText) {
        text += `\n# ${headingText}\n\n`;
      }
    });
    
    // Extract paragraphs
    doc.querySelectorAll('p').forEach(p => {
      const paragraphText = p.textContent?.trim();
      if (paragraphText) {
        text += `${paragraphText}\n\n`;
      }
    });
    
    // Extract lists
    doc.querySelectorAll('ul,ol').forEach(list => {
      text += '\n';
      list.querySelectorAll('li').forEach(li => {
        const listItemText = li.textContent?.trim();
        if (listItemText) {
          text += `• ${listItemText}\n`;
        }
      });
      text += '\n';
    });

    return cleanText(text);
  }
} 