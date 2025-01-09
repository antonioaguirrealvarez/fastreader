import { create } from 'zustand';
import { ChunkingService } from '../textProcessing/chunkingService';
import { useReaderSettings } from './readerSettingsService';

interface Chunk {
  id: string;
  words: string[];
  startIndex: number;
  endIndex: number;
}

interface TextProcessingState {
  content: string;
  currentWordIndex: number;
  isPlaying: boolean;
  wpm: number;
  progress: number;
  totalWords: number;
  currentChunk: Chunk | null;
  visibleChunks: Chunk[];
  chunkingService: ChunkingService | null;
  isProgrammaticScroll: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  wordSpacing: 'normal' | 'wide' | 'wider';

  // Actions
  initialize: (content: string) => void;
  setCurrentWordIndex: (index: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setWpm: (wpm: number) => void;
  setIsProgrammaticScroll: (isProgrammatic: boolean) => void;
  navigateChunk: (direction: 'next' | 'prev') => number;
  getAllWords: () => string[];

  // Utility methods
  getLineSpacingClass: () => string;
  getWordSpacingClass: () => string;
  getFontSizeClass: () => string;
}

export const useTextProcessing = create<TextProcessingState>((set, get) => ({
  content: '',
  currentWordIndex: 0,
  isPlaying: false,
  wpm: 300,
  progress: 0,
  totalWords: 0,
  currentChunk: null,
  visibleChunks: [],
  chunkingService: null,
  isProgrammaticScroll: false,
  fontSize: 'medium',
  lineSpacing: 'relaxed',
  wordSpacing: 'wide',

  initialize: (content) => {
    const chunkingService = new ChunkingService(content);
    const totalWords = chunkingService.getTotalWords();
    const visibleChunks = chunkingService.getVisibleChunks(0);
    
    set({
      content,
      chunkingService,
      totalWords,
      visibleChunks,
      currentChunk: visibleChunks[0] || null,
      progress: 0,
      currentWordIndex: 0,
      isPlaying: true
    });
  },

  setCurrentWordIndex: (index) => {
    const state = get();
    if (!state.chunkingService) return;

    const progress = Math.round((index / (state.totalWords - 1)) * 100);
    const visibleChunks = state.chunkingService.getVisibleChunks(index);
    const currentChunk = visibleChunks[0] || null;

    set({ currentWordIndex: index, progress, visibleChunks, currentChunk });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setWpm: (wpm) => set({ wpm }),
  setIsProgrammaticScroll: (isProgrammatic) => set({ isProgrammaticScroll: isProgrammatic }),

  navigateChunk: (direction) => {
    const state = get();
    if (!state.chunkingService) return state.currentWordIndex;

    const newIndex = direction === 'next'
      ? state.chunkingService.getFirstWordIndexOfNextChunk()
      : state.chunkingService.getFirstWordIndexOfPreviousChunk();

    const visibleChunks = state.chunkingService.getVisibleChunks(newIndex);
    const currentChunk = visibleChunks[0] || null;
    const progress = Math.round((newIndex / (state.totalWords - 1)) * 100);

    set({ currentWordIndex: newIndex, visibleChunks, currentChunk, progress });
    return newIndex;
  },

  getAllWords: () => {
    const state = get();
    return state.content.split(/\s+/);
  },

  getLineSpacingClass: () => {
    const settings = useReaderSettings.getState().settings;
    switch (settings.fontSize) {
      case 'small':
        return 'leading-[2]';
      case 'medium':
        return 'leading-[2.25]';
      case 'large':
        return 'leading-[2.75]';
      case 'extra-large':
        return 'leading-[3.75]';
      default:
        return 'leading-[2.25]';
    }
  },

  getWordSpacingClass: () => {
    const settings = useReaderSettings.getState().settings;
    switch (settings.fontSize) {
      case 'small':
        return 'tracking-wide font-[350]';
      case 'medium':
        return 'tracking-wider font-[350]';
      case 'large':
        return 'tracking-[0.075em] font-[350]';
      case 'extra-large':
        return 'tracking-normal font-[350] px-[0.125em]';
      default:
        return 'tracking-wider font-[350]';
    }
  },

  getFontSizeClass: () => {
    const settings = useReaderSettings.getState().settings;
    switch (settings.fontSize) {
      case 'small':
        return 'text-lg font-normal';
      case 'medium':
        return 'text-2xl font-normal';
      case 'large':
        return 'text-3xl font-normal';
      case 'extra-large':
        return 'text-4xl font-normal';
      default:
        return 'text-2xl font-normal';
    }
  }
})); 