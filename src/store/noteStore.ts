import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Note, Position, CategoryColorMap, Attachment, Label, NoteColor } from '../types';

// Default category colors
export const defaultCategoryColors: CategoryColorMap = {
  work: 'blue',
  personal: 'green',
  shopping: 'yellow',
  health: 'pink',
  finance: 'blue',
  education: 'green',
  travel: 'yellow',
  home: 'pink',
  project: 'blue',
  meeting: 'green',
  deadline: 'pink',
  general: 'blue',
};

// Available colors for the color picker
export const availableColors: NoteColor[] = [
  'blue', 'green', 'pink', 'yellow', 
  'purple', 'orange', 'teal', 'red',
  'indigo', 'amber', 'emerald', 'rose'
];

interface NoteState {
  notes: Note[];
  settings: {
    categoryColors: CategoryColorMap;
    showCompletedNotes: boolean;
    defaultNoteColor: string;
    isSettingsOpen: boolean;
    aiEnabled?: boolean;
  };
  addNote: (note: Note) => void;
  addComment: (noteId: string, text: string) => void;
  updateComment: (noteId: string, commentId: string, updates: Comment) => void;
  removeComment: (noteId: string, commentId: string) => void;
  addLabel: (noteId: string, label: Label) => void;
  removeLabel: (noteId: string, labelId: string) => void;
  updateLabel: (noteId: string, labelId: string, updates: Label) => void;
  addAttachment: (noteId: string, attachment: Attachment) => void;
  removeAttachment: (noteId: string, attachmentId: string) => void;
  updateAttachment: (noteId: string, attachmentId: string, updates: Attachment) => void;
  setDueDate: (noteId: string, dueDate: string) => void;
  setPriority: (noteId: string, priority: 'low' | 'medium' | 'high') => void;
  setAssignee: (noteId: string, assignee: string) => void;
  toggleExpanded: (noteId: string) => void;
  setReminder: (noteId: string, reminder: string) => void;
  deleteNote: (id: string) => void;
  completeNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  moveNote: (id: string, position: Position) => void;
  addTask: (noteId: string, task: { text: string; done: boolean }) => void;
  toggleTask: (noteId: string, taskId: string) => void;
  updateCategoryColor: (category: string, color: string) => void;
  toggleShowCompletedNotes: () => void;
  setDefaultNoteColor: (color: string) => void;
  toggleSettingsOpen: () => void;
  addCustomCategory: (category: string, color: string) => void;
  setNotes: (notes: Note[]) => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set) => ({
      notes: [] as Note[],
      settings: {
        categoryColors: defaultCategoryColors,
        showCompletedNotes: true,
        defaultNoteColor: 'blue',
        isSettingsOpen: false,
      },
      addComment: (noteId, text) =>
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === noteId) {
              return {
                ...note,
                comments: [
                  ...(note.comments || []),
                  {
                    id: crypto.randomUUID(),
                    text,
                    timestamp: Date.now(),
                  },
                ],
              };
            }
            return note;
          }),
        })),
      updateComment: (noteId, commentId, updates) =>
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === noteId && note.comments) {
              return {
                ...note,
                comments: note.comments.map(comment => 
                  comment.id === commentId ? { ...comment, ...updates } : comment
                ),
              };
            }
            return note;
          }),
        })),
      removeComment: (noteId, commentId) =>
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === noteId && note.comments) {
              return {
                ...note,
                comments: note.comments.filter(comment => comment.id !== commentId),
              };
            }
            return note;
          }),
        })),
      addLabel: (noteId, label) =>
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === noteId) {
              return {
                ...note,
                labels: [...(note.labels || []), label],
              };
            }
            return note;
          }),
        })),
      removeLabel: (noteId, labelId) =>
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === noteId && note.labels) {
              return {
                ...note,
                labels: note.labels.filter(label => label.id !== labelId),
              };
            }
            return note;
          }),
        })),
      updateLabel: (noteId, labelId, updates) =>
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === noteId && note.labels) {
              return {
                ...note,
                labels: note.labels.map(label => 
                  label.id === labelId ? { ...label, ...updates } : label
                ),
              };
            }
            return note;
          }),
        })),
      addAttachment: (noteId, attachment) =>
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === noteId) {
              return {
                ...note,
                attachments: [...(note.attachments || []), attachment],
              };
            }
            return note;
          }),
        })),
      removeAttachment: (noteId, attachmentId) =>
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === noteId && note.attachments) {
              return {
                ...note,
                attachments: note.attachments.filter(attachment => attachment.id !== attachmentId),
              };
            }
            return note;
          }),
        })),
      updateAttachment: (noteId, attachmentId, updates) =>
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === noteId && note.attachments) {
              return {
                ...note,
                attachments: note.attachments.map(attachment => 
                  attachment.id === attachmentId ? { ...attachment, ...updates } : attachment
                ),
              };
            }
            return note;
          }),
        })),
      setDueDate: (noteId, dueDate) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, dueDate } : note
          ),
        })),
      setPriority: (noteId, priority) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, priority } : note
          ),
        })),
      setAssignee: (noteId, assignee) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, assignee } : note
          ),
        })),
      toggleExpanded: (noteId) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, expanded: !note.expanded } : note
          ),
        })),
      setReminder: (noteId, reminder) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, reminder } : note
          ),
        })),
      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
        })),
      completeNote: (id) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, completed: true } : note
          ),
        })),
      addNote: (note) =>
        set((state) => {
          // Prevent duplicate notes at the same position
          const adjustedPosition = {
            x: note.position.x + Math.random() * 50,
            y: note.position.y + Math.random() * 50
          };
          // Ensure the expanded property is true by default
          return { 
            notes: [
              ...state.notes, 
              { 
                ...note, 
                position: adjustedPosition,
                expanded: note.expanded !== undefined ? note.expanded : true 
              }
            ] 
          };
        }),
      updateNote: (id, updates) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, ...updates } : note
          ),
        })),
      moveNote: (id, position) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, position } : note
          ),
        })),
      addTask: (noteId, task) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  tasks: [...(note.tasks || []), { ...task, id: crypto.randomUUID() }],
                }
              : note
          ),
        })),
      toggleTask: (noteId, taskId) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  tasks: note.tasks?.map((task) =>
                    task.id === taskId ? { ...task, done: !task.done } : task
                  ),
                }
              : note
          ),
        })),
      updateCategoryColor: (category, color) =>
        set((state) => ({
          settings: {
            ...state.settings,
            categoryColors: {
              ...state.settings.categoryColors,
              [category]: color as NoteColor,
            },
          },
        })),
      toggleShowCompletedNotes: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            showCompletedNotes: !state.settings.showCompletedNotes,
          },
        })),
      setDefaultNoteColor: (color) =>
        set((state) => ({
          settings: {
            ...state.settings,
            defaultNoteColor: color,
          },
        })),
      toggleSettingsOpen: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            isSettingsOpen: !state.settings.isSettingsOpen,
          },
        })),
      addCustomCategory: (category, color) =>
        set((state) => ({
          settings: {
            ...state.settings,
            categoryColors: {
              ...state.settings.categoryColors,
              [category]: color as NoteColor,
            },
          },
        })),
      setNotes: (notes) => set({ notes }),
    }),
    {
      name: 'note-storage',
    }
  )
);