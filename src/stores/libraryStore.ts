import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface LibraryFile {
  id: string;
  name: string;
  content: string;
  timestamp: number;
  progress?: number;
}

interface LibraryState {
  files: LibraryFile[];
  lastReadFileId: string | null;
  addFile: (file: LibraryFile) => void;
  removeFile: (id: string) => void;
  getFile: (id: string) => LibraryFile | undefined;
  updateProgress: (id: string, progress: number) => void;
  setLastReadFile: (id: string) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      files: [],
      lastReadFileId: null,
      addFile: (file: LibraryFile) => set((state) => ({
        files: [...state.files, { ...file, progress: 0 }]
      })),
      removeFile: (id: string) => set((state) => ({
        files: state.files.filter(f => f.id !== id),
        lastReadFileId: state.lastReadFileId === id ? null : state.lastReadFileId
      })),
      getFile: (id: string) => get().files.find(f => f.id === id),
      updateProgress: (id: string, progress: number) => set((state) => ({
        files: state.files.map(f => 
          f.id === id ? { ...f, progress } : f
        )
      })),
      setLastReadFile: (id: string) => set({ lastReadFileId: id }),
    }),
    {
      name: 'library-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
); 