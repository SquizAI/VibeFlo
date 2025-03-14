import React, { useState, useEffect } from 'react';
import { Note as NoteType, Label, Task } from '../types';
import { useNoteStore } from '../store/noteStore';
import FolderNavigation, { Folder } from './FolderNavigation';
import EnhancedSearch from './EnhancedSearch';
import SecureNote from './SecureNote';
import { 
  Calendar, Star, Flag, User, Bell, CheckSquare, Tag, 
  Edit, Trash2, Lock, Pin, Heart, Plus, ChevronDown, ChevronRight, X 
} from 'lucide-react';

interface NoteViewProps {
  onSwitchToCanvas: () => void;
}

export const NoteView: React.FC<NoteViewProps> = ({ onSwitchToCanvas }) => {
  const { notes, addNote, deleteNote, updateNote, completeNote, setDueDate, setPriority, setAssignee } = useNoteStore();
  
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'all', name: 'All Notes', parentId: null },
    { id: 'recent', name: 'Recent', parentId: null },
    { id: 'favorites', name: 'Favorites', parentId: null, isSmartFolder: true, filter: { type: 'favorite' } },
    { id: 'secure', name: 'Secure Notes', parentId: null, isSmartFolder: true, filter: { type: 'secure' } },
    { id: 'tasks', name: 'Tasks', parentId: null }
  ]);
  
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [filteredNotes, setFilteredNotes] = useState<NoteType[]>(notes);
  const [notesInView, setNotesInView] = useState<NoteType[]>([]);
  
  // Filter notes based on selected folder
  useEffect(() => {
    let filtered: NoteType[] = [];
    
    const folder = folders.find(f => f.id === selectedFolder);
    if (!folder) {
      setNotesInView(notes);
      return;
    }
    
    if (folder.id === 'all') {
      filtered = [...notes];
    } else if (folder.id === 'recent') {
      // Sort by most recently updated and take the top 10
      filtered = [...notes].sort((a, b) => {
        // Assuming notes have a lastUpdated property, or using ID as a fallback
        return Number(b.id) - Number(a.id);
      }).slice(0, 10);
    } else if (folder.isSmartFolder && folder.filter) {
      // Apply smart folder filter
      switch (folder.filter.type) {
        case 'favorite':
          filtered = notes.filter(note => note.labels?.some(label => label.name === 'Favorite'));
          break;
        case 'secure':
          filtered = notes.filter(note => 
            note.content && 
            typeof note.content === 'string' && 
            note.content.startsWith('encrypted:')
          );
          break;
        case 'tag':
          filtered = notes.filter(note => 
            note.labels?.some(label => label.name === folder.filter?.value)
          );
          break;
        case 'priority':
          filtered = notes.filter(note => note.priority === folder.filter?.value);
          break;
        case 'date':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filtered = notes.filter(note => {
            if (!note.dueDate) return false;
            const dueDate = new Date(note.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          });
          break;
      }
    } else if (folder.id === 'tasks') {
      // Show only task-type notes or notes with tasks
      filtered = notes.filter(note => 
        note.type === 'task' || (note.tasks && note.tasks.length > 0)
      );
    } else {
      // Regular folder - match by tag/label with folder name
      filtered = notes.filter(note => 
        note.labels?.some(label => label.name === folder.name)
      );
    }
    
    setNotesInView(filtered);
  }, [selectedFolder, notes, folders]);
  
  // Handle folder creation
  const handleFolderCreate = (folder: Folder) => {
    setFolders([...folders, folder]);
  };
  
  // Handle folder update
  const handleFolderUpdate = (folderId: string, updates: Partial<Folder>) => {
    setFolders(folders.map(folder => 
      folder.id === folderId ? { ...folder, ...updates } : folder
    ));
  };
  
  // Handle folder deletion
  const handleFolderDelete = (folderId: string) => {
    setFolders(folders.filter(folder => folder.id !== folderId));
    
    // If the deleted folder was selected, select 'All Notes'
    if (selectedFolder === folderId) {
      setSelectedFolder('all');
    }
  };
  
  // Handle note selection
  const handleNoteSelect = (noteId: string) => {
    setSelectedNote(noteId);
  };
  
  // Handle new note creation
  const handleCreateNote = () => {
    const newNote: NoteType = {
      id: crypto.randomUUID(),
      type: 'sticky',
      content: '',
      position: { x: 0, y: 0 },
      color: 'blue',
      labels: []
    };
    
    // Add folder as label if not 'all', 'recent', 'favorites', 'secure', or 'tasks'
    if (!['all', 'recent', 'favorites', 'secure', 'tasks'].includes(selectedFolder)) {
      const folder = folders.find(f => f.id === selectedFolder);
      if (folder) {
        newNote.labels = [
          {
            id: crypto.randomUUID(),
            name: folder.name,
            color: '#3b82f6' // Default blue color
          }
        ];
      }
    }
    
    addNote(newNote);
    setSelectedNote(newNote.id);
  };
  
  // Handle note deletion
  const handleDeleteNote = () => {
    if (selectedNote) {
      deleteNote(selectedNote);
      setSelectedNote(null);
    }
  };
  
  // Handle note content update
  const handleContentChange = (id: string, content: string, isEncrypted?: boolean) => {
    updateNote(id, { content });
    
    // If it's a secure note, add it to the secure notes folder via a label
    if (isEncrypted) {
      const note = notes.find(n => n.id === id);
      if (note) {
        const secureLabel = note.labels?.find(l => l.name === 'Secure');
        if (!secureLabel) {
          const updatedLabels = [
            ...(note.labels || []),
            {
              id: crypto.randomUUID(),
              name: 'Secure',
              color: '#ef4444' // Red color for secure notes
            }
          ];
          updateNote(id, { labels: updatedLabels });
        }
      }
    }
  };
  
  // Handle adding a task to a note
  const handleAddTask = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: 'New task',
      done: false,
    };
    
    const updatedTasks = [...(note.tasks || []), newTask];
    updateNote(noteId, { tasks: updatedTasks, type: 'task' });
  };
  
  // Handle toggling task completion
  const handleToggleTask = (noteId: string, taskId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.tasks) return;
    
    const updatedTasks = note.tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, done: !task.done };
      }
      return task;
    });
    
    updateNote(noteId, { tasks: updatedTasks });
  };
  
  // Handle adding a label/tag to a note
  const handleAddLabel = (noteId: string, labelName: string, color: string = '#3b82f6') => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Check if label already exists
    if (note.labels?.some(l => l.name === labelName)) return;
    
    const newLabel: Label = {
      id: crypto.randomUUID(),
      name: labelName,
      color
    };
    
    const updatedLabels = [...(note.labels || []), newLabel];
    updateNote(noteId, { labels: updatedLabels });
  };
  
  // Handle removing a label from a note
  const handleRemoveLabel = (noteId: string, labelId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.labels) return;
    
    const updatedLabels = note.labels.filter(label => label.id !== labelId);
    updateNote(noteId, { labels: updatedLabels });
  };
  
  // Toggle favorite status of a note
  const handleToggleFavorite = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const favoriteLabel = note.labels?.find(l => l.name === 'Favorite');
    
    if (favoriteLabel) {
      // Remove favorite label
      handleRemoveLabel(noteId, favoriteLabel.id);
    } else {
      // Add favorite label
      handleAddLabel(noteId, 'Favorite', '#eab308'); // Yellow color for favorites
    }
  };
  
  // Render note list based on folder selection and search
  const renderNotesList = () => {
    return (
      <div className="notes-list">
        {notesInView.length === 0 ? (
          <div className="no-notes-message">
            No notes found
          </div>
        ) : (
          notesInView.map(note => {
            const isSelected = selectedNote === note.id;
            const isFavorite = note.labels?.some(l => l.name === 'Favorite');
            
            return (
              <div 
                key={note.id} 
                className={`note-list-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleNoteSelect(note.id)}
              >
                <div 
                  className="note-color-indicator" 
                  style={{ backgroundColor: note.color }}
                />
                
                <div className="note-details">
                  <div className="note-title">
                    {note.content && typeof note.content === 'string' ? 
                      note.content.split('\n')[0].substring(0, 40) || 'Untitled' : 
                      'Untitled'
                    }
                  </div>
                  
                  <div className="note-metadata">
                    {note.dueDate && (
                      <span className="note-due-date">
                        <Calendar size={12} />
                        {new Date(note.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    
                    {note.tasks && note.tasks.length > 0 && (
                      <span className="note-tasks-count">
                        <CheckSquare size={12} />
                        {note.tasks.filter(t => t.done).length}/{note.tasks.length}
                      </span>
                    )}
                    
                    {note.content && 
                     typeof note.content === 'string' && 
                     note.content.startsWith('encrypted:') && (
                      <span className="note-lock-icon"><Lock size={12} /></span>
                    )}
                  </div>
                </div>
                
                {isFavorite && (
                  <div className="note-favorite">
                    <Star size={16} fill="#eab308" stroke="#eab308" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };
  
  // Render the details of the selected note
  const renderNoteDetail = () => {
    if (!selectedNote) {
      return (
        <div className="no-note-selected">
          <p>Select a note to view details</p>
          <button className="new-note-button" onClick={handleCreateNote}>
            Create a new note
          </button>
        </div>
      );
    }
    
    const note = notes.find(n => n.id === selectedNote);
    if (!note) return null;
    
    const isFavorite = note.labels?.some(l => l.name === 'Favorite');
    
    return (
      <div className="note-detail">
        <div className="note-detail-header">
          <div className="note-actions">
            <button 
              className={`action-button favorite-button ${isFavorite ? 'active' : ''}`}
              onClick={() => handleToggleFavorite(note.id)}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={16} />
            </button>
            
            <button 
              className="action-button delete-button"
              onClick={handleDeleteNote}
              title="Delete note"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="note-metadata-actions">
            <div className="metadata-group">
              <button 
                className="metadata-button"
                onClick={() => {
                  // Show date picker
                  const date = prompt('Enter due date (YYYY-MM-DD):', note.dueDate || '');
                  if (date) setDueDate(note.id, date);
                }}
              >
                <Calendar size={16} />
                {note.dueDate ? new Date(note.dueDate).toLocaleDateString() : 'Add date'}
              </button>
              
              <div className="priority-selector">
                <button 
                  className="metadata-button"
                  onClick={() => {
                    // Toggle between priorities
                    const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
                    const currentIndex = note.priority ? priorities.indexOf(note.priority) : -1;
                    const nextIndex = (currentIndex + 1) % priorities.length;
                    setPriority(note.id, priorities[nextIndex]);
                  }}
                >
                  <Flag size={16} />
                  {note.priority || 'Priority'}
                </button>
              </div>
              
              <button 
                className="metadata-button"
                onClick={() => {
                  const assignee = prompt('Assign to:', note.assignee || '');
                  if (assignee) setAssignee(note.id, assignee);
                }}
              >
                <User size={16} />
                {note.assignee || 'Assign'}
              </button>
            </div>
            
            <div className="tags-group">
              {note.labels && note.labels
                .filter(label => label.name !== 'Favorite' && label.name !== 'Secure')
                .map(label => (
                  <span 
                    key={label.id} 
                    className="note-tag"
                    style={{ backgroundColor: label.color + '20', color: label.color }}
                  >
                    {label.name}
                    <button 
                      className="remove-tag"
                      onClick={() => handleRemoveLabel(note.id, label.id)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              }
              
              <button 
                className="add-tag-button"
                onClick={() => {
                  const tagName = prompt('Enter tag name:');
                  if (tagName) handleAddLabel(note.id, tagName);
                }}
              >
                <Tag size={14} /> Add Tag
              </button>
            </div>
          </div>
        </div>
        
        <div className="note-content">
          {note.content && 
           typeof note.content === 'string' && 
           note.content.startsWith('encrypted:') ? (
            <SecureNote 
              note={note} 
              onContentChange={handleContentChange} 
            />
          ) : (
            <textarea
              value={note.content || ''}
              onChange={(e) => handleContentChange(note.id, e.target.value)}
              placeholder="Type your note here..."
              className="note-textarea"
            />
          )}
        </div>
        
        <div className="note-tasks">
          <div className="tasks-header">
            <h3>Tasks</h3>
            <button 
              className="add-task-button"
              onClick={() => handleAddTask(note.id)}
            >
              <Plus size={14} /> Add Task
            </button>
          </div>
          
          {note.tasks && note.tasks.length > 0 ? (
            <div className="tasks-list">
              {note.tasks.map(task => (
                <div key={task.id} className="task-item">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => handleToggleTask(note.id, task.id)}
                    className="task-checkbox"
                  />
                  <span className={`task-text ${task.done ? 'completed' : ''}`}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-tasks">
              No tasks yet. Click "Add Task" to create one.
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="note-view">
      <div className="note-view-header">
        <h1>VibeFlo Notes</h1>
        <button 
          className="switch-view-button"
          onClick={onSwitchToCanvas}
        >
          Switch to Canvas
        </button>
      </div>
      
      <div className="note-view-container">
        <div className="folder-sidebar">
          <FolderNavigation
            folders={folders}
            notes={notes}
            selectedFolder={selectedFolder}
            onFolderSelect={setSelectedFolder}
            onFolderCreate={handleFolderCreate}
            onFolderUpdate={handleFolderUpdate}
            onFolderDelete={handleFolderDelete}
          />
        </div>
        
        <div className="notes-panel">
          <div className="notes-panel-header">
            <EnhancedSearch
              notes={notes}
              onSearchResult={setNotesInView}
              onNoteSelect={handleNoteSelect}
            />
            
            <button 
              className="new-note-button"
              onClick={handleCreateNote}
            >
              <Plus size={16} /> New Note
            </button>
          </div>
          
          {renderNotesList()}
        </div>
        
        <div className="note-detail-panel">
          {renderNoteDetail()}
        </div>
      </div>
    </div>
  );
};

export default NoteView; 