import { create } from 'zustand';

interface AutoScrollState {
  isEnabled: boolean;
  lastScrollTop: number;
  scrollConfig: ScrollConfig;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  setLastScrollTop: (scrollTop: number) => void;
  updateScrollConfig: (config: Partial<ScrollConfig>) => void;
  getSpeedMultiplier: (offset: number) => number;
  shouldUseSmooth: (offset: number) => boolean;
}

interface ScrollConfig {
  speedTiers: {
    extremelyFar: { threshold: number; multiplier: number; };
    veryFar: { threshold: number; multiplier: number; };
    far: { threshold: number; multiplier: number; };
    medium: { threshold: number; multiplier: number; };
    close: { threshold: number; multiplier: number; };
  };
  smoothThreshold: number;
  scrollBehaviorDelay: number;
  stabilityDuration: number;
}

const DEFAULT_CONFIG: ScrollConfig = {
  speedTiers: {
    extremelyFar: { threshold: 1000, multiplier: 2.0 },
    veryFar: { threshold: 500, multiplier: 1.5 },
    far: { threshold: 300, multiplier: 1.0 },
    medium: { threshold: 100, multiplier: 0.5 },
    close: { threshold: 0, multiplier: 0.1 },
  },
  smoothThreshold: 100,
  scrollBehaviorDelay: 1000,
  stabilityDuration: 5000,
};

export const useAutoScroll = create<AutoScrollState>((set, get) => ({
  isEnabled: true,
  lastScrollTop: 0,
  scrollConfig: DEFAULT_CONFIG,

  setEnabled: (enabled) => set({ isEnabled: enabled }),
  
  setLastScrollTop: (scrollTop) => set({ lastScrollTop: scrollTop }),
  
  updateScrollConfig: (config) => set((state) => ({
    scrollConfig: { ...state.scrollConfig, ...config }
  })),

  getSpeedMultiplier: (offset: number) => {
    const { speedTiers } = get().scrollConfig;
    const absOffset = Math.abs(offset);

    if (absOffset > speedTiers.extremelyFar.threshold) return speedTiers.extremelyFar.multiplier;
    if (absOffset > speedTiers.veryFar.threshold) return speedTiers.veryFar.multiplier;
    if (absOffset > speedTiers.far.threshold) return speedTiers.far.multiplier;
    if (absOffset > speedTiers.medium.threshold) return speedTiers.medium.multiplier;
    return speedTiers.close.multiplier;
  },

  shouldUseSmooth: (offset: number) => {
    return Math.abs(offset) <= get().scrollConfig.smoothThreshold;
  },
})); 