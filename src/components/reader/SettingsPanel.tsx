import React from 'react';
import { Type, Eye, Layout, BookOpen } from 'lucide-react';
import { Switch } from '../ui/Switch';
import { CloseButton } from '../ui/CloseButton';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { ReaderSettings } from '../../services/reader/readerSettingsService';
import { useReaderStore } from '../../stores/readerStore';
import { loggingCore, LogCategory } from '../../services/logging/core';

interface SettingsPanelProps {
  isOpen: boolean;
  settings: ReaderSettings & { boldLetters?: boolean };
  onClose: () => void;
  onUpdateSettings: (settings: Partial<ReaderSettings & { boldLetters?: boolean }>) => void;
  hideHeader?: boolean;
}

export function SettingsPanel({ 
  isOpen, 
  settings, 
  onClose, 
  onUpdateSettings,
  hideHeader
}: SettingsPanelProps) {
  const navigate = useNavigate();

  const handleModeChange = (mode: 'rsvp' | 'full-text') => {
    // Get current state first
    const currentState = useReaderStore.getState();
    const { fileId, fileName, content, currentMode: fromMode } = currentState;

    const operationId = loggingCore.startOperation(
      LogCategory.READING_STATE,
      'mode_change',
      {
        fromMode,
        toMode: mode,
        fileId,
        timestamp: Date.now()
      }
    );

    // Close settings panel
    onClose();
    
    if (!fileId || !fileName) {
      loggingCore.log(LogCategory.ERROR, 'mode_change_failed', {
        error: 'Missing file information',
        operationId,
        fileId,
        fileName
      });
      return;
    }

    // Update mode in readerStore
    useReaderStore.getState().setFileInfo({
      fileId,
      fileName,
      content: content || undefined,
      mode
    });
    
    // Navigate to appropriate route with content
    navigate('/reader', {
      state: { content }
    });

    loggingCore.endOperation(
      LogCategory.READING_STATE,
      'mode_change',
      operationId,
      {
        success: true,
        mode,
        fileId,
        fileName
      }
    );
  };

  // Determine current mode based on readerStore instead of route
  const currentMode = useReaderStore((state) => state.currentMode);
  const isRSVPMode = currentMode === 'rsvp';
  const isFullTextMode = currentMode === 'full-text';

  return (
    <div className={`
      fixed right-0 shadow-lg transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      ${hideHeader ? 'top-0 bottom-0' : 'top-16 bottom-16'}
      w-80
      ${settings.darkMode ? 'bg-gray-900' : 'bg-white'}
      z-40
    `}>
      <div className="h-full flex flex-col">
        <div className={`flex items-center justify-between p-4 border-b ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${settings.darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            Settings
          </h2>
          <CloseButton onClick={onClose} darkMode={settings.darkMode} />
        </div>

        <div className={`flex-1 overflow-y-auto p-4 ${settings.darkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <div className="space-y-6">
            {/* Reading Mode Section */}
            <div className="space-y-4">
              <h3 className={`text-sm font-medium flex items-center gap-2 ${
                settings.darkMode ? 'text-gray-200' : 'text-gray-900'
              }`}>
                <BookOpen className="h-4 w-4" />
                Reading Mode
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={isRSVPMode ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => handleModeChange('rsvp')}
                  className={`w-full ${settings.darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  RSVP Mode
                </Button>
                <Button
                  variant={isFullTextMode ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => handleModeChange('full-text')}
                  className={`w-full ${settings.darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  Full Text
                </Button>
              </div>
            </div>

            {/* Display Settings */}
            <div className="space-y-4">
              <h3 className={`text-sm font-medium flex items-center gap-2 ${
                settings.darkMode ? 'text-gray-200' : 'text-gray-900'
              }`}>
                <Type className="h-4 w-4" />
                Display Settings
              </h3>
              <div className="space-y-3">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Dark Mode
                    </label>
                    <p className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Switch to dark color scheme
                    </p>
                  </div>
                  <Switch
                    checked={settings.darkMode}
                    onCheckedChange={(checked) => onUpdateSettings({ darkMode: checked })}
                  />
                </div>

                {/* Hide Header Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Hide Header
                    </label>
                    <p className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Hide the top navigation bar
                    </p>
                  </div>
                  <Switch
                    checked={settings.hideHeader}
                    onCheckedChange={(checked) => onUpdateSettings({ hideHeader: checked })}
                  />
                </div>

                {/* Font Size Selector */}
                <div className="space-y-2">
                  <label className={`block text-sm ${settings.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Font Size
                  </label>
                  <select
                    value={settings.fontSize}
                    onChange={(e) => onUpdateSettings({ fontSize: e.target.value as ReaderSettings['fontSize'] })}
                    className={`w-full p-2 rounded-md border ${
                      settings.darkMode 
                        ? 'bg-gray-800 border-gray-700 text-gray-200' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra-large">Extra Large</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Full Text Settings - Only show when in full-text mode */}
            {isFullTextMode && (
              <div className="space-y-4">
                <h3 className={`text-sm font-medium flex items-center gap-2 ${
                  settings.darkMode ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  <Type className="h-4 w-4" />
                  Full Text Settings
                </h3>
                <div className="space-y-3">
                  {/* Bold Letters Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col space-y-1">
                      <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                        settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Bold First & Last Letters
                      </label>
                      <p className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Highlight word boundaries
                      </p>
                    </div>
                    <Switch
                      checked={settings.boldLetters || false}
                      onCheckedChange={(checked) => onUpdateSettings({ boldLetters: checked })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reading Settings */}
            <div className="space-y-4">
              <h3 className={`text-sm font-medium flex items-center gap-2 ${
                settings.darkMode ? 'text-gray-200' : 'text-gray-900'
              }`}>
                <Eye className="h-4 w-4" />
                Reading Settings
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Pause on Punctuation
                    </label>
                    <p className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Add extra pause after punctuation marks
                    </p>
                  </div>
                  <Switch
                    checked={settings.pauseOnPunctuation}
                    onCheckedChange={(checked) => onUpdateSettings({ pauseOnPunctuation: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Chunking Settings - Only show in full-text mode */}
            {isFullTextMode && (
              <div className="space-y-4">
                <h3 className={`text-sm font-medium flex items-center gap-2 ${
                  settings.darkMode ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  <Layout className="h-4 w-4" />
                  Chunking Settings
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col space-y-1">
                      <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                        settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Chunk in Pages
                      </label>
                      <p className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Display text in paginated chunks
                      </p>
                    </div>
                    <Switch
                      checked={settings.chunkInPages}
                      onCheckedChange={(checked) => onUpdateSettings({ chunkInPages: checked })}
                    />
                  </div>
                  {settings.chunkInPages && (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col space-y-1">
                        <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                          settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          Hold All Chunks in Memory
                        </label>
                        <p className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Keep all chunks loaded for faster navigation
                        </p>
                      </div>
                      <Switch
                        checked={settings.holdInMemory}
                        onCheckedChange={(checked) => onUpdateSettings({ holdInMemory: checked })}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}