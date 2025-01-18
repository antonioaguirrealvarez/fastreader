import { supabase, SupabaseError } from '../../lib/supabase/client';
import { SettingsData } from '../../types/supabase';
import { loggingCore, LogCategory } from '../logging/core';

class SettingsService {
  private cache: Map<string, SettingsData> = new Map();
  private readonly SETTINGS_TIMEOUT = 3000; // 3 seconds timeout
  private initializationInProgress: Map<string, Promise<void>> = new Map();

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
    // If initialization is already in progress for this user, wait for it
    if (this.initializationInProgress.has(userId)) {
        await this.initializationInProgress.get(userId);
        return;
    }

    const operationId = crypto.randomUUID();
    const initPromise = (async () => {
        try {
            loggingCore.log(LogCategory.SETTINGS, 'settings_init_started', {
                userId,
                operationId
            });

            // First try to get existing settings
            const existingSettings = await supabase.getSettings(userId);
            
            if (existingSettings) {
                loggingCore.log(LogCategory.SETTINGS, 'settings_already_exist', {
                    userId,
                    operationId
                });
                return;
            }

            // Create settings with proper UUID
            const settingsId = crypto.randomUUID();
            const defaultSettings = {
                ...this.DEFAULT_SETTINGS,
                id: settingsId,
                user_id: userId
            };

            await supabase.upsertSettings(defaultSettings);
            
            loggingCore.log(LogCategory.SETTINGS, 'settings_init_success', {
                userId,
                operationId,
                settingsId
            });
        } catch (error) {
            loggingCore.log(LogCategory.ERROR, 'settings_init_failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId,
                operationId
            });
            
            // Don't retry here - let the getSettings handle fallback
        } finally {
            // Clean up initialization state
            this.initializationInProgress.delete(userId);
        }
    })();

    // Store the promise
    this.initializationInProgress.set(userId, initPromise);
    
    // Wait for initialization to complete
    await initPromise;
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
        loggingCore.log(LogCategory.ERROR, 'settings_fetch_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          operationId
        });
      }

      // 3. If no settings exist or error, create new ones
      const settingsId = crypto.randomUUID();
      const defaultSettings = {
        id: settingsId,
        ...this.getDefaultSettings(userId)
      };
      
      try {
        const result = await supabase.upsertSettings(defaultSettings);
        if (result) {
          this.cache.set(userId, result);
          loggingCore.log(LogCategory.SETTINGS, 'settings_created_success', {
            userId,
            operationId,
            settingsId
          });
          return result;
        }
      } catch (error) {
        loggingCore.log(LogCategory.ERROR, 'settings_creation_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          operationId
        });
      }

      // 4. If all else fails, return default settings with a new UUID
      const fallbackSettings = {
        ...defaultSettings,
        id: crypto.randomUUID() // Always generate new UUID for fallback
      };

      loggingCore.log(LogCategory.SETTINGS, 'using_fallback_settings', {
        userId,
        operationId,
        settingsId: fallbackSettings.id
      });
      return fallbackSettings;

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'settings_critical_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operationId
      });
      
      // Return defaults with a new UUID as fallback
      return {
        ...this.getDefaultSettings(userId),
        id: crypto.randomUUID()
      };
    }
  }

  async updateSettings(settings: Partial<SettingsData> & { user_id: string }): Promise<void> {
    const operationId = crypto.randomUUID();
    const userId = settings.user_id;

    try {
      // Get current settings (this will create them if they don't exist)
      const currentSettings = await this.getSettings(userId);
      
      // Only proceed with update if we have a valid ID (not a temporary one)
      if (!currentSettings.id || currentSettings.id.length !== 36) {
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

  /**
   * Ensures settings exist for a user, similar to book progress initialization.
   * This is called when the library component mounts.
   */
  async ensureLibrarySettings(userId: string): Promise<SettingsData> {
    const operationId = crypto.randomUUID();
    
    try {
      // First, check if settings already exist
      const existingSettings = await supabase.getSettings(userId);
      
      if (existingSettings) {
        this.cache.set(userId, existingSettings);
        loggingCore.log(LogCategory.SETTINGS, 'library_settings_exist', {
          userId,
          operationId
        });
        return existingSettings;
      }

      // If no settings exist, create new ones using user's ID
      const defaultSettings = {
        id: userId, // Use user's ID instead of random UUID
        user_id: userId,
        ...this.DEFAULT_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const result = await supabase.upsertSettings(defaultSettings);
        
        if (result) {
          this.cache.set(userId, result);
          loggingCore.log(LogCategory.SETTINGS, 'library_settings_created', {
            userId,
            operationId,
            settingsId: result.id
          });
          return result;
        }
      } catch (error) {
        // If we get a duplicate key error, try to fetch the settings again
        if (error instanceof SupabaseError && error.code === '23505') {
          const retrySettings = await supabase.getSettings(userId);
          if (retrySettings) {
            this.cache.set(userId, retrySettings);
            return retrySettings;
          }
        }
        throw error;
      }

      // If creation failed, return default settings
      loggingCore.log(LogCategory.ERROR, 'library_settings_creation_failed', {
        userId,
        operationId
      });
      return defaultSettings;

    } catch (error) {
      loggingCore.log(LogCategory.ERROR, 'library_settings_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        operationId
      });
      
      // Return defaults with user's ID as fallback
      return {
        id: userId, // Use user's ID instead of random UUID
        user_id: userId,
        ...this.DEFAULT_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }
}

export const settingsService = new SettingsService(); 