import { ExtractionOptions } from '../types';
import { cleanText } from '../../../utils/textUtils';

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
}

interface TextContent {
  items: TextItem[];
}

export const isHeaderOrFooter = (item: TextItem, pageHeight: number): boolean => {
  const y = item.transform[5];
  return y > pageHeight * 0.9 || y < pageHeight * 0.1;
};

export const isPageNumber = (str: string, y: number, pageHeight: number): boolean => {
  const cleanStr = str.trim();
  const num = parseInt(cleanStr);

  if (isNaN(num)) return false;
  if (num >= 1900 && num <= 2100 && cleanStr.length === 4) return false;
  if (num > 1000) return false;

  const isPagePosition = y > pageHeight * 0.9 || y < pageHeight * 0.1;
  return isPagePosition && num < 200;
};

export const processPageContent = async (
  content: TextContent, 
  pageNum: number,
  options: ExtractionOptions
): Promise<{ processedText: string; title: string }> => {
  const { height } = content.items[0]?.transform?.[5] 
    ? { height: Math.max(...content.items.map((item: TextItem) => item.transform[5])) } 
    : { height: 1000 };
  
  // Group items by their vertical position
  const lineGroups = new Map<number, TextItem[]>();
  const lineHeight = 12;
  
  content.items
    .filter((item: TextItem) => {
      if (options.removeHeaders && isHeaderOrFooter(item, height)) {
        return false;
      }
      if (options.removePageNumbers && isPageNumber(item.str, item.transform[5], height)) {
        return false;
      }
      return true;
    })
    .forEach((item: TextItem) => {
      const y = Math.round(item.transform[5] / lineHeight) * lineHeight;
      if (!lineGroups.has(y)) {
        lineGroups.set(y, []);
      }
      lineGroups.get(y)?.push(item);
    });

  // Sort lines from top to bottom and items from left to right
  const sortedLines = Array.from(lineGroups.entries())
    .sort(([y1], [y2]) => y2 - y1)
    .map(([, items]) => items.sort((a, b) => a.transform[4] - b.transform[4]));

  // Process text
  let processedText = '';
  sortedLines.forEach(line => {
    const lineText = cleanText(line.map(item => item.str).join(' '));
    if (lineText) {
      processedText += lineText + '\n';
    }
  });

  // Find title (first non-empty line that's not a number)
  const title = cleanText(
    sortedLines.find(line => {
      const lineText = line.map(item => item.str).join(' ').trim();
      return lineText && !/^\d+$/.test(lineText);
    })?.map(item => item.str).join(' ').trim() || `Page ${pageNum}`
  );

  return { processedText, title };
}; 