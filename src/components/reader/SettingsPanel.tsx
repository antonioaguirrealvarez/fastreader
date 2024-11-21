import React from 'react';
import { Layout, Zap, Moon, Type, BookText, Hash, LineChart, Eye } from 'lucide-react';
import { Switch } from '../ui/Switch';
import { Select } from '../ui/Select';
import { CloseButton } from '../ui/CloseButton';

interface SettingsPanelProps {
  isOpen: boolean;
  settings: {
    darkMode: boolean;
    hideHeader: boolean;
    displayMode: 'highlight' | 'spritz';
    fontSize: string;
    recordAnalytics: boolean;
    pauseOnPunctuation: boolean;
  };
  onClose: () => void;
  onUpdateSettings: (settings: SettingsPanelProps['settings']) => void;
  hideHeader: boolean;
}

export function SettingsPanel({ isOpen, settings, onClose, onUpdateSettings, hideHeader }: SettingsPanelProps) {
  const updateSetting = <K extends keyof SettingsPanelProps['settings']>(
    key: K,
    value: SettingsPanelProps['settings'][K]
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'extra-large', label: 'Extra Large' }
  ];

  return (
    <div className={`fixed right-0 ${hideHeader ? 'top-0' : 'top-16'} bottom-16 w-80 transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    } ${settings.darkMode ? 'bg-gray-900/95' : 'bg-gray-50/95'} backdrop-blur-sm shadow-2xl overflow-hidden`}>
      <div className="h-full flex flex-col">
        <div className={`sticky top-0 z-10 ${settings.darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
          <div className="p-4 flex items-center justify-between">
            <h2 className={`text-lg font-semibold ${settings.darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Settings</h2>
            <CloseButton onClick={onClose} darkMode={settings.darkMode} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4 space-y-6">
            {/* Display Settings */}
            <div className="space-y-4">
              <h3 className={`text-sm font-medium ${settings.darkMode ? 'text-gray-200' : 'text-gray-900'} flex items-center gap-2`}>
                <Type className="h-4 w-4" />
                Display
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`text-sm ${settings.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Dark Mode</label>
                  <Switch
                    checked={settings.darkMode}
                    onCheckedChange={(checked) => updateSetting('darkMode', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className={`text-sm ${settings.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Hide Header</label>
                  <Switch
                    checked={settings.hideHeader}
                    onCheckedChange={(checked) => updateSetting('hideHeader', checked)}
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Font Size
                  </label>
                  <select
                    value={settings.fontSize}
                    onChange={(e) => onUpdateSettings({ ...settings, fontSize: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    {fontSizeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Reading Mode */}
            <div className="space-y-4">
              <h3 className={`text-sm font-medium ${settings.darkMode ? 'text-gray-200' : 'text-gray-900'} flex items-center gap-2`}>
                <Zap className="h-4 w-4" />
                Reading Mode
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateSetting('displayMode', 'highlight')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      settings.displayMode === 'highlight'
                        ? 'bg-blue-600 text-white'
                        : settings.darkMode 
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-white text-gray-600'
                    }`}
                  >
                    Highlight Mode
                  </button>
                  <button
                    onClick={() => updateSetting('displayMode', 'spritz')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      settings.displayMode === 'spritz'
                        ? 'bg-blue-600 text-white'
                        : settings.darkMode 
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-white text-gray-600'
                    }`}
                  >
                    Spritz Mode
                  </button>
                </div>
              </div>
            </div>

            {/* Reading Settings */}
            <div className="space-y-4">
              <h3 className={`text-sm font-medium ${settings.darkMode ? 'text-gray-200' : 'text-gray-900'} flex items-center gap-2`}>
                <Type className="h-4 w-4" />
                Reading Settings
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`text-sm ${settings.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Pause on Punctuation
                  </label>
                  <Switch
                    checked={settings.pauseOnPunctuation}
                    onCheckedChange={(checked) => updateSetting('pauseOnPunctuation', checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}