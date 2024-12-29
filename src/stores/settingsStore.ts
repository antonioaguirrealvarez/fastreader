import { create } from 'zustand';
import { settingsService } from '../services/database/settings';

interface SettingsState {
  settings: ReaderSettings;
  isLoading: boolean;
  error: string | null;
  loadSettings: (userId: string) => Promise<void>;
  updateSettings: (settings: Partial<ReaderSettings>, userId: string) => Promise<void>;
}

const DEFAULT_SETTINGS: LocalSettings = {
  darkMode: true,
  hideHeader: false,
  displayMode: 'spritz',
  fontSize: 'extra-large',
  recordAnalytics: true,
  pauseOnPunctuation: true,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,

  loadSettings: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const settings = await settingsService.getSettings(userId);
      
      if (settings) {
        set({ 
          settings: {
            ...DEFAULT_SETTINGS,
            ...settingsService.convertToCamelCase(settings)
          },
          isLoading: false 
        });
      }
    } catch (error) {
      set({ 
        error: 'Failed to load settings',
        isLoading: false,
        settings: DEFAULT_SETTINGS
      });
    }
  },

  updateSettings: async (newSettings: Partial<ReaderSettings>, userId: string) => {
    try {
      const currentSettings = useSettingsStore.getState().settings;
      const updatedSettings = {
        ...currentSettings,
        ...newSettings
      };

      set({ settings: updatedSettings });

      await settingsService.updateSettings({
        user_id: userId,
        ...settingsService.convertToSnakeCase(updatedSettings)
      });
    } catch (error) {
      // Error handled by service
    }
  }
})); 