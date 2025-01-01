import { create } from 'zustand';

export interface ReaderSettings {
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  pauseOnPunctuation: boolean;
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  wordSpacing: 'normal' | 'wide' | 'wider';
  autoScroll: boolean;
}

interface ReaderSettingsState {
  settings: ReaderSettings;
  updateSettings: (settings: Partial<ReaderSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  darkMode: false,
  fontSize: 'medium',
  pauseOnPunctuation: true,
  lineSpacing: 'relaxed',
  wordSpacing: 'wide',
  autoScroll: true,
};

export const useReaderSettings = create<ReaderSettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  updateSettings: (newSettings) => 
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    })),
  resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
})); 