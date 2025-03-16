import { useCallback } from 'react';
import { NoteType, Task } from '../types';

export function useTaskOperations(
  note: NoteType,
  onUpdateNote?: (id: string, updates: Partial<NoteType>) => void
) {
  // Add a new task to the note
  const addTask = useCallback((text: string) => {
    if (!onUpdateNote) return;
    
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      done: false,
      createdAt: new Date().toISOString()
    };
    
    const updatedTasks = [...(note.tasks || []), newTask];
    onUpdateNote(note.id, { tasks: updatedTasks });
  }, [note, onUpdateNote]);
  
  // Update an existing task
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    if (!onUpdateNote || !note.tasks) return;
    
    const updatedTasks = note.tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    
    onUpdateNote(note.id, { tasks: updatedTasks });
  }, [note, onUpdateNote]);
  
  // Delete a task
  const deleteTask = useCallback((taskId: string) => {
    if (!onUpdateNote || !note.tasks) return;
    
    const updatedTasks = note.tasks.filter(task => task.id !== taskId);
    onUpdateNote(note.id, { tasks: updatedTasks });
  }, [note, onUpdateNote]);
  
  return {
    addTask,
    updateTask,
    deleteTask
  };
}

export default useTaskOperations; 