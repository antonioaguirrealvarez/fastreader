import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

const motto = ['Read', 'Smarter,', 'Learn', 'Faster'];

export function DynamicHero() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setScrollPosition(position);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAnimationComplete) return;

    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => {
        if (prev === motto.length - 1) {
          setTimeout(() => {
            setIsAnimationComplete(true);
          }, 1000);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isAnimationComplete]);

  // More dramatic color transitions based on scroll
  const hue1 = (240 + scrollPosition * 0.3) % 360;
  const hue2 = (120 + scrollPosition * 0.4) % 360;
  const hue3 = (60 + scrollPosition * 0.5) % 360;

  const gradientStyle = {
    background: `linear-gradient(135deg, 
      hsla(${hue1}, 80%, 65%, 0.3) 0%, 
      hsla(${hue2}, 85%, 60%, 0.3) 50%, 
      hsla(${hue3}, 75%, 55%, 0.3) 100%
    )`,
    transition: 'background 0.3s ease-out',
  };

  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      <div 
        className="absolute inset-0 transition-all duration-300"
        style={gradientStyle}
      />
      <div className="relative container mx-auto text-center">
        <div className="animate-fade-in">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 min-h-[4em] flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {!isAnimationComplete ? (
                <motion.span
                  key="single-word"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`text-6xl transition-all duration-300 transform ${
                    motto[currentWordIndex] === 'Learn' || motto[currentWordIndex] === 'Faster'
                      ? 'animate-gradient bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto]'
                      : ''
                  }`}
                >
                  {motto[currentWordIndex]}
                </motion.span>
              ) : (
                <motion.span
                  key="full-text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col"
                >
                  Read Smarter,{' '}
                  <span className="animate-gradient bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto]">
                    Learn Faster
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform your reading experience with AI-powered speed reading technology. 
            Improve comprehension and reading speed by up to 3x.
          </p>
          <Button size="lg" className="mx-auto flex items-center gap-2">
            Get Started Free <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}