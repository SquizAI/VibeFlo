import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { Eye, EyeOff, Filter, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/noteSidebar.css';

interface NoteSidebarProps {
  notes: Note[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onSelectNote: (id: string) => void;
  onFocusNote: (id: string) => void;
}

export const NoteSidebar: React.FC<NoteSidebarProps> = ({
  notes,
  isOpen,
  onClose,
  onUpdateNote,
  onSelectNote,
  onFocusNote
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterColor, setFilterColor] = useState<string>('all');
  
  // Group notes by type for organization
  const notesByType: Record<string, Note[]> = {
    sticky: [],
    task: [],
    other: [],
  };
  
  // Filter and categorize notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (note.type && note.type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || note.type === filterType;
    
    const matchesColor = filterColor === 'all' || note.color === filterColor;
    
    return matchesSearch && matchesType && matchesColor;
  });
  
  // Organize notes by type
  filteredNotes.forEach(note => {
    if (note.type === 'sticky') {
      notesByType.sticky.push(note);
    } else if (note.type === 'task') {
      notesByType.task.push(note);
    } else {
      notesByType.other.push(note);
    }
  });
  
  // Toggle note visibility
  const toggleNoteVisibility = (noteId: string, isHidden: boolean) => {
    onUpdateNote(noteId, { isHidden });
  };
  
  // Calculate task completion percentage for task notes
  const getTaskCompletionPercentage = (note: Note) => {
    if (note.type !== 'task' || !note.tasks || note.tasks.length === 0) {
      return 0;
    }
    
    const completedTasks = note.tasks.filter(task => task.done).length;
    return Math.round((completedTasks / note.tasks.length) * 100);
  };
  
  const handleNoteClick = (note: Note) => {
    onSelectNote(note.id);
  };
  
  const handleNoteFocus = (note: Note) => {
    onFocusNote(note.id);
  };
  
  // Get color name from color code or use the color directly
  const getColorName = (color: string) => {
    if (color.startsWith('#')) {
      return color;
    }
    return color;
  };

  return (
    <div className={`note-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="note-sidebar-header">
        <h2>Notes Explorer</h2>
        <button className="note-sidebar-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      
      <div className="note-sidebar-search">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="note-sidebar-filters">
        <div className="filter-group">
          <label>Type:</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="sticky">Sticky Notes</option>
            <option value="task">Task Lists</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Color:</label>
          <select 
            value={filterColor} 
            onChange={(e) => setFilterColor(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Colors</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="pink">Pink</option>
            <option value="yellow">Yellow</option>
            <option value="purple">Purple</option>
          </select>
        </div>
      </div>
      
      <div className="note-sidebar-content">
        {filteredNotes.length === 0 ? (
          <div className="no-notes-found">
            <p>No notes found matching your search criteria.</p>
          </div>
        ) : (
          <>
            {notesByType.sticky.length > 0 && (
              <div className="note-section">
                <h3>Sticky Notes ({notesByType.sticky.length})</h3>
                {notesByType.sticky.map(note => (
                  <div 
                    key={note.id} 
                    className={`note-item ${note.isHidden ? 'hidden' : ''}`}
                    onClick={() => handleNoteClick(note)}
                    onDoubleClick={() => handleNoteFocus(note)}
                  >
                    <div className={`note-color-indicator ${getColorName(note.color)}`}></div>
                    <div className="note-item-content">
                      <div className="note-item-text">
                        {note.content.substring(0, 50)}{note.content.length > 50 ? '...' : ''}
                      </div>
                    </div>
                    <button 
                      className="note-visibility-toggle" 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNoteVisibility(note.id, !note.isHidden);
                      }}
                      title={note.isHidden ? "Show note" : "Hide note"}
                    >
                      {note.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {notesByType.task.length > 0 && (
              <div className="note-section">
                <h3>Task Lists ({notesByType.task.length})</h3>
                {notesByType.task.map(note => (
                  <div 
                    key={note.id} 
                    className={`note-item ${note.isHidden ? 'hidden' : ''}`}
                    onClick={() => handleNoteClick(note)}
                    onDoubleClick={() => handleNoteFocus(note)}
                  >
                    <div className={`note-color-indicator ${getColorName(note.color)}`}></div>
                    <div className="note-item-content">
                      <div className="note-item-text">
                        {note.content.substring(0, 50)}{note.content.length > 50 ? '...' : ''}
                      </div>
                      {note.tasks && note.tasks.length > 0 && (
                        <div className="task-completion">
                          <div className="task-progress-bar">
                            <div 
                              className="task-progress-fill" 
                              style={{width: `${getTaskCompletionPercentage(note)}%`}}
                            ></div>
                          </div>
                          <span className="task-completion-text">
                            {note.tasks.filter(task => task.done).length}/{note.tasks.length} tasks
                          </span>
                        </div>
                      )}
                    </div>
                    <button 
                      className="note-visibility-toggle" 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNoteVisibility(note.id, !note.isHidden);
                      }}
                      title={note.isHidden ? "Show note" : "Hide note"}
                    >
                      {note.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {notesByType.other.length > 0 && (
              <div className="note-section">
                <h3>Other Notes ({notesByType.other.length})</h3>
                {notesByType.other.map(note => (
                  <div 
                    key={note.id} 
                    className={`note-item ${note.isHidden ? 'hidden' : ''}`}
                    onClick={() => handleNoteClick(note)}
                    onDoubleClick={() => handleNoteFocus(note)}
                  >
                    <div className={`note-color-indicator ${getColorName(note.color)}`}></div>
                    <div className="note-item-content">
                      <div className="note-item-text">
                        {note.content.substring(0, 50)}{note.content.length > 50 ? '...' : ''}
                      </div>
                    </div>
                    <button 
                      className="note-visibility-toggle" 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNoteVisibility(note.id, !note.isHidden);
                      }}
                      title={note.isHidden ? "Show note" : "Hide note"}
                    >
                      {note.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Collapsed toggle button that appears when sidebar is closed */}
      {!isOpen && (
        <button className="note-sidebar-toggle" onClick={onClose}>
          <ChevronRight size={20} />
          <span>Notes</span>
        </button>
      )}
    </div>
  );
};

export default NoteSidebar; 