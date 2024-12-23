import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Switch } from '../components/ui/Switch';
import { useReadingProcessor } from '../hooks/useReadingProcessor';

export function ReadingModesTest() {
  const [inputText, setInputText] = useState('');
  const [readingSpeed, setReadingSpeed] = useState(200);
  const [settings, setSettings] = useState({
    highlightWords: true,
    boldFirstLetter: true,
    colorCapitalized: true
  });

  const {
    isPlaying,
    currentPosition,
    selectedPosition,
    processedWords,
    formatWord,
    togglePlayPause,
    resetPosition,
    handleWordClick
  } = useReadingProcessor({
    text: inputText,
    wpm: readingSpeed,
    settings,
    onComplete: () => console.log('Reading complete')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const renderFormattedWord = (word: string, index: number) => {
    const isCurrentWord = index === currentPosition;
    const isSelected = index >= (selectedPosition || currentPosition) && index <= currentPosition;
    const wordObj = processedWords[index];

    return (
      <span 
        key={index}
        className={`word relative cursor-pointer select-none
          ${wordObj.isCapitalized && settings.colorCapitalized ? 'text-red-600' : ''}
          ${isCurrentWord && settings.highlightWords ? 'bg-yellow-200' : ''}
          ${isSelected ? 'bg-blue-100' : ''}
        `}
        onClick={() => handleWordClick(index)}
        style={{ transition: 'background-color 0.2s ease-in-out' }}
      >
        {settings.boldFirstLetter && word.length > 1 ? (
          <>
            <strong>{word[0]}</strong>
            {word.slice(1)}
          </>
        ) : word}
      </span>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card className="p-6 mb-6">
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-32 p-3 border rounded-lg mb-4"
            placeholder="Enter text to process..."
          />
          <Button type="submit">Process Text</Button>
        </form>

        {/* Settings Panel */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Highlight Current Word</label>
            <Switch
              checked={settings.highlightWords}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, highlightWords: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Bold First Letter</label>
            <Switch
              checked={settings.boldFirstLetter}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, boldFirstLetter: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Color Capitalized Words</label>
            <Switch
              checked={settings.colorCapitalized}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, colorCapitalized: checked }))
              }
            />
          </div>
        </div>

        {/* Controls */}
        {processedWords.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={togglePlayPause}
                variant={isPlaying ? 'secondary' : 'primary'}
                className="w-24"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
              <Button
                onClick={resetPosition}
                variant="secondary"
                className="w-24"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <div className="flex-1 flex items-center gap-4">
                <span className="text-sm font-medium">Speed:</span>
                <input
                  type="range"
                  min="60"
                  max="600"
                  step="10"
                  value={readingSpeed}
                  onChange={(e) => setReadingSpeed(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-20">
                  {readingSpeed} WPM
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Current Word Display */}
        {processedWords.length > 0 && (
          <div className="mb-6 rounded bg-gray-100 p-8 text-center text-4xl">
            {processedWords[currentPosition]?.text || ''}
          </div>
        )}

        {/* Text Display with Preview - Horizontal Split */}
        {processedWords.length > 0 && (
          <div className="flex gap-4">
            {/* Main text - 3/4 width */}
            <div className="w-3/4">
              <div className="border rounded-lg p-4 h-[400px] overflow-y-auto leading-relaxed text-lg">
                {processedWords.map((word, index) => (
                  <React.Fragment key={index}>
                    {renderFormattedWord(word.text, index)}
                    {' '}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Document Preview - 1/4 width */}
            <div className="w-1/4">
              <div className="border rounded-lg p-4 h-[400px] overflow-y-auto text-xs">
                {processedWords.map((word, index) => (
                  <React.Fragment key={index}>
                    <span 
                      className={`${
                        word.isCapitalized && settings.colorCapitalized ? 'text-red-600' : ''
                      } ${
                        index === currentPosition ? 'bg-yellow-200' : ''
                      }`}
                    >
                      {word.text}
                    </span>
                    {' '}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 