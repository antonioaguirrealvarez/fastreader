import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { logger, LogCategory } from '../utils/logger';

export interface UserSettings {
  dark_mode: boolean;
  hide_header: boolean;
  display_mode: 'highlight' | 'spritz';
  font_size: 'small' | 'medium' | 'large' | 'extra-large';
  record_analytics: boolean;
  pause_on_punctuation: boolean;
}

export interface LocalSettings {
  darkMode: boolean;
  hideHeader: boolean;
  displayMode: 'highlight' | 'spritz';
  fontSize: string;
  recordAnalytics: boolean;
  pauseOnPunctuation: boolean;
}

interface SettingsState {
  settings: UserSettings | null;
  localSettings: LocalSettings | null;
  isLoading: boolean;
  error: string | null;
  loadSettings: (userId: string) => Promise<void>;
  updateLocalSettings: (newSettings: Partial<LocalSettings>, userId: string) => void;
}

const DEFAULT_SETTINGS: LocalSettings = {
  darkMode: true,
  hideHeader: false,
  displayMode: 'spritz',
  fontSize: 'extra-large',
  recordAnalytics: true,
  pauseOnPunctuation: true,
};

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const SETTINGS_UPDATE_DELAY = 10000; // 10 seconds

let updateTimer: NodeJS.Timeout | null = null;

function localToDbSettings(localSettings: LocalSettings): Omit<UserSettings, 'id'> {
  return {
    dark_mode: localSettings.darkMode,
    hide_header: localSettings.hideHeader,
    display_mode: localSettings.displayMode,
    font_size: localSettings.fontSize as UserSettings['font_size'],
    record_analytics: localSettings.recordAnalytics,
    pause_on_punctuation: localSettings.pauseOnPunctuation,
  };
}

function dbToLocalSettings(dbSettings: UserSettings): LocalSettings {
  return {
    darkMode: dbSettings.dark_mode,
    hideHeader: dbSettings.hide_header,
    displayMode: dbSettings.display_mode,
    fontSize: dbSettings.font_size,
    recordAnalytics: dbSettings.record_analytics,
    pauseOnPunctuation: dbSettings.pause_on_punctuation,
  };
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (attempts <= 1) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOperation(operation, attempts - 1, delay * 2);
  }
}

async function updateSupabaseSettings(userId: string, settings: LocalSettings) {
  try {
    const dbSettings = localToDbSettings(settings);
    
    await retryOperation(async () => {
      const { error } = await supabase
        .from('user_settings')
        .update(dbSettings)
        .eq('id', userId);

      if (error) throw error;
    });

    logger.debug(LogCategory.SETTINGS, 'Settings synced to Supabase', {
      userId,
      settings: dbSettings
    });
  } catch (error) {
    logger.error(LogCategory.SETTINGS, 'Failed to sync settings to Supabase after retries', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // We don't rethrow the error as per requirements - just log and continue
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  localSettings: DEFAULT_SETTINGS, // Initialize with default settings
  isLoading: false,
  error: null,

  loadSettings: async (userId: string) => {
    if (!userId) return;

    set({ isLoading: true, error: null });
    
    try {
      const result = await retryOperation(async () => {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        return data;
      });

      const localSettings = result ? dbToLocalSettings(result) : DEFAULT_SETTINGS;
      
      set({ 
        settings: result,
        localSettings,
        isLoading: false 
      });

      logger.debug(LogCategory.SETTINGS, 'Settings loaded', { 
        userId,
        hasSettings: !!result,
        usingDefaults: !result
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load settings';
      logger.error(LogCategory.SETTINGS, 'Failed to load settings, using defaults', {
        userId,
        error: errorMessage
      });
      
      set({ 
        error: errorMessage,
        isLoading: false,
        localSettings: DEFAULT_SETTINGS // Fallback to defaults on error
      });
    }
  },

  updateLocalSettings: (newSettings: Partial<LocalSettings>, userId: string) => {
    set((state) => {
      if (!state.localSettings) return state;

      const updatedSettings = {
        ...state.localSettings,
        ...newSettings
      };

      // Clear existing timer if any
      if (updateTimer) {
        clearTimeout(updateTimer);
      }

      // Set new timer for Supabase update
      updateTimer = setTimeout(() => {
        updateSupabaseSettings(userId, updatedSettings);
        updateTimer = null;
      }, SETTINGS_UPDATE_DELAY);

      return {
        ...state,
        localSettings: updatedSettings
      };
    });
  }
})); 