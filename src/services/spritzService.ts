import { logger, LogCategory } from '../utils/logger';

interface SpritzAnalysis {
  word: {
    original: string;
    clean: string;
    length: number;
  };
  characters: {
    before: string[];
    after: string[];
    letters: string[];
  };
  positioning: {
    paddingBefore: number;
    paddingAfter: number;
    totalLength: number;
    middleIndex: number;
    middleLetterPosition: number;
  };
  orpCalculation: {
    isEven: boolean;
    baseOffset: number;
    finalOffset: number;
    highlightPosition: number;
  };
  timing: {
    processingStart: number;
    processingEnd: number;
    duration: number;
  };
}

export const analyzeSpritzWord = (word: string) => {
  const startTime = performance.now();
  
  // Clean and analyze the word
  const cleanWord = word.replace(/[^\w]/g, '');
  const letters = word.split('');
  const specialCharsBefore = letters.slice(0, word.indexOf(cleanWord[0]));
  const specialCharsAfter = letters.slice(word.indexOf(cleanWord[0]) + cleanWord.length);

  // Calculate positioning
  const isEven = cleanWord.length % 2 === 0;
  const middleIndex = Math.floor(cleanWord.length / 2);
  const baseOffset = isEven ? 0.5 : 0;
  const finalOffset = baseOffset;

  // Create detailed analysis object
  const analysis: SpritzAnalysis = {
    word: {
      original: word,
      clean: cleanWord,
      length: cleanWord.length
    },
    characters: {
      before: specialCharsBefore,
      after: specialCharsAfter,
      letters: cleanWord.split('')
    },
    positioning: {
      paddingBefore: specialCharsBefore.length,
      paddingAfter: specialCharsAfter.length,
      totalLength: word.length,
      middleIndex,
      middleLetterPosition: middleIndex + specialCharsBefore.length
    },
    orpCalculation: {
      isEven,
      baseOffset,
      finalOffset,
      highlightPosition: middleIndex
    },
    timing: {
      processingStart: startTime,
      processingEnd: performance.now(),
      duration: performance.now() - startTime
    }
  };

  // Log the detailed analysis
  logger.debug(LogCategory.SPRITZ, 'Word analysis complete', {
    analysis,
    letterDetails: letters.map((char, index) => ({
      char,
      position: index,
      isLetter: /\w/.test(char),
      isHighlighted: index === analysis.positioning.middleLetterPosition
    }))
  });

  return {
    word,
    cleanWord,
    orpPosition: analysis.positioning.middleLetterPosition,
    focusLetter: letters[analysis.positioning.middleLetterPosition],
    beforeLength: analysis.positioning.paddingBefore,
    afterLength: analysis.positioning.paddingAfter,
    analysis: {
      letterPositions: letters.map((char, index) => ({
        char,
        position: index,
        isLetter: /\w/.test(char)
      })),
      originalWord: word,
      finalOffset: analysis.orpCalculation.finalOffset,
      middleIndex: analysis.positioning.middleIndex,
      middleLetterPosition: analysis.positioning.middleLetterPosition,
      letters: analysis.characters.letters,
      isEven: analysis.orpCalculation.isEven,
      punctuationBefore: analysis.positioning.paddingBefore,
      punctuationAfter: analysis.positioning.paddingAfter
    }
  };
}; 