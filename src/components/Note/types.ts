import { ReactNode } from 'react';
import { 
  Note, 
  Task, 
  Position, 
  NoteProps, 
  TaskItemProps, 
  NoteTaskListProps 
} from '../../types';

// Re-export these types for backward compatibility
export type { Note as NoteType, Task, Position };

// Component-specific props that aren't in the central types file
export interface NoteHeaderProps {
  note: Note;
  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;
  onDeleteNote: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSendToKanban?: (noteId: string, laneId: string) => void;
}

export interface NoteContentProps {
  content: string;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onChange: (content: string) => void;
}

export interface ColorPickerProps {
  currentColor: string;
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

// Re-export these props types for backward compatibility
export type { NoteProps, TaskItemProps, NoteTaskListProps };

export type CategoryColorMap = Record<string, string>; 