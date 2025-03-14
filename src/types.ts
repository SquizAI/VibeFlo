export interface Position {
  x: number;
  y: number;
}

export interface Attachment {
  id: string;
  type: 'link' | 'image' | 'file';
  url: string;
  title: string;
}

export interface Comment {
  id: string;
  text: string;
  timestamp: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

// Available color types for notes and categories
export type NoteColor = 
  | 'blue' | 'green' | 'pink' | 'yellow' 
  | 'purple' | 'orange' | 'teal' | 'red'
  | 'indigo' | 'amber' | 'emerald' | 'rose';

// Map of category names to their assigned colors
export interface CategoryColorMap {
  [category: string]: NoteColor;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  category?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  subtasks?: Task[];
  isExpanded?: boolean;
  parentId?: string;
  depth?: number;
}

export interface Note {
  id: string;
  type: 'sticky' | 'task' | 'project';
  content: string;
  position: Position;
  color: string;
  completed?: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  labels?: Label[];
  attachments?: Attachment[];
  comments?: Comment[];
  assignee?: string;
  expanded?: boolean;
  reminder?: string;
  tasks?: Task[];
  category?: string;
  size?: {
    width: number;
    height: number;
  };
  aiSuggestions?: {
    reasoning?: string;
    category?: string;
    taskCount?: number;
    suggestions?: string[];
  };
}