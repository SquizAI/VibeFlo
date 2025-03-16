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
  description?: string; // Plain text description (for backwards compatibility)
  richDescription?: string; // Rich text HTML content
  done: boolean;
  category?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  subtasks: Task[];
  isExpanded: boolean;
  parentId?: string;
  depth: number;
  progress?: number;
  estimatedTime?: number;
  actualTime?: number;
  startDate?: string;
  completedDate?: string;
  notes?: string;
  customFields?: Record<string, any>;
  dependencies?: string[];
  blockedBy?: string[];
  assignee?: string;
  createdAt?: number;
  updatedAt?: number;
  reminders?: string[];
  isRecurring?: boolean;
  recurrencePattern?: { 
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    endDate?: string;
    endAfterOccurrences?: number;
    daysOfWeek?: number[];
    customPattern?: string;
  };
  timeTracking?: {
    logs: {
      startTime: number;
      endTime?: number;
      duration?: number;
      note?: string;
    }[];
    totalTime: number;
    isRunning: boolean;
    currentSessionStart?: number;
  };
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  tags?: string[];
  tasks: Task[];
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
  isBuiltIn?: boolean; // Whether this is a built-in template or user-created
  useCount?: number; // How many times this template has been used
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
  templates?: TaskTemplate[];
  viewMode?: 'list' | 'kanban' | 'calendar' | 'gantt';
  expandedState?: Record<string, boolean>;
  linkedNotes?: string[];
  customFields?: Record<string, any>;
  version?: number;
  versions?: NoteVersion[];
  collaborators?: string[];
  lastEditedBy?: string;
  isArchived?: boolean;
  isPasswordProtected?: boolean;
  password?: string; // In a real app this would be a hashed password
  securityLevel?: 'none' | 'low' | 'medium' | 'high'; // Optional security level for different encryption types
  isHidden?: boolean;
  isLocked?: boolean;
  insights?: {
    key_topics?: string[];
    timeframe?: string;
    action_required?: boolean;
    summary?: string;
  };
}

export interface NoteVersion {
  id: string;
  noteId: string;
  content: string;
  tasks?: Task[];
  timestamp: number;
  editedBy?: string;
  changeDescription?: string;
}