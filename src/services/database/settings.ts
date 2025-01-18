import { supabase } from '../../lib/supabase/client';
import { SettingsData } from '../../types/supabase';
import { loggingCore, LogCategory } from '../logging/core';

class SettingsService {
  private cache: Map<string, SettingsData> = new Map();
  private readonly SETTINGS_TIMEOUT = 3000; // 3 seconds timeout

  private readonly DEFAULT_SETTINGS: Omit<SettingsData, 'user_id' | 'id'> = {
    dark_mode: true,
    hide_header: false,
    display_mode: 'spritz',
    font_size: 'medium',
    record_analytics: true,
    pause_on_punctuation: true,
    words_per_minute: 300
  };

  private getDefaultSettings(userId: string): Omit<SettingsData, 'id'> {
    return {
      ...this.DEFAULT_SETTINGS,
      user_id: userId
    };
  }

  async initializeUserSettings(userId: string): Promise<void> {
    const operationId = crypto.randomUUID();
    
    loggingCore.log(LogCategory.SETTINGS, 'settings_init_started', {
      userId,
      operationId
    });

    try {
      // This will trigger our robust get/create flow
      await this.getSettings(userId);
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'settings_init_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operationId
      });
      // Even if initialization fails, the getSettings call will still return defaults
    }
  }

  async getSettings(userId: string): Promise<SettingsData> {
    const operationId = crypto.randomUUID();
    
    try {
      // 1. Check cache first (fastest)
      if (this.cache.has(userId)) {
        loggingCore.log(LogCategory.SETTINGS, 'settings_from_cache', {
          userId,
          operationId
        });
        return this.cache.get(userId)!;
      }

      // 2. Try to get from database with timeout
      try {
        const settingsPromise = supabase.getSettings(userId);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Settings fetch timeout')), this.SETTINGS_TIMEOUT);
        });

        const data = await Promise.race([settingsPromise, timeoutPromise]) as SettingsData | null;
        
        if (data) {
          this.cache.set(userId, data);
          loggingCore.log(LogCategory.SETTINGS, 'settings_from_db', {
            userId,
            operationId
          });
          return data;
        }
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'settings_fetch_timeout', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          operationId
        });
      }

      // 3. If no settings exist or timeout, create them asynchronously and return defaults
      const defaultSettings = this.getDefaultSettings(userId);
      
      // Try to create settings in background
      this.createSettingsAsync(userId, operationId);

      // Return defaults immediately with a temporary id
      const tempSettings = {
        ...defaultSettings,
        id: -1 // Temporary ID until actual settings are created
      };

      loggingCore.log(LogCategory.SETTINGS, 'settings_using_defaults', {
        userId,
        operationId,
        reason: 'no_settings_found'
      });
      return tempSettings;

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'settings_critical_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operationId
      });
      
      // Return defaults on any error with a temporary id
      return {
        ...this.getDefaultSettings(userId),
        id: -1
      };
    }
  }

  private async createSettingsAsync(userId: string, operationId: string): Promise<void> {
    try {
      const defaultSettings = this.getDefaultSettings(userId);
      const result = await supabase.upsertSettings(defaultSettings);
      
      if (result) {
        this.cache.set(userId, result);
        loggingCore.log(LogCategory.SETTINGS, 'settings_created_async', {
          userId,
          operationId
        });
      }
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'settings_creation_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operationId
      });
    }
  }

  async updateSettings(settings: Partial<SettingsData> & { user_id: string }): Promise<void> {
    const operationId = crypto.randomUUID();
    const userId = settings.user_id;

    try {
      // Get current settings (this will create them if they don't exist)
      const currentSettings = await this.getSettings(userId);
      
      // Only proceed with update if we have a valid ID
      if (currentSettings.id === -1) {
        loggingCore.log(LogCategory.SETTINGS, 'settings_update_skipped', {
          userId,
          operationId,
          reason: 'no_valid_id'
        });
        return;
      }

      // Merge new settings
      const updatedSettings = {
        ...currentSettings,
        ...settings
      };

      const result = await supabase.upsertSettings(updatedSettings);
      
      if (result) {
        this.cache.set(userId, result);
        loggingCore.log(LogCategory.SETTINGS, 'settings_updated', {
          userId,
          operationId
        });
      }
    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'settings_update_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operationId
      });
    }
  }

  clearCache(userId: string) {
    this.cache.delete(userId);
  }
}

export const settingsService = new SettingsService(); 