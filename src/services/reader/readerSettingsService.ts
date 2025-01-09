import { create } from 'zustand';

export interface ReaderSettings {
  darkMode: boolean;
  hideHeader: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  wordSpacing: 'normal' | 'wide' | 'wider';
  pauseOnPunctuation: boolean;
  autoScroll: boolean;
  chunkInPages: boolean;
  holdInMemory: boolean;
  boldLetters?: boolean;
}

interface ReaderSettingsState {
  settings: ReaderSettings;
  updateSettings: (settings: Partial<ReaderSettings>) => void;
  resetSettings: () => void;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  darkMode: false,
  hideHeader: false,
  fontSize: 'medium',
  lineSpacing: 'relaxed',
  wordSpacing: 'wide',
  pauseOnPunctuation: true,
  autoScroll: true,
  chunkInPages: true,
  holdInMemory: false
};

export const useReaderSettings = create<ReaderSettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  updateSettings: (newSettings) => 
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    })),
  resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
})); 