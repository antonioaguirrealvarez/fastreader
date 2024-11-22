import { Extractor, ExtractionResult, ExtractionOptions } from '../types';
import JSZip from 'jszip';
import { cleanText } from '../../../utils/textUtils';
import { EPUBMetadata } from '../../../types/epub';

export class EPUBHeavyExtractor implements Extractor {
  name = 'epub-heavy';

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
      
      // Extract metadata
      const metadata = await this.extractMetadata(contents);
      
      // Find TOC file for better chapter detection
      const tocFile = Object.keys(contents.files).find(
        name => name.toLowerCase().includes('toc.') || 
                name.toLowerCase().includes('contents.')
      );

      let chapterTitles: { [href: string]: string } = {};
      if (tocFile) {
        const tocContent = await contents.file(tocFile)?.async('text');
        if (tocContent) {
          const tocDoc = new DOMParser().parseFromString(tocContent, 'text/html');
          tocDoc.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href')?.split('#')[0];
            if (href) {
              chapterTitles[href] = link.textContent?.trim() || '';
            }
          });
        }
      }
      
      // Extract content with enhanced chapter detection
      const { text, chapters, totalWordCount } = await this.extractContent(
        contents, 
        chapterTitles,
        options,
        onProgress
      );

      return {
        text,
        document: {
          metadata,
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

  private async extractMetadata(zip: JSZip): Promise<EPUBMetadata> {
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

  private async extractContent(
    zip: JSZip,
    chapterTitles: { [href: string]: string },
    options: ExtractionOptions,
    onProgress?: (progress: number) => void
  ) {
    const contentFiles = Object.keys(zip.files)
      .filter(name => name.endsWith('.html') || name.endsWith('.xhtml'))
      .sort();

    let text = '';
    let totalWordCount = 0;
    const chapters = [];

    for (let i = 0; i < contentFiles.length; i++) {
      const filename = contentFiles[i];
      if (onProgress) {
        onProgress(i / contentFiles.length);
      }

      const content = await zip.file(filename)?.async('text');
      if (!content) continue;

      const doc = new DOMParser().parseFromString(content, 'text/html');
      
      // Get chapter title with enhanced detection
      const title = this.getChapterTitle(doc, filename, chapterTitles, chapters.length);
      
      // Extract text with enhanced formatting
      const chapterText = options.preserveFormatting
        ? this.extractFormattedText(doc)
        : cleanText(doc.body.textContent || '');
      
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

  private getChapterTitle(
    doc: Document,
    filename: string,
    chapterTitles: { [href: string]: string },
    chapterIndex: number
  ): string {
    // Try multiple sources for title
    return (
      // From TOC
      chapterTitles[filename] ||
      // From document headings
      doc.querySelector('h1')?.textContent?.trim() ||
      doc.querySelector('h2')?.textContent?.trim() ||
      // From document title
      doc.querySelector('title')?.textContent?.trim() ||
      // From header element
      doc.querySelector('header')?.textContent?.trim() ||
      // Default
      `Chapter ${chapterIndex + 1}`
    );
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