import React, { useState, useRef } from 'react';
import { Search, Filter, Plus, ChevronDown, ChevronUp, ArrowDown, ArrowUp, X, Calendar, Clock, List, LayoutGrid, Copy, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskTemplate } from '../types';
import { TaskItem } from './TaskItem';
import { getTaskTheme } from '../styles/taskThemes';
import { migrateTask, updateTaskDepths, findTaskById } from '../utils/taskMigrationUtil';
import { useDrag, useDrop } from 'react-dnd';
import { format, isPast, isToday, addDays, isFuture } from 'date-fns';
import { RichTextEditor } from './RichTextEditor';
import { TaskTemplates } from './TaskTemplates';

// ItemTypes for drag and drop
const ItemTypes = {
  TASK: 'task'
};

interface TaskListProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  showHeader?: boolean;
  showAddButton?: boolean;
  showFilters?: boolean;
  viewMode?: 'default' | 'compact' | 'kanban';
  readOnly?: boolean;
  className?: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onTasksChange,
  showHeader = true,
  showAddButton = true,
  showFilters = true,
  viewMode = 'default',
  readOnly = false,
  className = '',
}) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterDueDate, setFilterDueDate] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'future'>('all');
  const [sortBy, setSortBy] = useState<'none' | 'priority' | 'dueDate' | 'alphabetical'>('none');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  
  const styles = getTaskTheme(viewMode);

  // Add a new task
  const addTask = () => {
    if (newTaskText.trim() === '') return;
    
    const newTask: Task = {
      id: uuidv4(),
      text: newTaskText,
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      subtasks: [],
      isExpanded: true,
      depth: 0
    };
    
    onTasksChange([...tasks, newTask]);
    setNewTaskText('');
    
    // Focus the input field after adding a task
    if (newTaskInputRef.current) {
      newTaskInputRef.current.focus();
    }
  };
  
  // Add a subtask to a parent task
  const addSubtask = (parentId: string, text: string = 'New subtask') => {
    const updatedTasks = [...tasks];
    
    const addSubtaskHelper = (taskList: Task[], parentTaskId: string): boolean => {
      for (let i = 0; i < taskList.length; i++) {
        if (taskList[i].id === parentTaskId) {
          // Found the parent task, add subtask
          const newSubtask: Task = {
            id: uuidv4(),
            text,
            done: false,
            subtasks: [],
            isExpanded: true,
            depth: taskList[i].depth + 1,
            parentId: parentTaskId,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          taskList[i].subtasks = [...(taskList[i].subtasks || []), newSubtask];
          taskList[i].isExpanded = true; // Expand parent
          return true;
        }
        
        // Recursively check subtasks
        if (taskList[i].subtasks && taskList[i].subtasks.length > 0) {
          if (addSubtaskHelper(taskList[i].subtasks, parentTaskId)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    addSubtaskHelper(updatedTasks, parentId);
    onTasksChange(updatedTasks);
  };
  
  // Update a task's properties
  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = [...tasks];
    
    const updateTaskHelper = (taskList: Task[], targetId: string): boolean => {
      for (let i = 0; i < taskList.length; i++) {
        if (taskList[i].id === targetId) {
          // Found the task to update
          taskList[i] = {
            ...taskList[i],
            ...updates,
            updatedAt: Date.now()
          };
          return true;
        }
        
        // Recursively check subtasks
        if (taskList[i].subtasks && taskList[i].subtasks.length > 0) {
          if (updateTaskHelper(taskList[i].subtasks, targetId)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    updateTaskHelper(updatedTasks, taskId);
    onTasksChange(updatedTasks);
  };
  
  // Delete a task and its subtasks
  const deleteTask = (taskId: string) => {
    const deleteTaskHelper = (taskList: Task[]): Task[] => {
      return taskList.filter(task => {
        if (task.id === taskId) {
          return false; // Remove this task
        }
        
        // Recursively filter subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks = deleteTaskHelper(task.subtasks);
        }
        
        return true;
      });
    };
    
    const updatedTasks = deleteTaskHelper([...tasks]);
    onTasksChange(updatedTasks);
  };
  
  // Move task (reordering) with improved performance
  const moveTask = (dragId: string, hoverId: string) => {
    console.log(`Moving task ${dragId} to position ${hoverId}`);
    
    // Skip if same task
    if (dragId === hoverId) return;
    
    const removeTaskById = (taskList: Task[], id: string): Task | undefined => {
      for (let i = 0; i < taskList.length; i++) {
        if (taskList[i].id === id) {
          // Found the task to remove
          const removedTask = taskList.splice(i, 1)[0];
          return removedTask;
        }
        
        // Check in subtasks
        if (taskList[i].subtasks && taskList[i].subtasks.length > 0) {
          const removedFromSubtasks = removeTaskById(taskList[i].subtasks, id);
          if (removedFromSubtasks) {
            return removedFromSubtasks;
          }
        }
      }
      
      return undefined;
    };
    
    const insertTaskAfter = (taskList: Task[], targetId: string, taskToInsert: Task): boolean => {
      for (let i = 0; i < taskList.length; i++) {
        if (taskList[i].id === targetId) {
          // Found the target task, insert after
          
          // If both tasks have same parent, just update the depth
          if (taskList[i].parentId === taskToInsert.parentId) {
            taskToInsert.depth = taskList[i].depth;
          } 
          // Otherwise we need to adjust the depth - joining a new parent level
          else {
            taskToInsert.parentId = taskList[i].parentId;
            taskToInsert.depth = taskList[i].depth;
          }
          
          // Insert the task after the target
          taskList.splice(i + 1, 0, taskToInsert);
          // Highlight moving task
          setTimeout(() => {
            const taskEl = document.getElementById(`task-${taskToInsert.id}`);
            if (taskEl) {
              taskEl.classList.add('task-highlight');
              setTimeout(() => taskEl.classList.remove('task-highlight'), 1000);
            }
          }, 10);
          return true;
        }
        
        // Check in subtasks
        if (taskList[i].subtasks && taskList[i].subtasks.length > 0) {
          const insertedInSubtasks = insertTaskAfter(taskList[i].subtasks, targetId, taskToInsert);
          if (insertedInSubtasks) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    const updatedTasks = [...tasks];
    const draggedTask = removeTaskById(updatedTasks, dragId);
    
    if (!draggedTask) {
      console.error(`Could not find task with id ${dragId}`);
      return;
    }
    
    const success = insertTaskAfter(updatedTasks, hoverId, draggedTask);
    
    if (!success) {
      console.error(`Could not find task with id ${hoverId} to insert after`);
      // If we failed to insert, add back to the end
      updatedTasks.push(draggedTask);
    }
    
    // Make sure we update all task depths properly
    updateTaskDepths(updatedTasks);
    
    onTasksChange(updatedTasks);
  };
  
  // Filter tasks based on current filters and search term
  const getFilteredTasks = (taskList: Task[]): Task[] => {
    return taskList.map(task => {
      // Determine if this task matches the filters
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'active' && !task.done) || 
        (filterStatus === 'completed' && task.done);
      
      const matchesPriority = 
        filterPriority === 'all' || 
        task.priority === filterPriority;
      
      const matchesDueDate = filterDueDate === 'all' || 
        (filterDueDate === 'overdue' && task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))) ||
        (filterDueDate === 'today' && task.dueDate && isToday(new Date(task.dueDate))) ||
        (filterDueDate === 'upcoming' && task.dueDate && isFuture(new Date(task.dueDate)) && 
          !isFuture(addDays(new Date(), 7)) // Within the next 7 days
        ) ||
        (filterDueDate === 'future' && task.dueDate && isFuture(addDays(new Date(task.dueDate), 7)));
      
      const matchesSearch = !searchTerm || 
        task.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Create a copy that only includes matching subtasks
      let filteredSubtasks: Task[] = [];
      
      if (task.subtasks && task.subtasks.length > 0) {
        filteredSubtasks = getFilteredTasks(task.subtasks);
      }
      
      const matchesFilters = matchesStatus && matchesPriority && matchesDueDate && matchesSearch;
      const hasMatchingSubtasks = filteredSubtasks.length > 0;
      
      // Include this task if it matches filters or has matching subtasks
      if (matchesFilters || hasMatchingSubtasks) {
        return {
          ...task,
          subtasks: filteredSubtasks
        };
      }
      
      // Return null for non-matching tasks (we'll filter these out)
      return null;
    }).filter(Boolean) as Task[]; // Remove null values
  };
  
  // Sort tasks based on sort criteria
  const getSortedTasks = (taskList: Task[]): Task[] => {
    if (sortBy === 'none') return taskList;
    
    const sortedTasks = [...taskList].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'priority':
          const priorityValues = { high: 3, medium: 2, low: 1, undefined: 0 };
          const aValue = priorityValues[a.priority as keyof typeof priorityValues] || 0;
          const bValue = priorityValues[b.priority as keyof typeof priorityValues] || 0;
          comparison = aValue - bValue;
          break;
          
        case 'dueDate':
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          comparison = aDate - bDate;
          break;
          
        case 'alphabetical':
          comparison = a.text.localeCompare(b.text);
          break;
      }
      
      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    // Sort subtasks recursively
    return sortedTasks.map(task => ({
      ...task,
      subtasks: task.subtasks && task.subtasks.length > 0
        ? getSortedTasks(task.subtasks)
        : []
    }));
  };
  
  // Apply filters and sorting
  const processedTasks = getSortedTasks(getFilteredTasks(tasks));
  
  // Handle keydown in the new task input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };
  
  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };
  
  // Apply a task template
  const handleApplyTemplate = (templateTasks: Task[]) => {
    onTasksChange([...tasks, ...templateTasks]);
    setShowTemplates(false);
  };
  
  return (
    <div className={`task-list ${viewMode} ${className}`}>
      {showHeader && (
        <div className="task-list-header">
          {showAddButton && (
            <div className="task-input-container">
              <input
                ref={newTaskInputRef}
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a new task..."
                disabled={readOnly}
                className="task-input"
              />
              <button 
                onClick={addTask}
                disabled={!newTaskText.trim() || readOnly}
                className="add-task-button"
              >
                <Plus size={16} />
                Add
              </button>
              <button 
                onClick={() => setShowTemplates(true)}
                disabled={readOnly}
                className="template-button"
                title="Use a task template"
              >
                <FileText size={16} />
              </button>
            </div>
          )}
          
          {showFilters && (
            <div className="task-filters">
              <div className="search-container">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search tasks..."
                  className="search-input"
                />
                {searchTerm && (
                  <button 
                    className="clear-search"
                    onClick={() => setSearchTerm('')}
                  >
                    <X size={14} />
                  </button>
                )}
                <Search size={14} className="search-icon" />
              </div>
              
              <div className="filter-controls">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
                
                <select 
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
                
                <select 
                  value={filterDueDate}
                  onChange={(e) => setFilterDueDate(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="all">All Dates</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Today</option>
                  <option value="upcoming">Next 7 Days</option>
                  <option value="future">Future</option>
                </select>
                
                <div className="sort-controls">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="filter-select"
                  >
                    <option value="none">Sort By</option>
                    <option value="priority">Priority</option>
                    <option value="dueDate">Due Date</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                  
                  {sortBy !== 'none' && (
                    <button 
                      onClick={toggleSortDirection}
                      className="sort-direction-button"
                    >
                      {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    </button>
                  )}
                </div>
                
                {(filterStatus !== 'all' || filterPriority !== 'all' || filterDueDate !== 'all' || searchTerm) && (
                  <button 
                    className="clear-filters-button"
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterPriority('all');
                      setFilterDueDate('all');
                      setSearchTerm('');
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              
              <div className="view-mode-controls">
                <button
                  className={`view-mode-button ${viewMode === 'default' ? 'active' : ''}`}
                  onClick={() => onTasksChange([...tasks])} // Trigger update without changing mode
                  title="Default View"
                >
                  <List size={16} />
                </button>
                <button
                  className={`view-mode-button ${viewMode === 'compact' ? 'active' : ''}`}
                  onClick={() => onTasksChange([...tasks])} // Trigger update without changing mode
                  title="Compact View"
                >
                  <List size={16} />
                </button>
                <button
                  className={`view-mode-button ${viewMode === 'kanban' ? 'active' : ''}`}
                  onClick={() => onTasksChange([...tasks])} // Trigger update without changing mode
                  title="Kanban View"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="task-list-content">
        {processedTasks.length === 0 ? (
          <div className="empty-task-list">
            <p>No tasks to display</p>
            {(filterStatus !== 'all' || filterPriority !== 'all' || filterDueDate !== 'all' || searchTerm) && (
              <p>Try adjusting your filters or search term</p>
            )}
          </div>
        ) : (
          processedTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onAddSubtask={addSubtask}
              theme={viewMode}
              isDraggable={!readOnly}
            />
          ))
        )}
      </div>
      
      {showTemplates && (
        <TaskTemplates
          onApplyTemplate={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}; 