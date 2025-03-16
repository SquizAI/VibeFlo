import React, { useState } from 'react';
import { Square, CheckSquare, Trash, Pencil, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { Task, TaskItemProps } from '../../types';
import { v4 as uuidv4 } from 'uuid';

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [showTags, setShowTags] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(task.isExpanded || false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  
  // Toggle the completed status of the task
  const toggleTaskCompletion = () => {
    onUpdate({ done: !task.done });
  };
  
  // Start editing the task
  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent task completion toggle
    setIsEditing(true);
  };
  
  // Save edits and exit editing mode
  const saveEdit = () => {
    if (editText.trim()) {
      onUpdate({ text: editText.trim() });
    }
    setIsEditing(false);
  };
  
  // Handle when user presses Enter to save or Escape to cancel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditText(task.text);
      setIsEditing(false);
    }
  };

  // Toggle showing tags
  const toggleTags = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTags(!showTags);
  };

  // Toggle showing subtasks
  const toggleSubtasks = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSubtasks(!showSubtasks);
  };

  // Handle adding a subtask
  const addSubtask = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingSubtask(true);
  };

  // Handle creating a new subtask
  const createSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newSubtaskText.trim()) {
      // Create new subtask
      const newSubtask: Task = {
        id: uuidv4(),
        text: newSubtaskText.trim(),
        done: false,
        createdAt: new Date().toISOString(),
        parentId: task.id
      };
      
      // Update parent task with new subtask
      const updatedSubtasks = [...(task.subtasks || []), newSubtask];
      onUpdate({ subtasks: updatedSubtasks });
      
      // Reset state
      setNewSubtaskText('');
      setAddingSubtask(false);
      setShowSubtasks(true); // Show subtasks after adding
    } else {
      setAddingSubtask(false);
    }
  };

  // Handle updating a subtask
  const updateSubtask = (subtaskId: string, updates: Partial<Task>) => {
    if (task.subtasks) {
      const updatedSubtasks = task.subtasks.map(subtask => 
        subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
      );
      onUpdate({ subtasks: updatedSubtasks });
    }
  };

  // Handle deleting a subtask
  const deleteSubtask = (subtaskId: string) => {
    if (task.subtasks) {
      const updatedSubtasks = task.subtasks.filter(subtask => subtask.id !== subtaskId);
      onUpdate({ subtasks: updatedSubtasks });
    }
  };

  // Check if task has subtasks
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <div className="task-item-container">
      <li className="task-item flex items-start gap-2 py-1 group">
        {/* Task checkbox */}
        <button
          className="flex-shrink-0 mt-0.5"
          onClick={toggleTaskCompletion}
          aria-label={task.done ? "Mark as incomplete" : "Mark as complete"}
        >
          {task.done ? (
            <CheckSquare className="w-4 h-4 text-accent-blue" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
        
        {/* Task content */}
        {isEditing ? (
          <input
            type="text"
            className="flex-1 bg-white/5 p-1 rounded outline-none focus:ring-1 focus:ring-accent-blue text-sm"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <div 
            className={`flex-1 ${task.done ? 'line-through text-text-secondary' : ''}`}
            onClick={toggleTaskCompletion}
          >
            <span className="task-text">{task.text}</span>
            
            {/* Subtask indicator */}
            {hasSubtasks && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-accent-blue/20 text-accent-blue">
                {task.subtasks!.length} subtask{task.subtasks!.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
        
        {/* Task actions */}
        <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Add subtask button */}
          <button
            className="p-1 hover:bg-white/10 rounded text-accent-blue"
            onClick={addSubtask}
            aria-label="Add subtask"
            title="Add subtask"
          >
            <Plus className="w-3 h-3" />
          </button>

          {!isEditing && (
            <button
              className="p-1 hover:bg-white/10 rounded"
              onClick={startEditing}
              aria-label="Edit task"
              title="Edit task"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          
          <button
            className="p-1 hover:bg-white/10 rounded"
            onClick={onDelete}
            aria-label="Delete task"
            title="Delete task"
          >
            <Trash className="w-3 h-3" />
          </button>

          {/* Tag expander button (only show if task has category) */}
          {task.category && (
            <button
              className="p-1 hover:bg-white/10 rounded"
              onClick={toggleTags}
              aria-label={showTags ? "Hide tags" : "Show tags"}
              title={showTags ? "Hide tags" : "Show tags"}
            >
              {showTags ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          
          {/* Subtasks expander button (only show if task has subtasks) */}
          {hasSubtasks && (
            <button
              className="p-1 hover:bg-white/10 rounded text-accent-blue"
              onClick={toggleSubtasks}
              aria-label={showSubtasks ? "Hide subtasks" : "Show subtasks"}
              title={showSubtasks ? "Hide subtasks" : "Show subtasks"}
            >
              {showSubtasks ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </li>
      
      {/* Tags section (hidden by default) */}
      {showTags && task.category && (
        <div className="ml-6 mt-1 mb-2 text-xs">
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-text-secondary">
            {task.category}
          </span>
        </div>
      )}
      
      {/* Subtasks section (hidden by default) */}
      {(showSubtasks && hasSubtasks || addingSubtask) && (
        <div className="ml-6 mt-1 space-y-1 border-l-2 border-accent-blue/20 pl-2">
          {/* Subtask list */}
          {hasSubtasks && showSubtasks && (
            <ul className="space-y-1">
              {task.subtasks!.map(subtask => (
                <li key={subtask.id} className="flex items-start gap-2 py-0.5 group">
                  <button
                    className="flex-shrink-0 mt-0.5"
                    onClick={() => updateSubtask(subtask.id, { done: !subtask.done })}
                    aria-label={subtask.done ? "Mark as incomplete" : "Mark as complete"}
                  >
                    {subtask.done ? (
                      <CheckSquare className="w-3 h-3 text-accent-blue" />
                    ) : (
                      <Square className="w-3 h-3" />
                    )}
                  </button>
                  
                  <div 
                    className={`flex-1 text-sm ${subtask.done ? 'line-through text-text-secondary' : ''}`}
                    onClick={() => updateSubtask(subtask.id, { done: !subtask.done })}
                  >
                    {subtask.text}
                  </div>
                  
                  <button
                    className="p-0.5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100"
                    onClick={() => deleteSubtask(subtask.id)}
                    aria-label="Delete subtask"
                    title="Delete subtask"
                  >
                    <Trash className="w-2.5 h-2.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          
          {/* Add subtask form */}
          {addingSubtask && (
            <form onSubmit={createSubtask} className="flex items-center gap-1 mt-1">
              <input
                type="text"
                className="flex-1 bg-white/5 p-1 text-sm rounded outline-none focus:ring-1 focus:ring-accent-blue"
                placeholder="New subtask..."
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="p-1 bg-accent-blue text-white rounded"
                disabled={!newSubtaskText.trim()}
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                type="button"
                className="p-1 hover:bg-white/10 rounded"
                onClick={() => setAddingSubtask(false)}
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskItem; 