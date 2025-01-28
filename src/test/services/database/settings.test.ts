import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { settingsService } from '../../../services/database/settings';
import { supabase } from '../../../lib/supabase/client';
import { SettingsData } from '../../../types/supabase';

// Mock Supabase client
vi.mock('../../../lib/supabase/client', () => ({
  supabase: {
    getSettings: vi.fn(),
    upsertSettings: vi.fn(),
  },
}));

// Use a valid UUID format that matches Supabase's user format
const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockSettingsId = '123e4567-e89b-12d3-a456-426614174000';

// Mock crypto for UUID generation
vi.stubGlobal('crypto', {
  randomUUID: () => mockSettingsId,
});

// Settings schema for validation
const SettingsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  dark_mode: z.boolean(),
  hide_header: z.boolean(),
  display_mode: z.enum(['spritz', 'highlight']),
  font_size: z.string(),
  record_analytics: z.boolean(),
  pause_on_punctuation: z.boolean(),
  words_per_minute: z.number(),
});

describe('Settings Service', () => {
  const defaultSettings: SettingsData = {
    id: mockSettingsId,
    user_id: mockUserId,
    dark_mode: true,
    hide_header: false,
    display_mode: 'spritz',
    font_size: 'medium',
    record_analytics: true,
    pause_on_punctuation: true,
    words_per_minute: 300,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    settingsService.clearCache(mockUserId);
    
    // Reset mock implementations
    (supabase.getSettings as any).mockReset();
    (supabase.upsertSettings as any).mockReset();
    
    // Setup default mock implementations with proper user context
    (supabase.getSettings as any).mockResolvedValue({
      ...defaultSettings,
      id: mockSettingsId,
      user_id: mockUserId,
    });
    (supabase.upsertSettings as any).mockImplementation((settings: SettingsData) => 
      Promise.resolve({
        ...settings,
        id: settings.id || mockSettingsId,
        user_id: settings.user_id || mockUserId,
      })
    );
  });

  describe('Basic Operations', () => {
    it('should get settings successfully', async () => {
      const result = await settingsService.getSettings(mockUserId);
      
      expect(result).toEqual(defaultSettings);
      expect(supabase.getSettings).toHaveBeenCalledWith(mockUserId);
    });

    it('should update settings successfully', async () => {
      console.log('Starting settings update test');
      const updateData: Partial<SettingsData> & { user_id: string } = {
        user_id: mockUserId,
        dark_mode: false,
        font_size: 'large',
      };
      console.log('Update data:', updateData);

      const updatedSettings = {
        ...defaultSettings,
        ...updateData,
      };
      console.log('Expected updated settings:', updatedSettings);

      // Mock getSettings to return settings with valid UUID
      console.log('Setting up getSettings mock');
      (supabase.getSettings as any).mockResolvedValueOnce({
        ...defaultSettings,
        id: mockSettingsId,
        user_id: mockUserId,
      });

      console.log('Setting up upsertSettings mock');
      (supabase.upsertSettings as any).mockResolvedValueOnce(updatedSettings);

      console.log('Calling updateSettings');
      await settingsService.updateSettings(updateData);
      
      console.log('Verifying upsertSettings call');
      console.log('upsertSettings mock calls:', (supabase.upsertSettings as any).mock.calls);
      expect(supabase.upsertSettings).toHaveBeenCalledWith(updatedSettings);
    });

    it('should handle bulk updates', async () => {
      console.log('Starting bulk update test');
      const bulkUpdate: Partial<SettingsData> & { user_id: string } = {
        user_id: mockUserId,
        dark_mode: false,
        hide_header: true,
        font_size: 'small',
        display_mode: 'highlight',
      };
      console.log('Bulk update data:', bulkUpdate);

      const updatedSettings = {
        ...defaultSettings,
        ...bulkUpdate,
      };
      console.log('Expected updated settings:', updatedSettings);

      // Mock getSettings to return settings with valid UUID
      console.log('Setting up getSettings mock');
      (supabase.getSettings as any).mockResolvedValueOnce({
        ...defaultSettings,
        id: mockSettingsId,
        user_id: mockUserId,
      });

      console.log('Setting up upsertSettings mock');
      (supabase.upsertSettings as any).mockResolvedValueOnce(updatedSettings);

      console.log('Calling updateSettings');
      await settingsService.updateSettings(bulkUpdate);
      
      console.log('Verifying upsertSettings call');
      console.log('upsertSettings mock calls:', (supabase.upsertSettings as any).mock.calls);
      expect(supabase.upsertSettings).toHaveBeenCalledWith(updatedSettings);
    });
  });

  describe('Schema Validation', () => {
    it('should validate required fields', async () => {
      const invalidSettings = {
        id: 'test-id',
        user_id: 'test-user',
        dark_mode: true,
        // Missing required fields
      };

      await expect(
        SettingsSchema.parseAsync(invalidSettings)
      ).rejects.toThrow();
    });

    it('should validate field types', async () => {
      const invalidSettings = {
        ...defaultSettings,
        dark_mode: 'true', // Should be boolean
      };

      await expect(
        SettingsSchema.parseAsync(invalidSettings)
      ).rejects.toThrow();
    });

    it('should validate enum values', async () => {
      const invalidSettings = {
        ...defaultSettings,
        display_mode: 'invalid-mode',
      };

      await expect(
        SettingsSchema.parseAsync(invalidSettings)
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      const mockError = new Error('Database error');
      (supabase.getSettings as any).mockRejectedValueOnce(mockError);

      const result = await settingsService.getSettings(mockUserId);
      
      // Should return default settings with a new UUID
      expect(result).toEqual({
        ...defaultSettings,
        id: mockSettingsId
      });
      expect(supabase.getSettings).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle timeout errors', async () => {
      // Mock a timeout by not resolving the promise
      (supabase.getSettings as any).mockImplementationOnce(() => new Promise(() => {}));

      const result = await settingsService.getSettings(mockUserId);
      
      // Should return default settings after timeout
      expect(result).toEqual({
        ...defaultSettings,
        id: mockSettingsId
      });
      expect(supabase.getSettings).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle non-existent user settings', async () => {
      (supabase.getSettings as any).mockResolvedValueOnce(null);

      const result = await settingsService.getSettings(mockUserId);
      
      expect(result).toEqual({
        ...defaultSettings,
        id: mockSettingsId
      });
      expect(supabase.getSettings).toHaveBeenCalledWith(mockUserId);
      expect(supabase.upsertSettings).toHaveBeenCalledWith({
        ...defaultSettings,
        id: mockSettingsId
      });
    });
  });

  describe('Caching', () => {
    it('should use cached settings when available', async () => {
      // First call to populate cache
      (supabase.getSettings as any).mockResolvedValueOnce(defaultSettings);
      await settingsService.getSettings(mockUserId);

      // Second call should use cache
      const result = await settingsService.getSettings(mockUserId);
      
      expect(result).toEqual(defaultSettings);
      expect(supabase.getSettings).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should clear cache when requested', async () => {
      // First call to populate cache
      (supabase.getSettings as any).mockResolvedValueOnce(defaultSettings);
      await settingsService.getSettings(mockUserId);

      // Clear cache
      settingsService.clearCache(mockUserId);

      // Next call should hit DB again
      (supabase.getSettings as any).mockResolvedValueOnce(defaultSettings);
      await settingsService.getSettings(mockUserId);
      
      expect(supabase.getSettings).toHaveBeenCalledTimes(2);
    });
  });
}); 