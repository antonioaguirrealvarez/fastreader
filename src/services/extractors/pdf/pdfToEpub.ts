import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { processPageContent } from './utils';
import { ExtractionOptions } from '../types';

export async function convertPDFToEPUB(
  file: File,
  options: ExtractionOptions,
  onProgress?: (progress: number) => void
): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  
  // Add container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles>
        <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
      </rootfiles>
    </container>`);
  
  // Extract content from PDF
  const chapters = [];
  let totalWordCount = 0;
  
  for (let i = 1; i <= pdf.numPages; i++) {
    if (onProgress) {
      onProgress((i / pdf.numPages) * 0.5); // First 50% for PDF processing
    }

    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    const { processedText: text, title } = await processPageContent(content, i, options);

    const wordCount = text.trim().split(/\s+/).length;
    totalWordCount += wordCount;
    
    chapters.push({ text, title, wordCount });
  }
  
  // Create content files
  chapters.forEach((chapter, index) => {
    if (onProgress) {
      onProgress(0.5 + (index / chapters.length) * 0.5); // Last 50% for EPUB creation
    }

    const htmlContent = `<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE html>
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>${chapter.title}</title>
        </head>
        <body>
          <h1>${chapter.title}</h1>
          ${chapter.text.split('\n').map(p => `<p>${p}</p>`).join('\n')}
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
  return new File([epubBlob], file.name.replace('.pdf', '.epub'), {
    type: 'application/epub+zip'
  });
} 