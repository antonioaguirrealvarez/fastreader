import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { SpeedControl } from './reader/SpeedControl';
import { motion } from 'framer-motion';

export function DemoReader() {
  const [text, setText] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [wordsPerMinute, setWordsPerMinute] = useState(300);

  useEffect(() => {
    if (text) {
      setWords(text.split(/\s+/).filter(word => word.length > 0));
      setWordIndex(0);
      setCurrentWord(words[0] || '');
    }
  }, [text]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && words.length > 0) {
      interval = setInterval(() => {
        setWordIndex(prev => {
          if (prev >= words.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, (60 / wordsPerMinute) * 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, words, wordsPerMinute]);

  useEffect(() => {
    if (words.length > 0) {
      setCurrentWord(words[wordIndex]);
    }
  }, [wordIndex, words]);

  const highlightWord = (word: string) => {
    if (!word || word.length <= 1) return word;
    return (
      <>
        <span className="text-blue-600">{word[0]}</span>
        {word.slice(1, -1)}
        <span className="text-blue-600">{word[word.length - 1]}</span>
      </>
    );
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Try It Yourself
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Experience the power of speed reading with our interactive demo
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Paste Your Text
                </h3>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter or paste your text here..."
                  className="w-full h-48 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Speed Reader
                </h3>
                <div className="aspect-video bg-white rounded-lg border border-gray-200 flex items-center justify-center mb-4">
                  <div className="text-4xl font-medium text-gray-900">
                    {currentWord ? highlightWord(currentWord) : 'Start reading...'}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-4 w-full justify-center">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="primary"
                        onClick={() => setIsPlaying(!isPlaying)}
                        disabled={!text}
                        className="w-40 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        <div className="flex items-center justify-center gap-2">
                          {isPlaying ? (
                            <>
                              <Pause className="h-5 w-5" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-5 w-5 ml-1" />
                              <span>Start</span>
                            </>
                          )}
                        </div>
                      </Button>
                    </motion.div>
                    <SpeedControl
                      wordsPerMinute={wordsPerMinute}
                      onSpeedChange={setWordsPerMinute}
                      darkMode={false}
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}