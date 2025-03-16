/**
 * Project Manager Types
 * Central definition for all type interfaces used in the application
 */

// Basic position type for coordinates
export interface Position {
  x: number;
  y: number;
}

// File attachments 
export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  title?: string;
}

// Comments on notes
export interface Comment {
  id: string;
  text: string;
  timestamp: number;
  author?: string;
}

// Labels/tags for notes
export interface Label {
  id: string;
  name: string;
  color: string;
}

// Collaborator information
export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
}

// Available color types for notes and categories
export type NoteColor = 
  | 'blue' | 'green' | 'pink' | 'yellow' 
  | 'purple' | 'orange' | 'teal' | 'red'
  | 'indigo' | 'amber' | 'emerald' | 'rose'
  | 'sky' | 'lime' | 'fuchsia' | 'cyan'
  | 'slate' | 'gray';

// Map of category names to their assigned colors
export interface CategoryColorMap {
  [category: string]: NoteColor;
}

// Priority levels
export type PriorityLevel = 'low' | 'medium' | 'high';

// Note status types
export type NoteStatus = 'active' | 'archived' | 'completed';

// Task interface - for todo items
export interface Task {
  id: string;
  text: string;
  done: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  priority?: PriorityLevel;
  subtasks?: Task[];
  isExpanded?: boolean;
  parentId?: string;  // ID of parent task if this is a subtask
  order?: number;     // For sorting tasks
  depth?: number;     // Nesting level for hierarchical display
}

// Note types
export type NoteType = 'sticky' | 'task' | 'project' | 'recipe' | 'api' | 'code' | 'database' | 'document' | 'list' | 'terminal' | 'git' | 'config' | 'marketing';

// Note interface - primary data structure
export interface Note {
  id: string;
  type: NoteType;
  content: string;
  position: Position;
  color: string;
  category?: string;
  tasks?: Task[];
  expanded?: boolean;
  labels?: Label[];
  pinned?: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  assignee?: string;
  reminder?: string;
  attachments?: Attachment[];
  comments?: Comment[];
  completed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isVoiceNote?: boolean; // Flag to indicate if this note was created from voice dictation
  aiSuggestions?: any[];
  tags?: string[];
  sharedWith?: string[]; // IDs of users this note is shared with
  location?: string;
  laneId?: string; // ID of the kanban lane this note belongs to
  url?: string;
  collaborators?: Collaborator[];
  reminderDate?: string;
  status?: NoteStatus;
  size?: {
    width: number;
    height: number;
  };
  originalNoteId?: string;
}

// Custom tab/collection type
export interface CustomTab {
  id: string;
  name: string;
  icon: React.ReactNode;
  notes: string[]; // IDs of notes in this tab
}

// Time indicator for note age/update
export interface TimeSince {
  created: string;
  updated: string;
}

// Canvas cell for grid organization
export interface GridCell {
  id: string;
  row: number;
  col: number;
  noteIds: string[];
}

// Export component prop types to prevent duplication
export interface NoteProps {
  note: Note;
  onMove: (id: string, newPosition: Position) => void;
  onContentChange?: (id: string, content: string) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onUpdateNote?: (id: string, updates: Partial<Note>) => void;
  onDeleteNote?: (id: string) => void;
  isEnlarged?: boolean;
  onPinNote?: (id: string) => void;
  onStartDrag?: (id: string) => void;
  onEndDrag?: (id: string) => void;
  containerWidth?: number;
  containerHeight?: number;
}

export interface TaskItemProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}

export interface NoteTaskListProps {
  tasks: Task[];
  onAddTask: (text: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}