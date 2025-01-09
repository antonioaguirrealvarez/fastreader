import { create } from 'zustand';
import { settingsService } from '../services/database/settings';
import { progressService } from '../services/database/progress';

interface ReaderSettings {
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  pauseOnPunctuation: boolean;
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  wordSpacing: 'normal' | 'wide' | 'wider';
  autoScroll: boolean;
  displayMode: 'highlight' | 'spritz' | 'full-text';
  hideHeader: boolean;
  recordAnalytics: boolean;
}

interface ReaderProgress {
  currentWordIndex: number;
  totalWords: number;
  isPlaying: boolean;
  wordsPerMinute: number;
}

interface ReaderState {
  // Settings
  settings: ReaderSettings;
  loadSettings: (userId: string) => Promise<void>;
  updateSettings: (newSettings: Partial<ReaderSettings>, userId: string) => Promise<void>;
  
  // Progress
  progress: ReaderProgress;
  updateProgress: (newProgress: Partial<ReaderProgress>) => void;
  saveProgress: (userId: string, fileId: string) => Promise<void>;
  loadProgress: (userId: string, fileId: string) => Promise<void>;
  
  // File Info
  fileId: string | null;
  fileName: string | null;
  content: string | null;
  currentMode: 'library' | 'rsvp' | 'full-text' | null;
  setFileInfo: (info: { 
    fileId: string; 
    fileName: string; 
    content?: string;
    mode?: 'rsvp' | 'full-text' 
  }) => void;
  clearFileInfo: () => void;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  darkMode: false,
  fontSize: 'medium',
  pauseOnPunctuation: true,
  lineSpacing: 'relaxed',
  wordSpacing: 'wide',
  autoScroll: true,
  displayMode: 'full-text',
  hideHeader: false,
  recordAnalytics: true,
};

const DEFAULT_PROGRESS: ReaderProgress = {
  currentWordIndex: 0,
  totalWords: 0,
  isPlaying: false,
  wordsPerMinute: 300,
};

export const useReaderStore = create<ReaderState>((set, get) => ({
  // Settings
  settings: DEFAULT_SETTINGS,
  loadSettings: async (userId: string) => {
    try {
      const savedSettings = await settingsService.getSettings(userId);
      if (savedSettings) {
        set({ settings: { ...DEFAULT_SETTINGS, ...savedSettings } });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },
  updateSettings: async (newSettings: Partial<ReaderSettings>, userId: string) => {
    try {
      const updatedSettings = { ...get().settings, ...newSettings };
      set({ settings: updatedSettings });
      await settingsService.updateSettings({ ...updatedSettings, user_id: userId });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },

  // Progress
  progress: DEFAULT_PROGRESS,
  updateProgress: (newProgress: Partial<ReaderProgress>) => {
    set({ progress: { ...get().progress, ...newProgress } });
  },
  saveProgress: async (userId: string, fileId: string) => {
    try {
      const { currentWordIndex, totalWords, wordsPerMinute } = get().progress;
      await progressService.updateProgress({
        user_id: userId,
        file_id: fileId,
        current_word: currentWordIndex,
        total_words: totalWords,
        reading_speed: wordsPerMinute
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  },
  loadProgress: async (userId: string, fileId: string) => {
    try {
      const savedProgress = await progressService.getProgress(userId, fileId);
      if (savedProgress) {
        set({
          progress: {
            ...get().progress,
            currentWordIndex: savedProgress.current_word,
            totalWords: savedProgress.total_words,
            wordsPerMinute: savedProgress.reading_speed || DEFAULT_PROGRESS.wordsPerMinute
          }
        });
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  },

  // File Info
  fileId: null,
  fileName: null,
  content: null,
  currentMode: null,
  setFileInfo: (info) => {
    set({ 
      fileId: info.fileId, 
      fileName: info.fileName,
      content: info.content || get().content,
      currentMode: info.mode || get().currentMode
    });
  },
  clearFileInfo: () => {
    set({ 
      fileId: null, 
      fileName: null, 
      content: null,
      currentMode: null 
    });
  }
})); 