import { Task, Note } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Ensures a task has the required fields for the new task format
 * and calculates the correct depth and expanded status
 */
export function migrateTask(task: any, depth = 0, parentId?: string): Task {
  // Ensure task has an ID
  const taskId = task.id || uuidv4();
  
  // Migrate subtasks recursively if they exist
  const subtasks = Array.isArray(task.subtasks)
    ? task.subtasks.map((subtask: any) => migrateTask(subtask, depth + 1, taskId))
    : [];
  
  return {
    id: taskId,
    text: task.text || '',
    description: task.description || '',
    richDescription: task.richDescription || '',
    done: task.done === true,
    subtasks,
    // Ensure required properties have default values
    isExpanded: task.isExpanded !== undefined ? task.isExpanded : true,
    depth: task.depth !== undefined ? depth : 0,
    // Preserve other properties
    category: task.category,
    dueDate: task.dueDate,
    priority: task.priority || 'medium',
    parentId,
    progress: task.progress,
    estimatedTime: task.estimatedTime,
    actualTime: task.actualTime,
    startDate: task.startDate,
    completedDate: task.completedDate,
    notes: task.notes,
    customFields: task.customFields,
    dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
    blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy : [],
    assignee: task.assignee,
    createdAt: task.createdAt || Date.now(),
    updatedAt: task.updatedAt || Date.now(),
    reminders: task.reminders,
    isRecurring: task.isRecurring,
    recurrencePattern: task.recurrencePattern
  };
}

/**
 * Migrates all tasks in a note to the new format
 */
export function migrateNoteTasks(note: Note): Note {
  if (!note.tasks || !Array.isArray(note.tasks) || note.tasks.length === 0) {
    return note;
  }
  
  return {
    ...note,
    tasks: note.tasks.map(task => migrateTask(task))
  };
}

/**
 * Migrates a collection of notes
 */
export function migrateNotes(notes: Note[]): Note[] {
  return notes.map(note => migrateNoteTasks(note));
}

/**
 * Finds all subtasks of a task, recursively
 */
export function findAllSubtasks(task: Task): Task[] {
  if (!task.subtasks || !Array.isArray(task.subtasks) || task.subtasks.length === 0) {
    return [];
  }
  
  // Include direct subtasks and their subtasks
  return [
    ...task.subtasks,
    ...task.subtasks.flatMap(subtask => findAllSubtasks(subtask))
  ];
}

/**
 * Finds a task by ID within a list of tasks (including all subtasks)
 */
export function findTaskById(tasks: Task[], taskId: string): Task | undefined {
  for (const task of tasks) {
    if (task.id === taskId) {
      return task;
    }
    
    // Search in subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      const foundInSubtasks = findTaskById(task.subtasks, taskId);
      if (foundInSubtasks) {
        return foundInSubtasks;
      }
    }
  }
  
  return undefined;
}

/**
 * Checks if a task has the given task as a descendant (direct or indirect subtask)
 */
export function isDescendantTask(parentTask: Task, potentialDescendantId: string): boolean {
  if (!parentTask.subtasks || parentTask.subtasks.length === 0) {
    return false;
  }
  
  // Check direct subtasks
  if (parentTask.subtasks.some(subtask => subtask.id === potentialDescendantId)) {
    return true;
  }
  
  // Check indirect subtasks (recursively)
  return parentTask.subtasks.some(subtask => isDescendantTask(subtask, potentialDescendantId));
}

/**
 * Validates task relationships to prevent circular dependencies
 */
export function validateTaskHierarchy(tasks: Task[]): boolean {
  // Check each task for circular references
  const validateTask = (task: Task, ancestors: Set<string> = new Set()): boolean => {
    // If task ID is already in ancestors, we have a circular reference
    if (ancestors.has(task.id)) {
      return false;
    }
    
    // Add current task to ancestors
    const newAncestors = new Set(ancestors);
    newAncestors.add(task.id);
    
    // Check all subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      for (const subtask of task.subtasks) {
        if (!validateTask(subtask, newAncestors)) {
          return false;
        }
      }
    }
    
    return true;
  };
  
  // Validate all top-level tasks
  return tasks.every(task => validateTask(task));
}

/**
 * Updates task depth based on its position in the hierarchy
 */
export function updateTaskDepths(tasks: Task[], parentDepth: number = -1): Task[] {
  return tasks.map(task => {
    const depth = parentDepth + 1;
    
    return {
      ...task,
      depth,
      subtasks: task.subtasks && task.subtasks.length > 0
        ? updateTaskDepths(task.subtasks, depth)
        : []
    };
  });
}

/**
 * Recursively calculates the correct depth for all tasks in a list
 */
export function calculateTaskDepths(tasks: Task[], depth = 0): Task[] {
  return tasks.map(task => ({
    ...task,
    depth,
    subtasks: calculateTaskDepths(task.subtasks || [], depth + 1)
  }));
}

/**
 * Calculates the completion percentage of a task based on subtasks
 */
export function calculateTaskProgress(task: Task): number {
  if (!task.subtasks || task.subtasks.length === 0) {
    return task.done ? 100 : 0;
  }
  
  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter(subtask => {
    // If subtask has subtasks, use their completion percentage
    if (subtask.subtasks && subtask.subtasks.length > 0) {
      return calculateTaskProgress(subtask) === 100;
    }
    return subtask.done;
  }).length;
  
  return Math.round((completedSubtasks / totalSubtasks) * 100);
}

/**
 * Migrates a list of tasks in the legacy format to the new enhanced format
 */
export function migrateTasks(tasks: any[]): Task[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(task => migrateTask(task));
} 