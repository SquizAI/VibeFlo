import React, { useState, useEffect, useCallback } from 'react';
import { Note, Task } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Check, 
  Filter, 
  Calendar, 
  Tag, 
  Search, 
  X, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Add type for task filters
interface TaskFilters {
  status: 'all' | 'done' | 'pending';
  category: string | null;
  dueDate: 'all' | 'today' | 'week' | 'overdue' | 'none';
}

// Add bulk action interface
interface BulkAction {
  name: string;
  icon: React.ReactNode;
  handler: (noteIds: string[]) => void;
}

// Update SidePanel props
interface SidePanelProps {
  notes: Note[];
  toggleNoteVisibility: (id: string) => void;
  hiddenNotes: string[];
  openNote: (id: string) => void;
  updateNoteContent: (id: string, content: string) => void;
  updateTask: (noteId: string, taskId: string, updates: Partial<Task>) => void;
  deleteNote: (id: string) => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ 
  notes, 
  toggleNoteVisibility, 
  hiddenNotes, 
  openNote,
  updateNoteContent,
  updateTask,
  deleteNote
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'category' | 'completion'>('title');
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  
  // Add new state for task view
  const [selectedTab, setSelectedTab] = useState<'notes' | 'tasks'>('notes');
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({
    status: 'all',
    category: null,
    dueDate: 'all'
  });
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [allTasksByNote, setAllTasksByNote] = useState<{ [noteId: string]: Task[] }>({});
  
  // Calculate completion percentage for a note
  const calculateCompletion = (note: Note): number => {
    if (!note.tasks || note.tasks.length === 0) return 0;
    
    const completedTasks = note.tasks.filter(task => task.done).length;
    return Math.round((completedTasks / note.tasks.length) * 100);
  };
  
  // Group notes by category (if any)
  const getNoteCategories = (): { [key: string]: Note[] } => {
    const categories: { [key: string]: Note[] } = {};
    
    filteredNotes.forEach(note => {
      // Get the primary category (if tasks exist)
      let category = 'Uncategorized';
      
      if (note.tasks && note.tasks.length > 0) {
        // Count occurrences of each category
        const categoryCounts: { [key: string]: number } = {};
        note.tasks.forEach((task: Task) => {
          if (task.category) {
            categoryCounts[task.category] = (categoryCounts[task.category] || 0) + 1;
          }
        });
        
        // Find the most common category
        let maxCount = 0;
        Object.entries(categoryCounts).forEach(([cat, count]) => {
          if (count > maxCount) {
            maxCount = count;
            category = cat;
          }
        });
      }
      
      // Add note to its category
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(note);
    });
    
    return categories;
  };
  
  // Toggle category expansion
  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };
  
  // Toggle note selection for bulk actions
  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };
  
  // Select/deselect all visible notes
  const toggleSelectAll = () => {
    if (selectedNotes.length === filteredNotes.length) {
      setSelectedNotes([]);
    } else {
      setSelectedNotes(filteredNotes.map(note => note.id));
    }
  };
  
  // Define bulk actions
  const bulkActions: BulkAction[] = [
    {
      name: 'Hide Selected',
      icon: <X size={14} />,
      handler: (noteIds) => {
        noteIds.forEach(id => toggleNoteVisibility(id));
        setSelectedNotes([]);
      }
    },
    {
      name: 'Delete Selected',
      icon: <X size={14} />,
      handler: (noteIds) => {
        if (window.confirm(`Delete ${noteIds.length} selected note(s)?`)) {
          noteIds.forEach(id => deleteNote(id));
          setSelectedNotes([]);
        }
      }
    }
  ];
  
  // Extract all tasks from all notes
  useEffect(() => {
    const taskMap: { [noteId: string]: Task[] } = {};
    
    notes.forEach(note => {
      if (note.tasks && note.tasks.length > 0) {
        taskMap[note.id] = note.tasks;
      }
    });
    
    setAllTasksByNote(taskMap);
  }, [notes]);
  
  // Filter and sort notes when filters change
  useEffect(() => {
    let filtered = [...notes];
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(note => {
        // Search in title
        if (note.content.toLowerCase().includes(lowerSearchTerm)) return true;
        
        // Search in tasks
        if (note.tasks) {
          return note.tasks.some((task: Task) => 
            task.text.toLowerCase().includes(lowerSearchTerm) || 
            (task.category && task.category.toLowerCase().includes(lowerSearchTerm))
          );
        }
        
        return false;
      });
    }
    
    // Apply sorting
    switch(sortBy) {
      case 'title':
        filtered.sort((a, b) => a.content.localeCompare(b.content));
        break;
      case 'category':
        filtered.sort((a, b) => {
          const catA = a.tasks && a.tasks[0]?.category || '';
          const catB = b.tasks && b.tasks[0]?.category || '';
          return catA.localeCompare(catB);
        });
        break;
      case 'completion':
        filtered.sort((a, b) => calculateCompletion(b) - calculateCompletion(a));
        break;
    }
    
    // Apply category filter if in task view
    if (selectedTab === 'tasks' && taskFilters.category) {
      filtered = filtered.filter(note => 
        note.tasks?.some(task => task.category === taskFilters.category)
      );
    }
    
    // Apply task status filter if in task view
    if (selectedTab === 'tasks' && taskFilters.status !== 'all') {
      filtered = filtered.filter(note => 
        note.tasks?.some(task => 
          taskFilters.status === 'done' ? task.done : !task.done
        )
      );
    }
    
    // Apply task search if in task view
    if (selectedTab === 'tasks' && taskSearchTerm) {
      const lowerTaskSearch = taskSearchTerm.toLowerCase();
      filtered = filtered.filter(note => 
        note.tasks?.some(task => 
          task.text.toLowerCase().includes(lowerTaskSearch)
        )
      );
    }
    
    setFilteredNotes(filtered);
  }, [notes, searchTerm, sortBy, selectedTab, taskFilters, taskSearchTerm]);
  
  // Get all available categories from tasks
  const getAllCategories = useCallback(() => {
    const categories = new Set<string>();
    
    notes.forEach(note => {
      if (note.tasks) {
        note.tasks.forEach(task => {
          if (task.category) {
            categories.add(task.category);
          }
        });
      }
    });
    
    return Array.from(categories).sort();
  }, [notes]);
  
  // Render the tasks tab content
  const renderTasksTab = () => {
    const categories = getAllCategories();
    const hasTaskFilters = taskFilters.status !== 'all' || 
                          taskFilters.category !== null || 
                          taskFilters.dueDate !== 'all' ||
                          taskSearchTerm !== '';
    
    return (
      <div className="tasks-tab">
        <div className="task-filters">
          <div className="task-search">
            <Search size={14} className="search-icon" />
            <input 
              type="text"
              placeholder="Search tasks..."
              value={taskSearchTerm}
              onChange={(e) => setTaskSearchTerm(e.target.value)}
              className="task-search-input"
            />
            {taskSearchTerm && (
              <button 
                className="clear-search"
                onClick={() => setTaskSearchTerm('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
          
          <div className="filter-dropdown">
            <button className="filter-dropdown-trigger">
              <Filter size={14} />
              <span>Status: {taskFilters.status}</span>
            </button>
            <div className="filter-dropdown-content">
              <button 
                className={`filter-option ${taskFilters.status === 'all' ? 'active' : ''}`}
                onClick={() => setTaskFilters(prev => ({ ...prev, status: 'all' }))}
              >
                All
              </button>
              <button 
                className={`filter-option ${taskFilters.status === 'done' ? 'active' : ''}`}
                onClick={() => setTaskFilters(prev => ({ ...prev, status: 'done' }))}
              >
                Completed
              </button>
              <button 
                className={`filter-option ${taskFilters.status === 'pending' ? 'active' : ''}`}
                onClick={() => setTaskFilters(prev => ({ ...prev, status: 'pending' }))}
              >
                Pending
              </button>
            </div>
          </div>
          
          <div className="filter-dropdown">
            <button className="filter-dropdown-trigger">
              <Tag size={14} />
              <span>Category: {taskFilters.category || 'All'}</span>
            </button>
            <div className="filter-dropdown-content">
              <button 
                className={`filter-option ${taskFilters.category === null ? 'active' : ''}`}
                onClick={() => setTaskFilters(prev => ({ ...prev, category: null }))}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button 
                  key={category}
                  className={`filter-option ${taskFilters.category === category ? 'active' : ''}`}
                  onClick={() => setTaskFilters(prev => ({ ...prev, category: category }))}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          {hasTaskFilters && (
            <button 
              className="clear-filters"
              onClick={() => {
                setTaskFilters({
                  status: 'all',
                  category: null,
                  dueDate: 'all'
                });
                setTaskSearchTerm('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
        
        <div className="task-list-container">
          {categories.length > 0 ? (
            categories.map(category => {
              // Skip categories that don't match the filter
              if (taskFilters.category !== null && taskFilters.category !== category) {
                return null;
              }
              
              // Get all tasks with this category
              const tasksWithCategory: { 
                task: Task; 
                noteId: string;
                noteTitle: string;
              }[] = [];
              
              notes.forEach(note => {
                if (note.tasks) {
                  note.tasks.forEach(task => {
                    if (task.category === category) {
                      // Filter by status if needed
                      if (taskFilters.status === 'all' || 
                         (taskFilters.status === 'done' && task.done) ||
                         (taskFilters.status === 'pending' && !task.done)) {
                        // Filter by search term if needed
                        if (!taskSearchTerm || 
                            task.text.toLowerCase().includes(taskSearchTerm.toLowerCase())) {
                          tasksWithCategory.push({
                            task,
                            noteId: note.id,
                            noteTitle: note.content
                          });
                        }
                      }
                    }
                  });
                }
              });
              
              // Skip empty categories after filtering
              if (tasksWithCategory.length === 0) {
                return null;
              }
              
              const isExpanded = expandedCategories.includes(category);
              
              return (
                <div key={category} className="task-category">
                  <div 
                    className="task-category-header"
                    onClick={() => toggleCategoryExpansion(category)}
                  >
                    <h4>{category}</h4>
                    <span className="task-count">{tasksWithCategory.length} tasks</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  
                  {isExpanded && (
                    <div className="task-category-items">
                      {tasksWithCategory.map(({ task, noteId, noteTitle }) => (
                        <div key={task.id} className="task-item">
                          <div 
                            className="task-checkbox"
                            onClick={() => updateTask(noteId, task.id, { done: !task.done })}
                          >
                            {task.done ? <Check size={14} /> : <div className="checkbox" />}
                          </div>
                          
                          <div className="task-details">
                            <div className={`task-text ${task.done ? 'completed' : ''}`}>
                              {task.text}
                            </div>
                            <div className="task-source" onClick={() => openNote(noteId)}>
                              From: {truncateTitle(noteTitle, 20)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="no-tasks-message">
              No tasks match the current filters.
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Truncate long titles
  const truncateTitle = (title: string, maxLength = 30) => {
    return title.length > maxLength
      ? title.substring(0, maxLength) + '...'
      : title;
  };
  
  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <h3>Project Manager</h3>
        
        <Tabs 
          defaultValue="notes" 
          className="panel-tabs"
          onValueChange={(value) => setSelectedTab(value as 'notes' | 'tasks')}
        >
          <TabsList className="tabs-list">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="notes" className="tabs-content">
            <div className="side-panel-controls">
              <div className="search-filter-row">
                <div className="search-wrapper">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as 'title' | 'category' | 'completion')}
                  className="sort-select"
                >
                  <option value="title">Sort by Title</option>
                  <option value="category">Sort by Category</option>
                  <option value="completion">Sort by Completion</option>
                </select>
              </div>
              
              {filteredNotes.length > 0 && (
                <div className="bulk-actions">
                  <div className="select-all-row">
                    <label className="select-all-label">
                      <input 
                        type="checkbox" 
                        checked={selectedNotes.length === filteredNotes.length} 
                        onChange={toggleSelectAll}
                      />
                      <span>Select All ({filteredNotes.length})</span>
                    </label>
                    <span className="selected-count">
                      {selectedNotes.length} selected
                    </span>
                  </div>
                  
                  {selectedNotes.length > 0 && (
                    <div className="bulk-action-buttons">
                      {bulkActions.map((action, index) => (
                        <button 
                          key={index} 
                          className="bulk-action-button"
                          onClick={() => action.handler(selectedNotes)}
                        >
                          {action.icon}
                          <span>{action.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="side-panel-content">
              {sortBy === 'category' ? (
                // Group by category display
                Object.entries(getNoteCategories()).map(([category, categoryNotes]) => (
                  <div key={category} className="note-category">
                    <h4>{category}</h4>
                    {categoryNotes.map((note) => (
                      <NoteListItem 
                        key={note.id} 
                        note={note} 
                        isHidden={hiddenNotes.includes(note.id)}
                        toggleVisibility={toggleNoteVisibility}
                        openNote={openNote}
                        completion={calculateCompletion(note)}
                        isSelected={selectedNotes.includes(note.id)}
                        toggleSelection={toggleNoteSelection}
                      />
                    ))}
                  </div>
                ))
              ) : (
                // Flat list display
                filteredNotes.map((note) => (
                  <NoteListItem 
                    key={note.id} 
                    note={note} 
                    isHidden={hiddenNotes.includes(note.id)}
                    toggleVisibility={toggleNoteVisibility}
                    openNote={openNote}
                    completion={calculateCompletion(note)}
                    isSelected={selectedNotes.includes(note.id)}
                    toggleSelection={toggleNoteSelection}
                  />
                ))
              )}
              
              {filteredNotes.length === 0 && (
                <div className="no-notes-message">
                  {searchTerm ? 'No notes match your search.' : 'No notes available.'}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="tasks" className="tabs-content">
            {renderTasksTab()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Update the NoteListItem component props
interface NoteListItemProps {
  note: Note;
  isHidden: boolean;
  toggleVisibility: (id: string) => void;
  openNote: (id: string) => void;
  completion: number;
  isSelected: boolean;
  toggleSelection: (id: string) => void;
}

const NoteListItem: React.FC<NoteListItemProps> = ({ 
  note, 
  isHidden, 
  toggleVisibility, 
  openNote,
  completion,
  isSelected,
  toggleSelection
}) => {
  // Truncate long titles
  const truncateTitle = (title: string, maxLength = 30) => {
    return title.length > maxLength
      ? title.substring(0, maxLength) + '...'
      : title;
  };
  
  return (
    <div className={`note-list-item ${isHidden ? 'note-hidden' : ''} ${isSelected ? 'selected' : ''}`}>
      <div className="note-list-checkbox">
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => toggleSelection(note.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      <div 
        className="note-list-color-indicator" 
        style={{ backgroundColor: note.color }}
      />
      
      <div className="note-list-details" onClick={() => openNote(note.id)}>
        <div className="note-list-title">{truncateTitle(note.content)}</div>
        
        <div className="note-list-meta">
          {note.tasks && note.tasks.length > 0 && (
            <span className="note-list-tasks-count">
              {note.tasks.filter((t: Task) => t.done).length}/{note.tasks.length} tasks
            </span>
          )}
          
          <div className="note-completion">
            <div className="completion-bar-container">
              <div 
                className="completion-bar-fill" 
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="completion-percentage">{completion}%</span>
          </div>
        </div>
      </div>
      
      <button 
        className="visibility-toggle"
        onClick={(e) => {
          e.stopPropagation();
          toggleVisibility(note.id);
        }}
        title={isHidden ? "Show note" : "Hide note"}
      >
        {isHidden ? 
          <span className="visibility-icon">👁️‍🗨️</span> : 
          <span className="visibility-icon">👁️</span>
        }
      </button>
    </div>
  );
};

export default SidePanel; 