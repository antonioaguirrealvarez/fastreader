export const cleanText = (text: string): string => {
  return text
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