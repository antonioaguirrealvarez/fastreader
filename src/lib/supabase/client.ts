import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
import { loggingCore, LogCategory } from '../../services/logging/core';

export class SupabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

class SupabaseClient {
  private static instance: SupabaseClient;
  private client: ReturnType<typeof createClient<Database>>;
  private readonly MAX_RETRIES = 3;
  private readonly DEFAULT_SETTINGS: Omit<SettingsData, 'user_id'> = {
    dark_mode: true,
    hide_header: false,
    display_mode: 'spritz',
    font_size: 'medium',
    record_analytics: true,
    pause_on_punctuation: true
  };

  private constructor() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase configuration');
    }
    
    this.client = createClient<Database>(url, key);
  }

  static getInstance() {
    if (!SupabaseClient.instance) {
      SupabaseClient.instance = new SupabaseClient();
    }
    return SupabaseClient.instance;
  }

  private async handleRequest<T>(
    operation: string,
    callback: () => Promise<T>,
    retries = 0
  ): Promise<T> {
    try {
      const result = await callback();
      return result;
    } catch (error) {
      const supabaseError = error as any;
      loggingCore.log(LogCategory.ERROR, `${operation}_error`, {
        error: {
          message: supabaseError.message,
          code: supabaseError.code,
          details: supabaseError.details,
          hint: supabaseError.hint
        },
        attempt: retries + 1
      });

      if (retries < this.MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
        return this.handleRequest(operation, callback, retries + 1);
      }

      throw new SupabaseError(
        supabaseError.message || 'Unknown error',
        supabaseError.code,
        supabaseError.details
      );
    }
  }

  // Progress Operations
  async upsertProgress(data: ProgressData) {
    return this.handleRequest('progress_update', async () => {
      // First check if record exists
      const { data: existing } = await this.client
        .from('reading_progress')
        .select('id')
        .eq('user_id', data.user_id)
        .eq('file_id', data.file_id)
        .single();

      const payload = {
        ...data,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // Update
        const { data: result, error } = await this.client
          .from('reading_progress')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        // Insert
        const { data: result, error } = await this.client
          .from('reading_progress')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    });
  }

  async getProgress(userId: string, fileId: string) {
    return this.handleRequest('progress_fetch', async () => {
      const { data, error } = await this.client
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('file_id', fileId)
        .maybeSingle();

      if (error) throw error;
      return data;
    });
  }

  // Settings Operations
  async upsertSettings(data: Partial<SettingsData> & { user_id: string }) {
    return this.handleRequest('settings_update', async () => {
      // Ensure we're only using snake_case column names
      const validColumns = [
        'user_id',
        'dark_mode',
        'hide_header',
        'display_mode',
        'font_size',
        'record_analytics',
        'pause_on_punctuation'
      ];

      // Filter out any invalid columns
      const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
        if (validColumns.includes(key)) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      // First check if settings exist
      const { data: existing } = await this.client
        .from('user_settings')
        .select('id')
        .eq('user_id', data.user_id)
        .single();

      if (existing) {
        const { data: result, error } = await this.client
          .from('user_settings')
          .update(sanitizedData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await this.client
          .from('user_settings')
          .insert({
            ...this.DEFAULT_SETTINGS,
            ...sanitizedData
          })
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    });
  }

  async getSettings(userId: string) {
    return this.handleRequest('settings_fetch', async () => {
      const { data, error } = await this.client
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    });
  }

  async getAllProgress(userId: string) {
    return this.handleRequest('progress_fetch_all', async () => {
      const { data, error } = await this.client
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    });
  }
}

export const supabase = SupabaseClient.getInstance(); 