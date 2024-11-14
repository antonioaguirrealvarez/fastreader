import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { loggerService } from '../services/loggerService';

type DisplayMode = 'center' | 'left-align' | 'dynamic-width' | 'monospace' | 'monospace-double' | 'monospace-adjusted' | 'proportional' | 'character-based';

interface SpritzTestProps {}

const TEST_TEXT = `The quick brown fox jumps over the lazy dog. This is a sample text 
that includes various word lengths, some punctuation marks, and even numbers like 
123 or abbreviations like Dr. Smith! Can you read this at maximum speed? We'll see 
how well the different methods work with words-per-minute (WPM) variations.`;

export function SpritzTest() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('center');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const words = TEST_TEXT.split(/\s+/);

  const renderWord = (word: string) => {
    if (!word) return '...';

    const startTime = performance.now();

    // Clean the word and find the optimal recognition point (ORP)
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
    
    switch (displayMode) {
      case 'monospace': {
        // Standard monospace - single letter highlight
        const orpPosition = Math.floor((cleanWord.length - 1) / 2);
        const before = word.slice(0, orpPosition);
        const focus = word[orpPosition];
        const after = word.slice(orpPosition + 1);

        return (
          <div className="flex items-center justify-center">
            <div className="font-mono relative">
              <div className="absolute left-1/2 w-[2px] h-full bg-red-500/20 transform -translate-x-1/2" />
              <span className="text-gray-700">{before}</span>
              <span className="text-red-600 font-bold mx-0.5">{focus}</span>
              <span className="text-gray-700">{after}</span>
            </div>
          </div>
        );
      }

      case 'monospace-double': {
        // Double letter highlight for even-length words
        const isEven = cleanWord.length % 2 === 0;
        const firstHighlight = Math.floor((cleanWord.length - 1) / 2);
        const before = word.slice(0, firstHighlight);
        const focus = isEven ? 
          word.slice(firstHighlight, firstHighlight + 2) : 
          word[firstHighlight];
        const after = isEven ? 
          word.slice(firstHighlight + 2) : 
          word.slice(firstHighlight + 1);

        return (
          <div className="flex items-center justify-center">
            <div className="font-mono relative">
              <div className="absolute left-1/2 w-[2px] h-full bg-red-500/20 transform -translate-x-1/2" />
              <span className="text-gray-700">{before}</span>
              <span className="text-red-600 font-bold mx-0.5">{focus}</span>
              <span className="text-gray-700">{after}</span>
            </div>
          </div>
        );
      }

      case 'monospace-adjusted': {
        // Adjusted positioning for even-length words
        const isEven = cleanWord.length % 2 === 0;
        const middleIndex = Math.floor((cleanWord.length - 1) / 2);
        const before = word.slice(0, middleIndex);
        const focus = word[middleIndex];
        const after = word.slice(middleIndex + 1);

        return (
          <div className="flex items-center justify-center">
            <div className="font-mono relative">
              <div className="absolute left-1/2 w-[2px] h-full bg-red-500/20 transform -translate-x-1/2" />
              {/* Add a half-character offset for even-length words */}
              <div className={`relative ${isEven ? 'left-[0.25em]' : ''}`}>
                <span className="text-gray-700">{before}</span>
                <span className="text-red-600 font-bold mx-0.5">{focus}</span>
                <span className="text-gray-700">{after}</span>
              </div>
            </div>
          </div>
        );
      }

      case 'center':
        return (
          <div className="flex items-center justify-center">
            <div className="relative">
              <span className="text-gray-700">{before}</span>
              <span className="text-red-600 font-bold mx-0.5">{focus}</span>
              <span className="text-gray-700">{after}</span>
            </div>
          </div>
        );

      case 'left-align':
        return (
          <div className="w-[300px] mx-auto">
            <div className="relative">
              <span className="text-gray-700">{before}</span>
              <span className="text-red-600 font-bold mx-0.5">{focus}</span>
              <span className="text-gray-700">{after}</span>
            </div>
          </div>
        );

      case 'dynamic-width':
        const containerWidth = 300;
        const charWidth = 14; // Approximate width of each character
        const focusPosition = containerWidth / 2;
        const leftOffset = focusPosition - (before.length * charWidth);

        return (
          <div className="w-[300px] mx-auto overflow-hidden">
            <div 
              className="relative whitespace-nowrap"
              style={{ left: `${leftOffset}px` }}
            >
              <span className="text-gray-700">{before}</span>
              <span className="text-red-600 font-bold mx-0.5">{focus}</span>
              <span className="text-gray-700">{after}</span>
            </div>
          </div>
        );

      case 'proportional':
        // Spritz's official 35% position method
        const proportionalPosition = Math.floor(word.length * 0.35);
        return (
          <div className="flex items-center justify-center">
            <div className="relative">
              <span className="text-gray-700">{word.slice(0, proportionalPosition)}</span>
              <span className="text-red-600 font-bold mx-0.5">{word[proportionalPosition]}</span>
              <span className="text-gray-700">{word.slice(proportionalPosition + 1)}</span>
            </div>
          </div>
        );

      case 'character-based':
        // Consider character widths for more accurate centering
        const charWidths: { [key: string]: number } = {
          m: 1.5, w: 1.5, M: 1.5, W: 1.5,
          i: 0.5, l: 0.5, I: 0.5, t: 0.7,
          default: 1
        };

        let totalWidth = 0;
        const positions = word.split('').map(char => {
          const width = charWidths[char] || charWidths.default;
          totalWidth += width;
          return totalWidth;
        });

        const midPoint = totalWidth / 2;
        const focusIdx = positions.findIndex(pos => pos >= midPoint);

        return (
          <div className="flex items-center justify-center">
            <div className="relative">
              <span className="text-gray-700">{word.slice(0, focusIdx)}</span>
              <span className="text-red-600 font-bold mx-0.5">{word[focusIdx]}</span>
              <span className="text-gray-700">{word.slice(focusIdx + 1)}</span>
            </div>
          </div>
        );
    }
  };

  // Play/Pause logic
  React.useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentWordIndex(prev => {
        if (prev >= words.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, (60 * 1000) / wpm);

    return () => clearInterval(interval);
  }, [isPlaying, wpm, words.length]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Spritz Test Environment</h1>

        {/* Controls */}
        <Card className="mb-8 p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="font-medium">Display Mode:</label>
              <select 
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
                className="border rounded p-2"
              >
                <option value="monospace">Monospace (Standard)</option>
                <option value="monospace-double">Monospace (Double Highlight)</option>
                <option value="monospace-adjusted">Monospace (Adjusted Center)</option>
                <option value="proportional">Proportional (35%)</option>
                <option value="character-based">Character Width Based</option>
                <option value="center">Simple Center</option>
                <option value="left-align">Left Aligned</option>
                <option value="dynamic-width">Dynamic Width</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="font-medium">WPM:</label>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-16 text-right">{wpm}</span>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button 
                variant="secondary"
                onClick={() => setCurrentWordIndex(0)}
              >
                Reset
              </Button>
            </div>
          </div>
        </Card>

        {/* Display Area */}
        <Card className="mb-8">
          <div className="h-40 flex items-center justify-center text-3xl">
            {renderWord(words[currentWordIndex])}
          </div>
        </Card>

        {/* Original Text */}
        <Card className="p-6">
          <h2 className="font-bold mb-4">Original Text:</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{TEST_TEXT}</p>
        </Card>
      </div>
    </div>
  );
} 