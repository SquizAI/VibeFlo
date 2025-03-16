import React, { useState, useRef } from 'react';
import { 
  ChevronDown, ChevronRight, Check, Clock, Flag, 
  MoreVertical, Plus, Trash, Edit, Calendar, ArrowUpDown
} from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { format, isAfter } from 'date-fns';
import { Task } from '../types';
import { getTaskTheme, TaskTheme } from '../styles/taskThemes';

export interface TaskItemProps {
  task: Task;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
  depth?: number;
  theme?: 'default' | 'compact' | 'kanban';
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onUpdate,
  onDelete,
  onAddSubtask,
  depth = 0,
  theme = 'default',
  isDraggable = false,
  onDragStart
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const styles = getTaskTheme(theme);

  // Handle toggling task completion
  const handleToggleComplete = () => {
    onUpdate(task.id, { 
      done: !task.done,
      // If task is being marked done, set completedDate
      completedDate: !task.done ? new Date().toISOString() : undefined
    });
  };

  // Handle toggling expanded state for subtasks
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(task.id, { isExpanded: !task.isExpanded });
  };

  // Handle editing task text
  const handleEditText = (newText: string) => {
    onUpdate(task.id, { text: newText });
  };

  // Handle keydown events in the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
    }
  };

  // Calculate progress percentage
  const progressPercentage = task.progress || 0;
  
  // Determine if due date is past due
  const isPastDue = task.dueDate && isAfter(new Date(), new Date(task.dueDate));

  // Handle starting the drag
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (onDragStart && isDraggable) {
      onDragStart(e, task);
    }
  };

  // Format a date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM d');
    } catch (error) {
      return null;
    }
  };

  // Priority icons
  const getPriorityIcon = () => {
    switch (task.priority) {
      case 'high':
        return <Flag className={`w-3 h-3 ${styles.priority.high}`} />;
      case 'medium':
        return <Flag className={`w-3 h-3 ${styles.priority.medium}`} />;
      case 'low':
        return <Flag className={`w-3 h-3 ${styles.priority.low}`} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <div 
        className={styles.task}
        draggable={isDraggable}
        onDragStart={handleDragStart}
      >
        <div className={styles.taskContent}>
          <div className={styles.taskHeader}>
            {task.subtasks && task.subtasks.length > 0 && (
              <button
                className={styles.expandButton}
                onClick={handleToggleExpand}
              >
                {task.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            {!task.subtasks || task.subtasks.length === 0 ? (
              <div className="w-4" /> // Spacer to align with tasks that have the expand button
            ) : null}
            
            <div 
              className={task.done ? styles.checkboxComplete : styles.checkbox}
              onClick={handleToggleComplete}
            >
              {task.done && <Check size={12} />}
            </div>

            {isEditing ? (
              <TextareaAutosize
                ref={inputRef}
                value={task.text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleEditText(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={handleKeyDown}
                className={styles.taskInput}
                autoFocus
              />
            ) : (
              <span 
                className={task.done ? styles.completedTaskText : styles.taskText}
                onClick={() => setIsEditing(true)}
              >
                {task.text}
              </span>
            )}

            {isDraggable && (
              <ArrowUpDown 
                size={14} 
                className={styles.dragHandle} 
              />
            )}

            <div className="relative">
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setShowOptions(!showOptions)}
              >
                <MoreVertical size={14} />
              </button>
              
              {showOptions && (
                <div className={styles.actionsMenu}>
                  <button
                    className="flex items-center gap-1 p-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded w-full text-left"
                    onClick={() => {
                      setShowOptions(false);
                      setIsEditing(true);
                    }}
                  >
                    <Edit size={12} />
                    Edit
                  </button>
                  <button
                    className="flex items-center gap-1 p-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded w-full text-left"
                    onClick={() => {
                      setShowOptions(false);
                      onAddSubtask(task.id);
                    }}
                  >
                    <Plus size={12} />
                    Add Subtask
                  </button>
                  <button
                    className="flex items-center gap-1 p-1 text-xs text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded w-full text-left"
                    onClick={() => {
                      setShowOptions(false);
                      onDelete(task.id);
                    }}
                  >
                    <Trash size={12} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.metaContainer}>
            {task.dueDate && (
              <span className={`${styles.dueDate} ${isPastDue ? styles.pastDue : ''}`}>
                <Calendar size={12} />
                {formatDate(task.dueDate)}
              </span>
            )}
            
            {task.priority && getPriorityIcon()}
            
            {task.estimatedTime && (
              <span className={styles.dueDate}>
                <Clock size={12} />
                {task.estimatedTime}m
              </span>
            )}
          </div>

          {progressPercentage > 0 && (
            <div className={styles.progress}>
              <div 
                className={styles.progressBar} 
                style={{ width: `${progressPercentage}%` }} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Render subtasks recursively */}
      {task.subtasks && 
       task.subtasks.length > 0 && 
       task.isExpanded && (
        <div className="pl-4">
          {task.subtasks.map(subtask => (
            <TaskItem 
              key={subtask.id}
              task={subtask}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              depth={depth + 1}
              theme={theme}
              isDraggable={isDraggable}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}; 