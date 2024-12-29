export const DEFAULT_SETTINGS: ReaderSettings = {
  darkMode: true,
  hideHeader: false,
  displayMode: 'spritz',
  fontSize: 'medium',
  recordAnalytics: true,
  pauseOnPunctuation: true
};

export interface ReaderSettings {
  darkMode: boolean;
  hideHeader: boolean;
  displayMode: 'highlight' | 'spritz';
  fontSize: string;
  recordAnalytics: boolean;
  pauseOnPunctuation: boolean;
} 