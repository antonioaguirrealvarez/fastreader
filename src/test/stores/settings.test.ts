import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useSettingsStore } from '../../stores/settingsStore';
import { settingsService } from '../../services/database/settings';

// Mock the settings service
vi.mock('../../services/database/settings', () => ({
  settingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    convertToCamelCase: vi.fn((settings) => ({
      darkMode: settings.dark_mode,
      hideHeader: settings.hide_header,
      displayMode: settings.display_mode,
      fontSize: settings.font_size,
      recordAnalytics: settings.record_analytics,
      pauseOnPunctuation: settings.pause_on_punctuation,
    })),
    convertToSnakeCase: vi.fn((settings) => ({
      dark_mode: settings.darkMode,
      hide_header: settings.hideHeader,
      display_mode: settings.displayMode,
      font_size: settings.fontSize,
      record_analytics: settings.recordAnalytics,
      pause_on_punctuation: settings.pauseOnPunctuation,
    })),
  },
}));

describe('Settings Store', () => {
  const mockUserId = 'test-user-id';
  
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset the store state
    act(() => {
      useSettingsStore.setState({
        settings: {
          darkMode: true,
          hideHeader: false,
          displayMode: 'spritz',
          fontSize: 'extra-large',
          recordAnalytics: true,
          pauseOnPunctuation: true,
        },
        isLoading: false,
        error: null,
      });
    });
  });

  describe('loadSettings', () => {
    it('should load settings successfully', async () => {
      const mockSettings = {
        dark_mode: false,
        hide_header: true,
        display_mode: 'full-text',
        font_size: 'medium',
        record_analytics: true,
        pause_on_punctuation: true,
      };

      (settingsService.getSettings as any).mockResolvedValueOnce(mockSettings);

      await act(async () => {
        await useSettingsStore.getState().loadSettings(mockUserId);
      });

      expect(settingsService.getSettings).toHaveBeenCalledWith(mockUserId);
      expect(useSettingsStore.getState().settings).toMatchObject({
        darkMode: false,
        hideHeader: true,
        displayMode: 'full-text',
        fontSize: 'medium',
      });
      expect(useSettingsStore.getState().isLoading).toBe(false);
      expect(useSettingsStore.getState().error).toBeNull();
    });

    it('should handle loading error gracefully', async () => {
      (settingsService.getSettings as any).mockRejectedValueOnce(new Error('Failed to load'));

      await act(async () => {
        await useSettingsStore.getState().loadSettings(mockUserId);
      });

      expect(settingsService.getSettings).toHaveBeenCalledWith(mockUserId);
      expect(useSettingsStore.getState().error).toBe('Failed to load settings');
      expect(useSettingsStore.getState().isLoading).toBe(false);
      // Should fall back to default settings
      expect(useSettingsStore.getState().settings).toMatchObject({
        darkMode: true,
        hideHeader: false,
        displayMode: 'spritz',
        fontSize: 'extra-large',
        recordAnalytics: true,
        pauseOnPunctuation: true,
      });
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const newSettings = {
        darkMode: false,
        fontSize: 'small',
      };

      await act(async () => {
        await useSettingsStore.getState().updateSettings(newSettings, mockUserId);
      });

      expect(settingsService.updateSettings).toHaveBeenCalled();
      expect(useSettingsStore.getState().settings).toMatchObject({
        ...useSettingsStore.getState().settings,
        ...newSettings,
      });
      expect(useSettingsStore.getState().error).toBeNull();
    });

    it('should handle partial updates', async () => {
      const initialState = useSettingsStore.getState().settings;
      const partialUpdate = { darkMode: false };

      await act(async () => {
        await useSettingsStore.getState().updateSettings(partialUpdate, mockUserId);
      });

      expect(useSettingsStore.getState().settings).toMatchObject({
        ...initialState,
        ...partialUpdate,
      });
    });

    it('should maintain state on update failure', async () => {
      const initialState = useSettingsStore.getState().settings;
      (settingsService.updateSettings as any).mockRejectedValueOnce(new Error('Update failed'));

      const newSettings = { darkMode: false };

      await act(async () => {
        await useSettingsStore.getState().updateSettings(newSettings, mockUserId);
      });

      // Local state should still be updated even if server update fails
      expect(useSettingsStore.getState().settings).toMatchObject({
        ...initialState,
        ...newSettings,
      });
    });
  });
}); 