import { supabase } from '../../lib/supabase/client';
import { SettingsData } from '../../types/supabase';
import { loggingCore, LogCategory } from '../logging/core';

class SettingsService {
  private cache: Map<string, SettingsData> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  private pendingSettings: Map<string, Partial<SettingsData>> = new Map();
  private readonly SETTINGS_UPDATE_DELAY = 10000;

  private readonly DEFAULT_SETTINGS: Omit<SettingsData, 'user_id'> = {
    dark_mode: true,
    hide_header: false,
    display_mode: 'spritz',
    font_size: 'medium',
    record_analytics: true,
    pause_on_punctuation: true
  };

  private convertToSnakeCase(settings: ReaderSettings): Omit<SettingsData, 'user_id'> {
    return {
      dark_mode: settings.darkMode,
      hide_header: settings.hideHeader,
      display_mode: settings.displayMode,
      font_size: settings.fontSize,
      record_analytics: settings.recordAnalytics,
      pause_on_punctuation: settings.pauseOnPunctuation
    };
  }

  private convertToCamelCase(data: SettingsData): ReaderSettings {
    return {
      darkMode: data.dark_mode,
      hideHeader: data.hide_header,
      displayMode: data.display_mode,
      fontSize: data.font_size,
      recordAnalytics: data.record_analytics,
      pauseOnPunctuation: data.pause_on_punctuation
    };
  }

  async updateSettings(settings: Partial<SettingsData> & { user_id: string }): Promise<void> {
    const userId = settings.user_id;
    
    // Get or initialize pending settings for this user
    const currentPending = this.pendingSettings.get(userId) || {};
    
    // Merge new settings with existing pending settings
    this.pendingSettings.set(userId, {
      ...currentPending,
      ...settings
    });

    // Reset or start the timer
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(async () => {
      await this.flushPendingSettings();
    }, this.SETTINGS_UPDATE_DELAY);
  }

  private async flushPendingSettings(): Promise<void> {
    const pendingUpdates = new Map(this.pendingSettings);
    this.pendingSettings.clear();

    for (const [userId, settings] of pendingUpdates) {
      try {
        const fullSettings = {
          ...this.DEFAULT_SETTINGS,
          ...this.cache.get(userId),
          ...settings,
          user_id: userId
        };

        const result = await supabase.upsertSettings(fullSettings);
        
        if (result) {
          this.cache.set(userId, result);
          loggingCore.log(LogCategory.SETTINGS, 'settings_save_success', {
            userId,
            settings: result
          });
        }
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'settings_save_failed', {
          error: error instanceof Error ? {
            message: error.message,
            name: error.name,
            code: (error as any).code,
            details: (error as any).details,
            hint: (error as any).hint
          } : String(error),
          userId
        });
      }
    }
  }

  async initializeUserSettings(userId: string): Promise<void> {
    try {
      const existingSettings = await this.getSettings(userId);
      
      // Only create if no settings exist
      if (!existingSettings) {
        const defaultSettings = {
          ...this.DEFAULT_SETTINGS,
          user_id: userId
        };

        const result = await supabase.upsertSettings(defaultSettings);
        
        if (result) {
          this.cache.set(userId, result);
          loggingCore.log(LogCategory.SETTINGS, 'settings_initialized', {
            userId,
            settings: result
          });
        }
      }
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'settings_init_failed', {
        error,
        userId
      });
    }
  }

  async getSettings(userId: string): Promise<SettingsData | null> {
    try {
      // Check cache first
      if (this.cache.has(userId)) {
        return this.cache.get(userId)!;
      }

      const data = await supabase.getSettings(userId);
      
      if (data) {
        this.cache.set(userId, data);
        return data;
      }

      // If no settings exist, initialize them
      await this.initializeUserSettings(userId);
      return this.cache.get(userId) || null;
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'settings_fetch_failed', {
        error,
        userId
      });
      return null;
    }
  }

  clearCache(userId: string) {
    this.cache.delete(userId);
  }
}

export const settingsService = new SettingsService(); 