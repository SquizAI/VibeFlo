import React, { useState, useRef, useEffect } from 'react';
import { Note as NoteType, NoteProps, PriorityLevel } from '../../types';
import NoteContent from './NoteContent';
import NoteTaskList from './NoteTaskList';
import { useNoteInteractions } from './hooks/useNoteInteractions';
import { Maximize2, Trash2, PenSquare, CheckCircle2, CircleDashed, Clock, ArrowUpRight, Pin, 
  CircleUser, MessageSquare, ListTodo, FileText, Code, Database, Terminal, GitBranch, File, PieChart, 
  Zap, Expand, Calendar, Flag, ChevronDown, ChevronUp, AlertTriangle, Users, Tag, MapPin, Paperclip, 
  Link, CalendarDays, ShoppingCart, Settings, Server 
} from 'lucide-react';
import NoteHeader from './NoteHeader';
import { useTaskOperations } from './hooks/useTaskOperations';
import { LinkPopup } from '../LinkPopup';

// Define priority options with colors and icons
const priorityOptions: {id: PriorityLevel, label: string, color: string, icon: JSX.Element}[] = [
  { id: 'low', label: 'Low', color: 'text-blue-400', icon: <Flag size={12} className="text-blue-400" /> },
  { id: 'medium', label: 'Medium', color: 'text-yellow-400', icon: <Flag size={12} className="text-yellow-400" /> },
  { id: 'high', label: 'High', color: 'text-red-400', icon: <Flag size={12} className="text-red-400" /> }
];

// Define note type icons
const noteTypeIcons: Record<string, { icon: JSX.Element, label: string, color: string }> = {
  'api': { 
    icon: <Server size={14} />, 
    label: 'API', 
    color: 'bg-purple-500/20 text-purple-400' 
  },
  'code': { 
    icon: <Code size={14} />, 
    label: 'Code', 
    color: 'bg-blue-500/20 text-blue-400' 
  },
  'database': { 
    icon: <Database size={14} />, 
    label: 'Database', 
    color: 'bg-green-500/20 text-green-400' 
  },
  'document': { 
    icon: <FileText size={14} />, 
    label: 'Document', 
    color: 'bg-indigo-500/20 text-indigo-400' 
  },
  'list': { 
    icon: <ShoppingCart size={14} />, 
    label: 'List', 
    color: 'bg-yellow-500/20 text-yellow-400' 
  },
  'terminal': { 
    icon: <Terminal size={14} />, 
    label: 'Terminal', 
    color: 'bg-gray-500/20 text-gray-400' 
  },
  'git': { 
    icon: <GitBranch size={14} />, 
    label: 'Git', 
    color: 'bg-orange-500/20 text-orange-400' 
  },
  'config': { 
    icon: <Settings size={14} />, 
    label: 'Config', 
    color: 'bg-teal-500/20 text-teal-400' 
  },
  'marketing': { 
    icon: <Zap size={14} />, 
    label: 'Marketing', 
    color: 'bg-pink-500/20 text-pink-400' 
  },
  'task': { 
    icon: <CheckCircle2 size={14} />, 
    label: 'Task', 
    color: 'bg-red-500/20 text-red-400' 
  },
  'sticky': { 
    icon: <FileText size={14} />, 
    label: 'Note', 
    color: 'bg-blue-500/20 text-blue-400' 
  }
};

export function Note({
  note,
  onMove,
  onContentChange,
  isSelectable = false,
  isSelected = false,
  onSelect,
  onUpdateNote,
  onDeleteNote
}: NoteProps) {
  // State
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [linkPopupOpen, setLinkPopupOpen] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  
  // Custom hooks
  const { addTask, updateTask, deleteTask } = useTaskOperations(note, onUpdateNote);
  const { handleMouseDown, handleDragStart, handleDragEnd } = useNoteInteractions(
    note, 
    nodeRef, 
    onMove, 
    setIsDragging
  );

  // Event handlers
  const handleContentChange = (content: string) => {
    if (onContentChange) {
      onContentChange(note.id, content);
    }
  };

  const handleColorChange = (color: string) => {
    if (onUpdateNote) {
      onUpdateNote(note.id, { color });
    }
    setShowColorPicker(false);
  };

  const handleDeleteNote = () => {
    if (onDeleteNote) {
      onDeleteNote(note.id);
    }
  };

  const handleSelectionClick = (e: React.MouseEvent) => {
    // Prevent propagation to avoid triggering other click handlers
    e.stopPropagation();
    if (onSelect) {
      onSelect(note.id);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const toggleMetadata = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMetadata(!showMetadata);
  };

  // Handle link insertion
  const handleInsertLink = (url: string, text: string) => {
    // Insert the link into the note content
    const linkMarkdown = text ? `[${text}](${url})` : url;
    const updatedContent = note.content 
      ? `${note.content}\n${linkMarkdown}` 
      : linkMarkdown;

    if (onContentChange) {
      onContentChange(note.id, updatedContent);
    }
  };

  // Priority handling
  const handleSetPriority = (priority: PriorityLevel) => {
    if (onUpdateNote) {
      onUpdateNote(note.id, { priority });
    }
    setShowPriorityMenu(false);
  };

  // Due date handling
  const handleSetDueDate = (date: string) => {
    if (onUpdateNote) {
      onUpdateNote(note.id, { dueDate: date });
    }
    setShowDatePicker(false);
  };

  // Handle changing note type
  const handleSetNoteType = (type: string) => {
    if (onUpdateNote) {
      onUpdateNote(note.id, { type: type as "api" | "code" | "database" | "document" | "list" | "terminal" | "git" | "config" | "marketing" | "task" | "sticky" | "project" | "recipe" });
    }
    setShowTypeMenu(false);
  };

  // Handle sending note to Kanban board
  const handleSendToKanban = (noteId: string, laneId: string) => {
    if (onUpdateNote) {
      onUpdateNote(noteId, { 
        laneId, 
        updatedAt: new Date().toISOString() 
      });
      // Show notification
      setNotificationMessage(`Note sent to ${getLaneName(laneId)}`);
      setShowNotification(true);
      
      // Hide notification after 2 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 2000);
    }
  };
  
  // Helper to get lane name from id
  const getLaneName = (laneId: string) => {
    const laneMap: Record<string, string> = {
      'backlog': 'Backlog',
      'todo': 'To Do',
      'inprogress': 'In Progress',
      'done': 'Done'
    };
    return laneMap[laneId] || 'Kanban';
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      // Close priority menu if open and clicked outside
      if (showPriorityMenu && 
          priorityMenuRef.current && 
          !priorityMenuRef.current.contains(event.target as Node)) {
        setShowPriorityMenu(false);
      }
      
      // Close date picker if open and clicked outside
      if (showDatePicker && 
          datePickerRef.current && 
          !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      
      // Close type menu if open and clicked outside
      if (showTypeMenu && 
          typeMenuRef.current && 
          !typeMenuRef.current.contains(event.target as Node)) {
        setShowTypeMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showPriorityMenu, showDatePicker, showTypeMenu]);

  // Check if the note has tasks, regardless of its type
  const hasTasks = note.tasks && note.tasks.length > 0;
  
  // Get completion status based on tasks
  const getCompletionStatus = () => {
    if (!hasTasks || !note.tasks) return 'No tasks';
    
    const totalTasks = note.tasks.length;
    const completedTasks = note.tasks.filter(task => task.done).length;
    
    return `${completedTasks}/${totalTasks} completed`;
  };
  
  // Format the creation date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get priority display information
  const getPriorityInfo = () => {
    const priorityInfo = priorityOptions.find(p => p.id === note.priority) || priorityOptions[0];
    return priorityInfo;
  };

  // Get note type information
  const getNoteTypeInfo = () => {
    return noteTypeIcons[note.type || 'sticky'] || noteTypeIcons['sticky'];
  };

  return (
    <div
      ref={nodeRef}
      className={`note note-wrapper ${note.color} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isExpanded ? 'expanded' : ''}`}
      style={{
        transform: `translate(${note.position.x}px, ${note.position.y}px)`,
        zIndex: isDragging ? 1000 : 1,
        width: isExpanded ? '350px' : 'auto',
        minHeight: isExpanded ? '300px' : 'auto'
      }}
      onMouseDown={handleMouseDown}
      onClick={isSelectable ? handleSelectionClick : undefined}
      data-note-id={note.id}
    >
      <NoteHeader
        note={note}
        showColorPicker={showColorPicker}
        setShowColorPicker={setShowColorPicker}
        onDeleteNote={handleDeleteNote}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onSendToKanban={handleSendToKanban}
      />
      
      {showColorPicker && (
        <div className="absolute right-0 top-8 z-10 p-2 rounded shadow-lg bg-white border border-gray-200">
          <div className="grid grid-cols-5 gap-1">
            {Object.entries({
              'red': 'bg-red-500',
              'blue': 'bg-blue-500',
              'green': 'bg-green-500',
              'yellow': 'bg-yellow-500',
              'purple': 'bg-purple-500'
            }).map(([color, colorClass]) => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full ${colorClass} ${
                  note.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                }`}
                onClick={() => handleColorChange(color)}
                title={color}
                aria-label={`Select ${color} color`}
              />
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <button 
              className="text-xs text-gray-500 hover:text-gray-700" 
              onClick={() => setShowColorPicker(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Note type indicator */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-light">
        <div 
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getNoteTypeInfo().color}`}
          onClick={() => setShowTypeMenu(!showTypeMenu)}
        >
          {getNoteTypeInfo().icon}
          <span>{getNoteTypeInfo().label}</span>
          <ChevronDown size={10} className="ml-1" />
        </div>
        
        {/* Type selector dropdown */}
        {showTypeMenu && (
          <div 
            ref={typeMenuRef}
            className="absolute left-3 mt-6 z-10 bg-card-bg border border-border-light rounded shadow-lg p-1 w-48"
          >
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(noteTypeIcons).map(([type, info]) => (
                <button
                  key={type}
                  className={`flex items-center gap-1.5 p-1.5 rounded text-xs hover:bg-white/10 ${note.type === type ? 'bg-white/5' : ''}`}
                  onClick={() => handleSetNoteType(type)}
                >
                  {info.icon}
                  <span>{info.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <button
            className="p-1 rounded hover:bg-white/10 text-text-secondary"
            onClick={() => setLinkPopupOpen(true)}
            aria-label="Add link"
          >
            <Link size={14} />
          </button>
          
          <button
            className="p-1 rounded hover:bg-white/10 text-text-secondary"
            onClick={toggleMetadata}
            aria-label={showMetadata ? "Hide metadata" : "Show metadata"}
          >
            {showMetadata ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          <button
            className="p-1 rounded hover:bg-white/10 text-text-secondary"
            onClick={toggleExpand}
            aria-label={isExpanded ? "Collapse note" : "Expand note"}
          >
            <Expand size={14} />
          </button>
        </div>
      </div>
      
      {/* Link popup for adding links */}
      <LinkPopup 
        isOpen={linkPopupOpen}
        onClose={() => setLinkPopupOpen(false)}
        onInsert={handleInsertLink}
      />
      
      {/* Show notification when note is added to Kanban */}
      {showNotification && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-accent-blue text-white px-3 py-1.5 rounded text-xs animate-fadeIn">
          {notificationMessage}
        </div>
      )}
      
      {/* Metadata section (hidden by default) */}
      {showMetadata && (
        <div className="metadata-section px-3 pb-2 pt-1 text-xs text-text-secondary border-b border-border-light">
          {/* Priority selector */}
          <div className="flex items-center gap-1 mb-2 relative">
            <button
              className="flex items-center gap-1 p-1 rounded hover:bg-white/10 w-full justify-between"
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
            >
              <div className="flex items-center gap-1">
                <Flag size={12} className={note.priority ? getPriorityInfo().color : ""} />
                <span>Priority: {note.priority ? getPriorityInfo().label : "Not set"}</span>
              </div>
              <ChevronDown size={10} />
            </button>
            
            {/* Priority dropdown menu */}
            {showPriorityMenu && (
              <div
                ref={priorityMenuRef}
                className="absolute top-full left-0 z-10 bg-card-bg border border-border-light rounded shadow-lg p-1 w-full mt-1"
              >
                {priorityOptions.map(option => (
                  <button
                    key={option.id}
                    className={`flex items-center gap-2 p-1.5 rounded w-full text-left hover:bg-white/10 ${note.priority === option.id ? 'bg-white/5' : ''}`}
                    onClick={() => handleSetPriority(option.id)}
                  >
                    {option.icon}
                    <span className={option.color}>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Due date selector */}
          <div className="flex items-center gap-1 mb-2 relative">
            <button
              className="flex items-center gap-1 p-1 rounded hover:bg-white/10 w-full justify-between"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <div className="flex items-center gap-1">
                <CalendarDays size={12} />
                <span>Due date: {note.dueDate ? formatDate(note.dueDate) : "Not set"}</span>
              </div>
              <ChevronDown size={10} />
            </button>
            
            {/* Date picker dropdown */}
            {showDatePicker && (
              <div
                ref={datePickerRef}
                className="absolute top-full left-0 z-10 bg-card-bg border border-border-light rounded shadow-lg p-2 w-full mt-1"
              >
                <input 
                  type="date" 
                  className="w-full p-1 bg-card-bg/80 border border-border-light rounded text-xs"
                  onChange={(e) => handleSetDueDate(e.target.value)}
                  value={note.dueDate || ''}
                />
                <div className="flex justify-between mt-2">
                  <button
                    className="text-xs px-2 py-1 rounded hover:bg-white/10"
                    onClick={() => handleSetDueDate('')}
                  >
                    Clear
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded bg-accent-blue/80 hover:bg-accent-blue"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {note.createdAt && (
            <div className="flex items-center gap-1 mb-1">
              <Calendar size={12} />
              <span>Created: {formatDate(note.createdAt)}</span>
            </div>
          )}
          
          {note.updatedAt && (
            <div className="flex items-center gap-1 mb-1">
              <Clock size={12} />
              <span>Updated: {formatDate(note.updatedAt)}</span>
            </div>
          )}
          
          {hasTasks && (
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 size={12} />
              <span>{getCompletionStatus()}</span>
            </div>
          )}
          
          {note.category && (
            <div className="flex items-center gap-1 mb-1">
              <Flag size={12} />
              <span>Category: {note.category}</span>
            </div>
          )}
          
          {note.sharedWith && note.sharedWith.length > 0 && (
            <div className="flex items-center gap-1 mb-1">
              <Users size={12} />
              <span>Shared with {note.sharedWith.length} {note.sharedWith.length === 1 ? 'person' : 'people'}</span>
            </div>
          )}
          
          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-1 mb-1">
              <Tag size={12} />
              <div className="flex flex-wrap gap-1">
                {note.tags.map((tag, index) => (
                  <span key={index} className="px-1.5 py-0.5 rounded bg-white/10">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {note.location && (
            <div className="flex items-center gap-1 mb-1">
              <MapPin size={12} />
              <span>{note.location}</span>
            </div>
          )}
          
          {note.attachments && note.attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip size={12} />
              <span>{note.attachments.length} attachment{note.attachments.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Main content area with title and content */}
      <NoteContent
        content={note.content}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onChange={handleContentChange}
      />
      
      {/* Display tasks if the note has them, regardless of note type */}
      {(note.type === 'task' || hasTasks) && (
        <div className="border-t border-border-light">
          <NoteTaskList
            tasks={note.tasks || []}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        </div>
      )}
    </div>
  );
}

export default Note; 