import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EPUBDocument } from '../types/epub';

interface EPUBStore {
  documents: { [id: string]: EPUBDocument };
  addDocument: (doc: EPUBDocument) => void;
  updateDocument: (id: string, updates: Partial<EPUBDocument>) => void;
  removeDocument: (id: string) => void;
  updateLastRead: (id: string, chapterId: string, position: number) => void;
}

export const useEPUBStore = create<EPUBStore>()(
  persist(
    (set) => ({
      documents: {},
      addDocument: (doc) =>
        set((state) => ({
          documents: { ...state.documents, [doc.id]: doc }
        })),
      updateDocument: (id, updates) =>
        set((state) => ({
          documents: {
            ...state.documents,
            [id]: { ...state.documents[id], ...updates, updatedAt: Date.now() }
          }
        })),
      removeDocument: (id) =>
        set((state) => {
          const { [id]: removed, ...rest } = state.documents;
          return { documents: rest };
        }),
      updateLastRead: (id, chapterId, position) =>
        set((state) => ({
          documents: {
            ...state.documents,
            [id]: {
              ...state.documents[id],
              lastRead: {
                chapterId,
                position,
                timestamp: Date.now()
              },
              updatedAt: Date.now()
            }
          }
        })),
    }),
    {
      name: 'epub-storage',
      version: 1,
    }
  )
); 