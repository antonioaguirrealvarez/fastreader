import React, { useState } from 'react';
import { SimplifiedFullTextReader } from '../components/reader/SimplifiedFullTextReader';
import { KeyboardHelp } from '../components/reader/KeyboardHelp';
import { Card } from '../components/ui/Card';
import { Sun, Moon } from 'lucide-react';

export default function FullTextDemo() {
  const [text, setText] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Full Text Reader Demo
              </h1>
              <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Test the new full-text reading mode with word highlighting
              </p>
            </div>
            
            <button
              onClick={() => setDarkMode(prev => !prev)}
              className={`
                p-3 rounded-full
                ${darkMode 
                  ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' 
                  : 'bg-white text-gray-900 hover:bg-gray-100'
                }
                transition-all duration-200 shadow-lg
                hover:scale-105
              `}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar with Keyboard Help */}
            <div className="lg:col-span-1">
              <KeyboardHelp darkMode={darkMode} />
            </div>

            {/* Reader Content */}
            <div className="lg:col-span-3">
              {!text ? (
                <Card className={`p-6 ${darkMode ? 'bg-gray-800 text-white' : ''}`}>
                  <h2 className="text-lg font-semibold mb-4">Enter Text to Start</h2>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your text here..."
                    className={`
                      w-full h-48 p-4 rounded-lg border
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                    `}
                  />
                  <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Paste any text to start reading in the new full-text mode with word highlighting.
                  </p>
                </Card>
              ) : (
                <div className="h-[80vh] rounded-lg overflow-hidden border shadow-lg">
                  <SimplifiedFullTextReader
                    content={text}
                    darkMode={darkMode}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 