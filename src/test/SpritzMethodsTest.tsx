import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { loggerService } from '../services/loggerService';

type SpritzMethod = 
  | 'fixed-middle' 
  | 'dynamic-orp' 
  | 'weighted-center' 
  | 'character-based'
  | 'syllable-based'
  | 'linguistic'
  | 'context-aware'
  | 'eye-tracking'
  | 'combined'
  | 'proportional';

const TEST_WORDS = [
  'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
  'comprehension', 'understanding', 'visualization', 'reading',
  'Dr.', 'Smith', 'Ph.D.', 'co-worker', 'self-aware',
  'antidisestablishmentarianism', 'supercalifragilisticexpialidocious'
];

// Add more test cases
const EDGE_CASE_WORDS = [
  // Compound words
  'self-aware', 'co-worker', 'mother-in-law',
  
  // Words with punctuation
  'Dr.', 'Mr.', 'Ph.D.', 'hello!', 'really?', 'well...',
  
  // Very long words
  'antidisestablishmentarianism', 'supercalifragilisticexpialidocious',
  'pneumonoultramicroscopicsilicovolcanoconiosis',
  
  // Words with mixed case and numbers
  'iPhone', 'iOS15', 'macOS12.1', 'React18',
  
  // Words with special characters
  'café', 'résumé', 'naïve', 'über',
  
  // Single letters and short words
  'a', 'I', 'an', 'the', 'of',
  
  // Words with repeating letters
  'bookkeeper', 'committee', 'Mississippi'
];

export function SpritzMethodsTest() {
  const [currentWord, setCurrentWord] = useState(TEST_WORDS[0]);
  const [method, setMethod] = useState<SpritzMethod>('fixed-middle');
  const [containerWidth, setContainerWidth] = useState(600);
  const [testCase, setTestCase] = useState<'normal' | 'edge'>('normal');
  const currentTestWords = testCase === 'normal' ? TEST_WORDS : EDGE_CASE_WORDS;

  // Add syllable counting helper
  const countSyllables = (word: string): number => {
    word = word.toLowerCase();
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  };

  // Add syllable position finder
  const findSyllablePositions = (word: string): number[] => {
    const positions: number[] = [];
    let syllableStart = 0;
    
    for (let i = 0; i < word.length; i++) {
      if (/[aeiouy]/i.test(word[i])) {
        if (i === 0 || !/[aeiouy]/i.test(word[i - 1])) {
          positions.push(syllableStart);
        }
        syllableStart = i + 1;
      }
    }
    
    return positions;
  };

  // Method 1: Fixed Middle Point
  const renderFixedMiddle = (word: string) => {
    const middle = Math.floor((word.length - 1) / 2);
    const before = word.slice(0, middle);
    const focus = word[middle];
    const after = word.slice(middle + 1);

    return renderWord(before, focus, after, word.length);
  };

  // Method 2: Dynamic ORP (Optimal Recognition Point)
  const renderDynamicORP = (word: string) => {
    const getORP = (length: number) => {
      if (length <= 1) return 0;
      if (length <= 5) return 1;
      if (length <= 9) return 2;
      if (length <= 13) return 3;
      return Math.floor(length / 3);
    };

    const orp = getORP(word.length);
    const before = word.slice(0, orp);
    const focus = word[orp];
    const after = word.slice(orp + 1);

    return renderWord(before, focus, after, word.length);
  };

  // Method 3: Weighted Center
  const renderWeightedCenter = (word: string) => {
    const weights = {
      consonants: 1.2,
      vowels: 0.8,
      punctuation: 0.5
    };

    let totalWeight = 0;
    const charWeights = word.split('').map(char => {
      let weight = weights.consonants;
      if (/[aeiou]/i.test(char)) weight = weights.vowels;
      if (/[.,!?;:]/.test(char)) weight = weights.punctuation;
      totalWeight += weight;
      return weight;
    });

    const targetWeight = totalWeight / 2;
    let currentWeight = 0;
    let focusIndex = 0;

    for (let i = 0; i < charWeights.length; i++) {
      currentWeight += charWeights[i];
      if (currentWeight >= targetWeight) {
        focusIndex = i;
        break;
      }
    }

    const before = word.slice(0, focusIndex);
    const focus = word[focusIndex];
    const after = word.slice(focusIndex + 1);

    return renderWord(before, focus, after, word.length);
  };

  // Method 4: Character-based Positioning
  const renderCharacterBased = (word: string) => {
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
    const focusIndex = positions.findIndex(pos => pos >= midPoint);

    const before = word.slice(0, focusIndex);
    const focus = word[focusIndex];
    const after = word.slice(focusIndex + 1);

    return renderWord(before, focus, after, word.length);
  };

  // Add new methods
  const renderSyllableBased = (word: string) => {
    const syllables = countSyllables(word);
    const positions = findSyllablePositions(word);
    const targetSyllable = syllables <= 2 ? 0 : 1;
    const focusIndex = positions[targetSyllable] || Math.floor(word.length / 2);

    const before = word.slice(0, focusIndex);
    const focus = word[focusIndex];
    const after = word.slice(focusIndex + 1);

    return renderWord(before, focus, after, word.length);
  };

  const renderLinguistic = (word: string) => {
    const prefixes = ['un', 're', 'in', 'dis', 'pre', 'post', 'anti'];
    const prefix = prefixes.find(p => word.toLowerCase().startsWith(p));
    
    let focusIndex = prefix ? prefix.length : Math.floor(word.length * 0.35);
    
    // Adjust for compound words
    if (word.includes('-')) {
      focusIndex = word.indexOf('-') + 1;
    }

    const before = word.slice(0, focusIndex);
    const focus = word[focusIndex];
    const after = word.slice(focusIndex + 1);

    return renderWord(before, focus, after, word.length);
  };

  const renderContextAware = (word: string) => {
    // Simple connecting words get focus at start
    const connectingWords = ['in', 'on', 'at', 'by', 'to', 'a', 'an', 'the'];
    if (connectingWords.includes(word.toLowerCase())) {
      return renderWord('', word[0], word.slice(1), word.length);
    }

    // Compound words focus near connection
    if (word.includes('-')) {
      const focusIndex = word.indexOf('-') + 1;
      return renderWord(
        word.slice(0, focusIndex),
        word[focusIndex],
        word.slice(focusIndex + 1),
        word.length
      );
    }

    // Default to proportional method
    const focusIndex = Math.floor(word.length * 0.35);
    return renderWord(
      word.slice(0, focusIndex),
      word[focusIndex],
      word.slice(focusIndex + 1),
      word.length
    );
  };

  const renderEyeTracking = (word: string) => {
    // Based on eye-tracking research data
    const patterns = {
      short: { maxLength: 4, position: 1 },
      medium: { maxLength: 8, position: 2 },
      long: { maxLength: 12, position: 3 }
    };

    let focusIndex: number;
    if (word.length <= patterns.short.maxLength) {
      focusIndex = patterns.short.position;
    } else if (word.length <= patterns.medium.maxLength) {
      focusIndex = patterns.medium.position;
    } else if (word.length <= patterns.long.maxLength) {
      focusIndex = patterns.long.position;
    } else {
      focusIndex = Math.floor(word.length * 0.35);
    }

    return renderWord(
      word.slice(0, focusIndex),
      word[focusIndex],
      word.slice(focusIndex + 1),
      word.length
    );
  };

  const renderCombined = (word: string) => {
    const results: number[] = [];
    
    // Collect results from different methods
    results.push(Math.floor(word.length * 0.35)); // Proportional
    results.push(findSyllablePositions(word)[1] || Math.floor(word.length / 2)); // Syllable
    
    if (word.includes('-')) {
      results.push(word.indexOf('-') + 1); // Compound words
    }
    
    // Get the average position
    const avgPosition = Math.round(
      results.reduce((sum, pos) => sum + pos, 0) / results.length
    );

    return renderWord(
      word.slice(0, avgPosition),
      word[avgPosition],
      word.slice(avgPosition + 1),
      word.length
    );
  };

  const renderProportional = (word: string) => {
    const focusIndex = Math.floor(word.length * 0.35); // 35% position
    return renderWord(
      word.slice(0, focusIndex),
      word[focusIndex],
      word.slice(focusIndex + 1),
      word.length
    );
  };

  const renderWord = (before: string, focus: string, after: string, totalLength: number) => {
    // Log the analysis
    loggerService.analyzeSpritzWord(before + focus + after, {
      method,
      beforeLength: before.length,
      focusPosition: before.length,
      totalLength,
      focusLetter: focus,
      metrics: {
        containerWidth,
        beforeWidth: before.length * 14, // approximate character width
        focusWidth: 14,
        afterWidth: after.length * 14
      }
    });

    return (
      <div className="relative flex items-center justify-center w-full">
        {/* Center line for reference */}
        <div className="absolute left-1/2 w-[2px] h-full bg-red-500/20 transform -translate-x-1/2" />
        
        <div className="relative" style={{ width: `${containerWidth}px` }}>
          <div className="absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap flex items-center">
            <span className="text-gray-700">{before}</span>
            <span className="relative mx-0.5 font-bold text-blue-600">{focus}</span>
            <span className="text-gray-700">{after}</span>
          </div>
        </div>
      </div>
    );
  };

  const getCurrentRenderer = () => {
    switch (method) {
      case 'fixed-middle': return renderFixedMiddle;
      case 'dynamic-orp': return renderDynamicORP;
      case 'weighted-center': return renderWeightedCenter;
      case 'character-based': return renderCharacterBased;
      case 'syllable-based': return renderSyllableBased;
      case 'linguistic': return renderLinguistic;
      case 'context-aware': return renderContextAware;
      case 'eye-tracking': return renderEyeTracking;
      case 'combined': return renderCombined;
      case 'proportional': return renderProportional;
    }
  };

  // Update method descriptions
  const getMethodDescription = (method: SpritzMethod) => {
    switch (method) {
      case 'fixed-middle':
        return "Places the focus point exactly in the middle of the word.";
      case 'dynamic-orp':
        return "Adjusts the Optimal Recognition Point based on word length ranges.";
      case 'weighted-center':
        return "Uses character type weights to find a balanced center.";
      case 'character-based':
        return "Considers actual character widths for visual centering.";
      case 'syllable-based':
        return "Focuses on the first letter of the second syllable when possible.";
      case 'linguistic':
        return "Considers word structure like prefixes and compound words.";
      case 'context-aware':
        return "Adapts focus point based on word type and context.";
      case 'eye-tracking':
        return "Based on research data about natural eye movement patterns.";
      case 'combined':
        return "Combines multiple methods for optimal positioning.";
      case 'proportional':
        return "Places focus point at 35% of word length (Spritz's approach).";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Spritz Methods Test</h1>

        {/* Controls */}
        <Card className="mb-8 p-6">
          <div className="space-y-4">
            {/* Add test case selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Test Cases</label>
              <select
                value={testCase}
                onChange={(e) => setTestCase(e.target.value as 'normal' | 'edge')}
                className="w-full p-2 border rounded"
              >
                <option value="normal">Normal Words</option>
                <option value="edge">Edge Cases</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as SpritzMethod)}
                className="w-full p-2 border rounded"
              >
                <option value="fixed-middle">Fixed Middle</option>
                <option value="dynamic-orp">Dynamic ORP</option>
                <option value="weighted-center">Weighted Center</option>
                <option value="character-based">Character-based</option>
                <option value="syllable-based">Syllable-based</option>
                <option value="linguistic">Linguistic</option>
                <option value="context-aware">Context-aware</option>
                <option value="eye-tracking">Eye-tracking</option>
                <option value="combined">Combined</option>
                <option value="proportional">Proportional (35%)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Container Width</label>
              <input
                type="range"
                min="300"
                max="900"
                step="100"
                value={containerWidth}
                onChange={(e) => setContainerWidth(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-gray-500">{containerWidth}px</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {currentTestWords.map((word) => (
                <Button
                  key={word}
                  variant={currentWord === word ? 'primary' : 'secondary'}
                  onClick={() => setCurrentWord(word)}
                  size="sm"
                >
                  {word}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Display Area */}
        <Card className="mb-8">
          <div className="h-40 flex items-center justify-center text-3xl">
            {getCurrentRenderer()(currentWord)}
          </div>
        </Card>

        {/* Analysis Display */}
        <Card className="p-6">
          <h2 className="font-bold mb-4">Word Analysis</h2>
          <div className="space-y-2 text-sm">
            <p>Word Length: {currentWord.length}</p>
            <p>Clean Word Length: {currentWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').length}</p>
            <p>Has Punctuation: {/[.,\/#!$%\^&\*;:{}=\-_`~()]/.test(currentWord).toString()}</p>
            <p>Is Compound: {currentWord.includes('-').toString()}</p>
            <p>Has Special Characters: {/[^a-zA-Z0-9\s-]/.test(currentWord).toString()}</p>
            <p>Method: {method}</p>
          </div>
        </Card>

        {/* Method Description */}
        <Card className="p-6">
          <h2 className="font-bold mb-2">Method Description</h2>
          <p className="text-gray-700">
            {getMethodDescription(method)}
          </p>
        </Card>
      </div>
    </div>
  );
} 