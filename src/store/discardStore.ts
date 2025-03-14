import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Note } from '../types';

interface DiscardState {
  discardedNotes: Note[];
  addToDiscard: (note: Note) => void;
  removeFromDiscard: (id: string) => void;
  clearDiscard: () => void;
  restoreNote: (id: string) => Note | undefined;
}

export const useDiscardStore = create<DiscardState>()(
  persist(
    (set, get) => ({
      discardedNotes: [] as Note[],
      
      addToDiscard: (note: Note) =>
        set((state) => ({
          discardedNotes: [...state.discardedNotes, note],
        })),
        
      removeFromDiscard: (id: string) =>
        set((state) => ({
          discardedNotes: state.discardedNotes.filter((note) => note.id !== id),
        })),
        
      clearDiscard: () => set({ discardedNotes: [] }),
      
      restoreNote: (id: string) => {
        const { discardedNotes } = get();
        const noteToRestore = discardedNotes.find(note => note.id === id);
        
        if (noteToRestore) {
          set((state) => ({
            discardedNotes: state.discardedNotes.filter((note) => note.id !== id),
          }));
        }
        
        return noteToRestore;
      },
    }),
    {
      name: 'discard-storage',
    }
  )
); 