import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileText, Settings, BookOpen } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import ePub from 'epubjs';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { useEPUBStore } from '../stores/epubStore';
import type { EPUBMetadata, EPUBChapter } from '../types/epub';
import { epubExtractor } from '../services/extractors/epub/epubExtractor';
import { pdfExtractor } from '../services/extractors/pdf/pdfExtractor';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ExtractedItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
}

interface ExtractionOptions {
  mode: 'light' | 'heavy' | 'epub-convert';
  preserveFormatting: boolean;
  extractImages: boolean;
  extractMetadata: boolean;
  removeHeaders: boolean;
  removeFooters: boolean;
  removePageNumbers: boolean;
}

interface TextContent {
  items: ExtractedItem[];
}

interface DebugData {
  [key: string]: unknown;
}

interface ExtractedDocument {
  metadata?: EPUBMetadata;
  chapters: {
    title: string;
    content: string;
    wordCount: number;
  }[];
  totalWordCount: number;
}

interface ChapterPosition {
  start: number;
  end: number;
}

export function FileConversionTest() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [options, setOptions] = useState<ExtractionOptions>({
    mode: 'light',
    preserveFormatting: true,
    extractImages: false,
    extractMetadata: true,
    removeHeaders: true,
    removeFooters: true,
    removePageNumbers: true,
  });

  const epubStore = useEPUBStore();

  const [extractedDocument, setExtractedDocument] = useState<ExtractedDocument | null>(null);
  const [chapterPositions, setChapterPositions] = useState<ChapterPosition[]>([]);
  const textRef = useRef<HTMLPreElement>(null);
  const [activeChapter, setActiveChapter] = useState<number>(0);

  const logDebug = (message: string, data?: DebugData) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
    setDebugInfo(prev => prev + '\n' + logMessage);
    console.log(logMessage, data);
  };

  const isHeaderOrFooter = (item: ExtractedItem, pageHeight: number) => {
    const y = item.transform[5];
    // Consider text in top 10% as header and bottom 10% as footer
    return y > pageHeight * 0.9 || y < pageHeight * 0.1;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile); // Store the file for later use
    setExtractedText(''); // Clear previous results
    setExtractedDocument(null);
    logDebug('File selected', {
      name: uploadedFile.name,
      type: uploadedFile.type,
      size: uploadedFile.size
    });
  };

  const isPageNumber = (str: string, y: number, pageHeight: number): boolean => {
    // Clean the string and convert to number
    const cleanStr = str.trim();
    const num = parseInt(cleanStr);

    // Check if it's a valid number
    if (isNaN(num)) return false;

    // If it's a year (4 digits between 1900-2100), don't treat as page number
    if (num >= 1900 && num <= 2100 && cleanStr.length === 4) {
      logDebug('Year detected', { text: cleanStr });
      return false;
    }

    // If it's a large number (likely not a page number)
    if (num > 1000) {
      logDebug('Large number detected', { text: cleanStr });
      return false;
    }

    // Check if it's in typical page number position (top or bottom 10% of page)
    const isPagePosition = y > pageHeight * 0.9 || y < pageHeight * 0.1;

    // If it's a small number in page number position, likely a page number
    if (isPagePosition && num < 200) {
      logDebug('Page number detected', { text: cleanStr, y, pageHeight });
      return true;
    }

    return false;
  };

  const cleanText = (text: string): string => {
    return text
      // Remove weird characters and excessive spaces
      .replace(/\u200B/g, '') // Zero-width space
      .replace(/\u00A0/g, ' ') // Non-breaking space
      .replace(/\s+/g, ' ') // Multiple spaces
      .replace(/[""]/g, '"') // Smart quotes
      .replace(/['']/g, "'") // Smart apostrophes
      .replace(/…/g, '...') // Ellipsis
      .replace(/[−‒–—]/g, '-') // Various dashes
      .replace(/\t/g, ' ') // Tabs
      .trim();
  };

  const extractPDFLight = async (file: File): Promise<string> => {
    logDebug('Starting light PDF extraction');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      logDebug(`Processing page ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const { height } = page.getViewport({ scale: 1.0 });
      const content = await page.getTextContent() as TextContent;
      
      const filteredItems = content.items
        .filter(item => {
          if (options.removeHeaders && isHeaderOrFooter(item, height)) {
            logDebug('Removed header/footer item', { text: item.str, y: item.transform[5] });
            return false;
          }
          if (options.removePageNumbers && isPageNumber(item.str, item.transform[5], height)) {
            logDebug('Removed page number', { text: item.str });
            return false;
          }
          return true;
        })
        .map(item => ({
          ...item,
          str: cleanText(item.str)
        }));

      text += filteredItems.map(item => item.str).join(' ') + '\n';
      logDebug(`Completed page ${i}`, { itemCount: filteredItems.length });
    }
    
    logDebug('Completed light PDF extraction', { pageCount: pdf.numPages });
    return text;
  };

  const extractPDFHeavy = async (file: File): Promise<string> => {
    logDebug('Starting heavy PDF extraction');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      logDebug(`Processing page ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const { height } = page.getViewport({ scale: 1.0 });
      const content = await page.getTextContent() as TextContent;
      
      // Group items by their vertical position with better precision
      const lineGroups = new Map<number, ExtractedItem[]>();
      const lineHeight = 12; // Typical line height in points
      
      content.items.forEach(item => {
        if (options.removeHeaders && isHeaderOrFooter(item, height)) {
          logDebug('Removed header/footer item', { text: item.str, y: item.transform[5] });
          return;
        }
        if (options.removePageNumbers && isPageNumber(item.str, item.transform[5], height)) {
          logDebug('Removed page number', { text: item.str });
          return;
        }
        
        // Round y position to nearest line height to group nearby items
        const y = Math.round(item.transform[5] / lineHeight) * lineHeight;
        if (!lineGroups.has(y)) {
          lineGroups.set(y, []);
        }
        lineGroups.get(y)?.push(item);
      });

      // Sort lines from top to bottom and items from left to right
      const sortedLines = Array.from(lineGroups.entries())
        .sort(([y1], [y2]) => y2 - y1) // Sort by y-coordinate (top to bottom)
        .map(([_, items]) => {
          return items.sort((a, b) => a.transform[4] - b.transform[4]); // Sort by x-coordinate
        });

      // Process each line
      sortedLines.forEach(line => {
        const lineText = cleanText(
          line.map(item => item.str).join(' ')
        );
        if (lineText) {
          text += lineText + '\n';
        }
      });

      logDebug(`Completed page ${i}`, { 
        lineCount: sortedLines.length,
        itemCount: content.items.length 
      });
    }
    
    logDebug('Completed heavy PDF extraction', { pageCount: pdf.numPages });
    return text;
  };

  const extractTextFromHTML = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent?.trim() || '';
  };

  const extractEPUBLight = async (file: File): Promise<string> => {
    logDebug('Starting light EPUB extraction');
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      let text = '';

      // Extract metadata if enabled
      let metadata: Partial<EPUBMetadata> = {};
      if (options.extractMetadata) {
        try {
          metadata = await extractMetadata(zip);
          logDebug('Light mode metadata extraction completed', { metadata });
        } catch (error) {
          logDebug('Light mode metadata extraction failed', { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      // Find and sort content files
      const contentFiles = Object.keys(contents.files)
        .filter(name => name.endsWith('.html') || name.endsWith('.xhtml'))
        .sort();

      logDebug('Found content files', { count: contentFiles.length, files: contentFiles });

      const structuredDoc: ExtractedDocument = {
        metadata: options.extractMetadata ? metadata as EPUBMetadata : undefined,
        chapters: [],
        totalWordCount: 0
      };

      for (const filename of contentFiles) {
        try {
          const content = await contents.files[filename].async('text');
          const doc = new DOMParser().parseFromString(content, 'text/html');
          
          // Try to get chapter title
          const title = doc.querySelector('h1')?.textContent?.trim() ||
                       doc.querySelector('h2')?.textContent?.trim() ||
                       doc.querySelector('title')?.textContent?.trim() ||
                       `Chapter ${structuredDoc.chapters.length + 1}`;

          const extractedText = extractTextFromHTML(content);
          const wordCount = extractedText.trim().split(/\s+/).length;

          if (extractedText) {
            structuredDoc.chapters.push({
              title,
              content: extractedText,
              wordCount
            });
            structuredDoc.totalWordCount += wordCount;
            text += extractedText + '\n\n';
            
            logDebug('Processed file', { 
              filename,
              title,
              wordCount,
              contentLength: extractedText.length 
            });
          }
        } catch (error) {
          logDebug(`Error processing file`, { 
            filename, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      setExtractedDocument(structuredDoc);
      logDebug('Light extraction completed', { 
        chaptersCount: structuredDoc.chapters.length,
        totalWords: structuredDoc.totalWordCount,
        textLength: text.length
      });

      return text;
    } catch (error) {
      logDebug('EPUB light extraction failed', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };

  const extractEPUBHeavy = async (file: File): Promise<string> => {
    logDebug('Starting heavy EPUB extraction');
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      let text = '';
      
      // Create document structure
      const docId = uuidv4();
      let metadata: Partial<EPUBMetadata> = {};
      const chapters: EPUBChapter[] = [];

      // Extract metadata first
      try {
        metadata = await extractMetadata(zip);
        logDebug('Metadata extraction completed', { metadata });
      } catch (error) {
        logDebug('Metadata extraction failed', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }

      // Find content files
      const contentFiles = Object.keys(contents.files).filter(
        name => name.endsWith('.html') || name.endsWith('.xhtml')
      ).sort(); // Sort to maintain chapter order

      logDebug('Found content files', { count: contentFiles.length, files: contentFiles });

      // Find TOC (table of contents) file
      const tocFile = Object.keys(contents.files).find(
        name => name.toLowerCase().includes('toc.') || name.toLowerCase().includes('contents.')
      );

      let chapterTitles: { [href: string]: string } = {};
      if (tocFile) {
        try {
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
          logDebug('TOC extraction completed', { chapterTitles });
        } catch (error) {
          logDebug('TOC extraction failed', { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      const structuredDoc: ExtractedDocument = {
        metadata: options.extractMetadata ? metadata as EPUBMetadata : undefined,
        chapters: [],
        totalWordCount: 0
      };

      let currentPosition = 0;
      const positions: ChapterPosition[] = [];

      for (let i = 0; i < contentFiles.length; i++) {
        const filename = contentFiles[i];
        try {
          logDebug(`Processing chapter file ${i + 1}/${contentFiles.length}`, { filename });
          
          const content = await contents.file(filename)?.async('text');
          if (!content) {
            logDebug(`Empty content in file`, { filename });
            continue;
          }

          const doc = new DOMParser().parseFromString(content, 'text/html');
          
          // Try multiple ways to get chapter title
          let title = chapterTitles[filename] || // From TOC
                     doc.querySelector('h1')?.textContent?.trim() ||
                     doc.querySelector('h2')?.textContent?.trim() ||
                     doc.querySelector('title')?.textContent?.trim() ||
                     doc.querySelector('header')?.textContent?.trim();

          // Clean up title if found
          if (title) {
            title = title.replace(/^Chapter\s+\d+:\s*/i, '')
                        .replace(/^\d+\.\s*/i, '')
                        .trim();
          } else {
            title = `Chapter ${i + 1}`;
          }

          const chapterContent = options.preserveFormatting
            ? processFormattedContent(doc)
            : extractTextFromHTML(content);

          const wordCount = chapterContent.trim().split(/\s+/).length;

          // Track chapter position
          const position: ChapterPosition = {
            start: currentPosition,
            end: currentPosition + chapterContent.length
          };
          positions.push(position);
          currentPosition += chapterContent.length;

          structuredDoc.chapters.push({
            title,
            content: chapterContent,
            wordCount
          });

          structuredDoc.totalWordCount += wordCount;

          text += chapterContent + '\n\n';

          logDebug(`Chapter processed`, { 
            title, 
            wordCount,
            position,
            contentLength: chapterContent.length
          });

        } catch (error) {
          logDebug(`Error processing chapter`, { 
            filename, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      // Store positions for navigation
      setChapterPositions(positions);
      
      // Store the document
      epubStore.addDocument({
        id: docId,
        metadata: metadata as EPUBMetadata,
        chapters,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      setExtractedDocument(structuredDoc);
      logDebug('Heavy extraction completed', { 
        chaptersCount: structuredDoc.chapters.length,
        totalWords: structuredDoc.totalWordCount,
        textLength: text.length
      });

      return text;
    } catch (error) {
      logDebug('EPUB heavy extraction failed', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };

  const processPageContent = async (content: TextContent, pageNum: number): Promise<{ text: string; title: string }> => {
    logDebug(`Processing content for page ${pageNum}`);
    
    const { height } = content.items[0]?.transform?.[5] ? { height: Math.max(...content.items.map(item => item.transform[5])) } : { height: 1000 };
    
    // Filter out headers/footers and clean text
    const filteredItems = content.items.filter(item => {
      if (options.removeHeaders && isHeaderOrFooter(item, height)) {
        logDebug('Removed header/footer from PDF conversion', { text: item.str, y: item.transform[5] });
        return false;
      }
      if (options.removePageNumbers && isPageNumber(item.str, item.transform[5], height)) {
        logDebug('Removed page number from PDF conversion', { text: item.str });
        return false;
      }
      return true;
    });

    // Group items by their vertical position
    const lineGroups = new Map<number, ExtractedItem[]>();
    const lineHeight = 12;
    
    filteredItems.forEach(item => {
      const y = Math.round(item.transform[5] / lineHeight) * lineHeight;
      if (!lineGroups.has(y)) {
        lineGroups.set(y, []);
      }
      lineGroups.get(y)?.push(item);
    });

    // Sort and process lines
    const sortedLines = Array.from(lineGroups.entries())
      .sort(([y1], [y2]) => y2 - y1)
      .map(([, items]) => items.sort((a, b) => a.transform[4] - b.transform[4]));

    // Extract text with cleaning
    let text = '';
    sortedLines.forEach(line => {
      const lineText = cleanText(line.map(item => item.str).join(' '));
      if (lineText) {
        text += lineText + '\n';
      }
    });

    // Find title (first non-empty line that's not a number)
    const title = cleanText(
      sortedLines.find(line => {
        const lineText = line.map(item => item.str).join(' ').trim();
        return lineText && !/^\d+$/.test(lineText);
      })?.map(item => item.str).join(' ').trim() || `Page ${pageNum}`
    );

    logDebug('Page content processed', { 
      pageNum, 
      titleFound: title,
      contentLength: text.length,
      linesProcessed: sortedLines.length
    });

    return { text, title };
  };

  const convertPDFToEPUB = async (file: File): Promise<File> => {
    logDebug('Starting PDF to EPUB conversion with header removal');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      logDebug(`PDF loaded with ${pdf.numPages} pages`);
      
      const zip = new JSZip();
      zip.file('mimetype', 'application/epub+zip');
      
      // Add container.xml
      zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
        <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
          <rootfiles>
            <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
          </rootfiles>
        </container>`);
      
      // Extract content from PDF with header removal
      const chapters = [];
      let totalWordCount = 0;
      
      for (let i = 1; i <= pdf.numPages; i++) {
        logDebug(`Converting page ${i}/${pdf.numPages}`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        const { text, title } = await processPageContent(content, i);
        const wordCount = text.trim().split(/\s+/).length;
        totalWordCount += wordCount;
        
        chapters.push({ 
          text, 
          title,
          wordCount 
        });
        
        logDebug(`Page ${i} converted`, {
          title,
          wordCount,
          textLength: text.length
        });
      }
      
      // Create content files with clean text
      chapters.forEach((chapter, index) => {
        const htmlContent = `<?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE html>
          <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <title>${chapter.title}</title>
            </head>
            <body>
              ${chapter.text.split('\n').map(p => `<p>${cleanText(p)}</p>`).join('\n')}
            </body>
          </html>`;
        zip.file(`chapter${index + 1}.xhtml`, htmlContent);
      });
      
      // Create content.opf
      const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
        <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
          <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
            <dc:title>${file.name.replace('.pdf', '')}</dc:title>
            <dc:language>en</dc:language>
            <meta property="dcterms:modified">${new Date().toISOString()}</meta>
          </metadata>
          <manifest>
            ${chapters.map((_, i) => 
              `<item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
            ).join('\n')}
          </manifest>
          <spine>
            ${chapters.map((_, i) => `<itemref idref="chapter${i + 1}"/>`).join('\n')}
          </spine>
        </package>`;
      
      zip.file('content.opf', contentOpf);
      
      // Generate EPUB file
      const epubBlob = await zip.generateAsync({ type: 'blob' });
      const epubFile = new File([epubBlob], file.name.replace('.pdf', '.epub'), {
        type: 'application/epub+zip'
      });
      
      logDebug('EPUB conversion completed', {
        pageCount: pdf.numPages,
        chapterCount: chapters.length,
        totalWordCount,
        averageWordsPerChapter: Math.round(totalWordCount / chapters.length)
      });
      
      return epubFile;
    } catch (error) {
      logDebug('PDF to EPUB conversion failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error('PDF to EPUB conversion failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleExtraction = async () => {
    if (!file) {
      logDebug('No file selected');
      return;
    }

    setIsProcessing(true);
    try {
      const fileType = file.name.split('.').pop()?.toLowerCase();
      
      logDebug('Starting extraction', { 
        fileType,
        mode: options.mode,
        options 
      });

      if (fileType === 'pdf') {
        const result = await pdfExtractor.extract(file, options, (progress) => {
          logDebug(`Extraction progress: ${Math.round(progress * 100)}%`);
        });
        setExtractedText(result.text);
        setExtractedDocument(result.document);
        logDebug('PDF extraction completed', {
          wordCount: result.metadata?.words,
          method: result.metadata?.method
        });
      } else if (fileType === 'epub') {
        const result = await epubExtractor.extract(file, options, (progress) => {
          logDebug(`Extraction progress: ${Math.round(progress * 100)}%`);
        });
        setExtractedText(result.text);
        setExtractedDocument(result.document);
        logDebug('EPUB extraction completed', {
          wordCount: result.metadata?.words,
          method: result.metadata?.method
        });
      } else {
        logDebug('Unsupported file type');
      }
    } catch (error) {
      logDebug('Extraction failed', { error });
      setExtractedText('Error extracting text. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processFormattedContent = (doc: Document): string => {
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

    return text;
  };

  const extractMetadata = async (zip: JSZip): Promise<Partial<EPUBMetadata>> => {
    const metadata: Partial<EPUBMetadata> = {};
    
    try {
      // First find the container.xml
      const containerXml = await zip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) return metadata;

      // Get OPF file path
      const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1];
      if (!opfPath) return metadata;

      // Read OPF content
      const opfContent = await zip.file(opfPath)?.async('text');
      if (!opfContent) return metadata;

      const parser = new DOMParser();
      const opfDoc = parser.parseFromString(opfContent, 'text/xml');

      // Try different metadata formats
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

      logDebug('Extracted metadata', metadata);
    } catch (error) {
      logDebug('Error extracting metadata', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }

    return metadata;
  };

  const extractChapters = async (zip: JSZip, contentFiles: string[]) => {
    const chapters: {
      title: string;
      content: string;
      wordCount: number;
      position: ChapterPosition;
    }[] = [];
    
    let currentPosition = 0;
    
    for (let i = 0; i < contentFiles.length; i++) {
      const filename = contentFiles[i];
      const content = await zip.file(filename)?.async('text');
      if (!content) continue;

      const doc = new DOMParser().parseFromString(content, 'text/html');
      
      // Better chapter title detection
      const title = 
        doc.querySelector('h1')?.textContent ||
        doc.querySelector('h2')?.textContent ||
        doc.querySelector('title')?.textContent ||
        doc.querySelector('header')?.textContent ||
        `Chapter ${i + 1}`;

      const chapterContent = options.preserveFormatting
        ? processFormattedContent(doc)
        : extractTextFromHTML(content);

      const wordCount = chapterContent.trim().split(/\s+/).length;
      
      // Track chapter positions
      const start = currentPosition;
      currentPosition += chapterContent.length;

      chapters.push({
        title: title.trim(),
        content: chapterContent,
        wordCount,
        position: {
          start,
          end: currentPosition
        }
      });
    }

    return chapters;
  };

  const scrollToChapter = (position: ChapterPosition) => {
    if (!textRef.current) return;
    
    // Get the text content element
    const textElement = textRef.current;
    
    // Calculate the relative position
    const totalHeight = textElement.scrollHeight;
    const scrollPosition = (position.start / extractedText.length) * totalHeight;
    
    textElement.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    });
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const extractChapterNumber = (filename: string): number | null => {
    // Try to extract number from filenames like "split_001" or "chapter1"
    const match = filename.match(/[_\s](\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const getChapterTitle = (doc: Document, filename: string, index: number): string => {
    // Try multiple ways to get chapter title
    let title = doc.querySelector('h1')?.textContent?.trim() ||
                doc.querySelector('h2')?.textContent?.trim() ||
                doc.querySelector('title')?.textContent?.trim();

    // If title is the book name or generic, try to get chapter number
    if (!title || title.toLowerCase() === metadata.title?.toLowerCase()) {
      const chapterNum = extractChapterNumber(filename);
      if (chapterNum !== null) {
        // Convert number to word for numbers 1-20
        const numberWords = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 
                            'Eighteen', 'Nineteen', 'Twenty'];
        
        title = chapterNum <= 20 
          ? `Chapter ${numberWords[chapterNum - 1]}`
          : `Chapter ${chapterNum}`;
      } else {
        title = `Chapter ${index + 1}`;
      }
    }

    return title;
  };

  // Add scroll event listener
  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement || !extractedText) return;

    const handleScroll = () => {
      const scrollPosition = textElement.scrollTop;
      const totalHeight = textElement.scrollHeight - textElement.clientHeight;
      const scrollPercentage = scrollPosition / totalHeight;
      const textPosition = Math.floor(scrollPercentage * extractedText.length);

      // Find current chapter
      const currentChapter = chapterPositions.findIndex((pos, index) => {
        const nextPos = chapterPositions[index + 1];
        return textPosition >= pos.start && (!nextPos || textPosition < nextPos.start);
      });

      if (currentChapter !== -1 && currentChapter !== activeChapter) {
        setActiveChapter(currentChapter);
      }
    };

    textElement.addEventListener('scroll', handleScroll);
    return () => textElement.removeEventListener('scroll', handleScroll);
  }, [extractedText, chapterPositions, activeChapter]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-8">File Conversion Test</h1>

        {/* File Upload */}
        <Card className="p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload File
            </h2>
            <input
              type="file"
              accept=".pdf,.epub"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
        </Card>

        {/* Options */}
        <Card className="p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Extraction Options
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Mode</label>
                <select
                  value={options.mode}
                  onChange={(e) => setOptions({ 
                    ...options, 
                    mode: e.target.value as 'light' | 'heavy' | 'epub-convert' 
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="light">Light (Faster)</option>
                  <option value="heavy">Heavy (More Accurate)</option>
                  <option value="epub-convert">Convert to EPUB</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.preserveFormatting}
                    onChange={(e) => setOptions({ ...options, preserveFormatting: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Preserve Formatting</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.extractImages}
                    onChange={(e) => setOptions({ ...options, extractImages: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Extract Images</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.extractMetadata}
                    onChange={(e) => setOptions({ ...options, extractMetadata: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Extract Metadata</span>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Extract Button */}
        <Button
          onClick={handleExtraction}
          disabled={!file || isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Processing...' : 'Extract Text'}
        </Button>

        {/* Results */}
        {extractedText && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="p-6">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5" />
                  Extracted Text
                </h2>
                <div className="max-h-[600px] overflow-y-auto bg-gray-50 p-4 rounded-lg">
                  <pre 
                    ref={textRef}
                    className="whitespace-pre-wrap font-mono text-sm"
                  >
                    {extractedText}
                  </pre>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              {extractedDocument?.metadata && options.extractMetadata && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Metadata</h2>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Title:</span> {extractedDocument.metadata.title}</p>
                    <p><span className="font-medium">Author:</span> {extractedDocument.metadata.creator}</p>
                    <p><span className="font-medium">Publisher:</span> {extractedDocument.metadata.publisher}</p>
                    <p><span className="font-medium">Language:</span> {extractedDocument.metadata.language}</p>
                    <p><span className="font-medium">Publication Date:</span> {formatDate(extractedDocument.metadata.pubdate)}</p>
                  </div>
                </Card>
              )}

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Chapter Structure</h2>
                <div className="space-y-4">
                  <div className="text-sm text-gray-500 mb-4">
                    Total Words: {extractedDocument?.totalWordCount.toLocaleString()}
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {extractedDocument?.chapters.map((chapter, index) => (
                      <div 
                        key={index}
                        className={`p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer
                          ${index === activeChapter ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => scrollToChapter(chapterPositions[index])}
                      >
                        <h3 className="font-medium text-gray-900">{chapter.title}</h3>
                        <div className="text-sm text-gray-500 mt-1">
                          {chapter.wordCount.toLocaleString()} words
                        </div>
                        <div className="mt-2">
                          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600"
                              style={{ 
                                width: `${(chapter.wordCount / extractedDocument.totalWordCount) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="max-h-48 overflow-y-auto bg-gray-900 text-gray-100 p-4 rounded-lg">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {debugInfo || 'No debug information available'}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
} 