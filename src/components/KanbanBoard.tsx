import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  Plus, 
  MoreHorizontal, 
  X, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  MoveHorizontal,
  ArrowRight,
  Calendar,
  Flag,
  Palette,
  Search,
  SlidersHorizontal,
  Layout
} from 'lucide-react';
import { Note as NoteType, Task, PriorityLevel } from '../types';
import { useNoteStore } from '../store/noteStore';

// Define Kanban column/lane interface
interface KanbanLane {
  id: string;
  title: string;
  color: string;
  noteIds: string[];
}

// Item types for drag and drop
const ItemTypes = {
  CARD: 'card',
  COLUMN: 'column'
};

// Define props for KanbanBoard component
interface KanbanBoardProps {
  onOpenNote: (id: string) => void;
  onGoBackToCanvas: () => void;
  onAddToCanvas?: (noteId: string) => void;
}

// Define props for a draggable card component
interface KanbanCardProps {
  noteId: string;
  note: NoteType;
  laneId: string;
  index: number;
  onOpenNote: (id: string) => void;
  onMoveCard: (noteId: string, sourceLaneId: string, targetLaneId: string, index: number) => void;
  onAddToCanvas?: (noteId: string) => void;
}

// Define props for a Kanban lane/column
interface KanbanLaneProps {
  lane: KanbanLane;
  notes: NoteType[];
  index: number;
  onOpenNote: (id: string) => void;
  onAddNote: (laneId: string) => void;
  onMoveLane: (dragIndex: number, hoverIndex: number) => void;
  onEditLane: (laneId: string, title: string, color: string) => void;
  onDeleteLane: (laneId: string) => void;
  onMoveCard: (noteId: string, sourceLaneId: string, targetLaneId: string, index: number) => void;
  onAddToCanvas?: (noteId: string) => void;
}

// Draggable Card Component
const KanbanCard: React.FC<KanbanCardProps> = ({ 
  noteId, 
  note, 
  laneId, 
  index, 
  onOpenNote,
  onMoveCard,
  onAddToCanvas
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CARD,
    item: { noteId, laneId, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Calculate completion percentage for tasks
  const getCompletionPercentage = () => {
    if (!note.tasks || note.tasks.length === 0) return 0;
    
    const completedTasks = note.tasks.filter(task => task.done).length;
    return Math.round((completedTasks / note.tasks.length) * 100);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get priority color
  const getPriorityColor = (priority?: PriorityLevel) => {
    if (!priority) return 'bg-gray-400';
    
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };
  
  // Get priority label
  const getPriorityLabel = (priority?: PriorityLevel) => {
    if (!priority) return '';
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  // Truncate text for card display
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Get a preview of the note content
  const getNotePreview = () => {
    if (!note.content) return 'Empty note';
    
    const lines = note.content.split('\n');
    
    // Use first line as title if possible
    let content = lines[0];
    
    // If there's a markdown header, clean it up
    if (content.startsWith('#')) {
      content = content.replace(/^#+\s*/, '');
    }
    
    return truncateText(content);
  };
  
  // Get note content without the title
  const getNoteContent = () => {
    if (!note.content) return '';
    
    const lines = note.content.split('\n');
    if (lines.length <= 1) return '';
    
    // Skip the first line (title) and join the rest
    return truncateText(lines.slice(1).join('\n'), 80);
  };
  
  // Check if task is due soon (within 3 days)
  const isDueSoon = () => {
    if (!note.dueDate) return false;
    
    const dueDate = new Date(note.dueDate);
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    return dueDate <= threeDaysFromNow && dueDate >= today;
  };
  
  // Check if task is overdue
  const isOverdue = () => {
    if (!note.dueDate) return false;
    
    const dueDate = new Date(note.dueDate);
    const today = new Date();
    
    return dueDate < today;
  };

  return (
    <div
      ref={drag}
      className={`kanban-card bg-card-bg p-3 rounded-md mb-2.5 shadow-md cursor-move border border-border-light hover:shadow-lg transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100'
      } relative`}
      onClick={(e) => {
        // Only open the note if we didn't click on a menu item or button
        if (!(e.target as HTMLElement).closest('.card-menu')) {
          onOpenNote(noteId);
        }
      }}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        borderLeft: `4px solid var(--color-${note.color || 'blue'}-500)`,
        transform: `scale(${isDragging ? 0.95 : 1})`,
      }}
    >
      {/* Card menu button */}
      <div className="absolute top-2 right-2 z-10 card-menu">
        <button 
          className="p-1 text-text-secondary hover:text-text-primary rounded-full hover:bg-white/10 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <MoreHorizontal size={14} />
        </button>
        
        {/* Card menu dropdown */}
        {showMenu && (
          <div 
            ref={menuRef}
            className="absolute top-full right-0 mt-1 bg-card-bg rounded-md shadow-lg border border-border-light z-20 w-40"
          >
            <ul className="py-1">
              <li>
                <button 
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAddToCanvas) {
                      onAddToCanvas(noteId);
                    }
                    setShowMenu(false);
                  }}
                >
                  <Layout size={14} />
                  <span>Add to Canvas</span>
                </button>
              </li>
              <li>
                <button 
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenNote(noteId);
                  }}
                >
                  <Edit size={14} />
                  <span>Edit Note</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
      
      {/* Card header with title and indicators */}
      <div className="card-header mb-2 flex items-start justify-between gap-2">
        <h3 className="card-title text-sm font-medium line-clamp-2 flex-1">
          {getNotePreview()}
        </h3>
        
        {/* Priority indicator */}
        {note.priority && (
          <div className={`priority-badge flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
            note.priority === 'high' 
              ? 'bg-red-500/20 text-red-400' 
              : note.priority === 'medium'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-blue-500/20 text-blue-400'
          }`}>
            {getPriorityLabel(note.priority)}
          </div>
        )}
      </div>
      
      {/* Card content preview */}
      {getNoteContent() && (
        <div className="card-content text-xs text-text-secondary mb-3 line-clamp-2">
          {getNoteContent()}
        </div>
      )}
      
      {/* Task progress if tasks exist */}
      {note.tasks && note.tasks.length > 0 && (
        <div className="task-progress mb-3">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span className="font-medium">{getCompletionPercentage()}% Complete</span>
            <span>{note.tasks.filter(t => t.done).length}/{note.tasks.length}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                getCompletionPercentage() === 100 
                  ? 'bg-green-500' 
                  : getCompletionPercentage() > 50 
                    ? 'bg-blue-500' 
                    : 'bg-accent-blue'
              } transition-all duration-500 ease-in-out`}
              style={{ width: `${getCompletionPercentage()}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Card footer with metadata */}
      <div className="card-footer flex items-center gap-2 mt-2 justify-between">
        <div className="flex gap-1 items-center">
          {/* Category if exists */}
          {note.category && (
            <span className="text-xs px-1.5 py-0.5 bg-white/10 rounded-sm text-text-secondary">
              {note.category}
            </span>
          )}
        </div>
        
        {/* Due date */}
        {note.dueDate && (
          <div className={`flex items-center text-xs ${
            isOverdue() 
              ? 'text-red-400' 
              : isDueSoon() 
                ? 'text-yellow-400' 
                : 'text-text-secondary'
          }`} title={`Due: ${note.dueDate}`}>
            <Calendar size={10} className="mr-1" />
            {formatDate(note.dueDate)}
            {isOverdue() && <span className="ml-1">(Overdue)</span>}
          </div>
        )}
      </div>
    </div>
  );
};

// Droppable Lane Component
const KanbanLane: React.FC<KanbanLaneProps> = ({ 
  lane, 
  notes, 
  index,
  onOpenNote,
  onAddNote,
  onMoveLane,
  onEditLane,
  onDeleteLane,
  onMoveCard,
  onAddToCanvas
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.CARD,
    drop: (item: { noteId: string, laneId: string, index: number }) => {
      if (item.laneId !== lane.id) {
        onMoveCard(item.noteId, item.laneId, lane.id, notes.length);
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver()
    })
  });

  const [showLaneMenu, setShowLaneMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(lane.title);
  const [newColor, setNewColor] = useState(lane.color);

  // Reference to sorted and filtered notes for this lane
  const laneNotes = useMemo(() => {
    return notes.filter(note => lane.noteIds.includes(note.id));
  }, [notes, lane.noteIds]);

  // Handle edit lane submit
  const handleEditSubmit = () => {
    if (newTitle.trim()) {
      onEditLane(lane.id, newTitle, newColor);
      setIsEditingTitle(false);
    }
  };

  // Get the color class for the lane header
  const getLaneHeaderColor = () => {
    switch (lane.color) {
      case 'blue': return 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500';
      case 'green': return 'from-green-500/20 to-green-600/10 text-green-400 border-green-500';
      case 'red': return 'from-red-500/20 to-red-600/10 text-red-400 border-red-500';
      case 'yellow': return 'from-yellow-500/20 to-yellow-600/10 text-yellow-400 border-yellow-500';
      case 'purple': return 'from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500';
      case 'pink': return 'from-pink-500/20 to-pink-600/10 text-pink-400 border-pink-500';
      case 'indigo': return 'from-indigo-500/20 to-indigo-600/10 text-indigo-400 border-indigo-500';
      case 'teal': return 'from-teal-500/20 to-teal-600/10 text-teal-400 border-teal-500';
      default: return 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500';
    }
  };

  // Available lane colors
  const laneColors = [
    { id: 'blue', name: 'Blue' },
    { id: 'green', name: 'Green' },
    { id: 'red', name: 'Red' },
    { id: 'yellow', name: 'Yellow' },
    { id: 'purple', name: 'Purple' },
    { id: 'pink', name: 'Pink' },
    { id: 'indigo', name: 'Indigo' },
    { id: 'teal', name: 'Teal' }
  ];

  return (
    <div 
      ref={drop}
      className={`kanban-lane bg-card-bg/70 rounded-md shadow-md flex flex-col w-[280px] min-w-[280px] max-w-[280px] h-full mx-2 backdrop-blur-sm border border-border-light ${
        isOver ? 'ring-2 ring-accent-blue' : ''
      } transition-all duration-200`}
      style={{ 
        boxShadow: isOver ? '0 0 15px rgba(59, 130, 246, 0.5)' : undefined
      }}
    >
      {/* Lane header */}
      <div 
        className={`lane-header p-3 rounded-t-md flex items-center justify-between bg-gradient-to-r ${getLaneHeaderColor()} border-b`}
      >
        {isEditingTitle ? (
          <div className="w-full">
            <input
              type="text"
              className="w-full bg-card-bg p-1.5 rounded text-sm outline-none focus:ring-1 focus:ring-accent-blue"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSubmit();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              onBlur={handleEditSubmit}
              autoFocus
            />
            
            {/* Color selection while editing */}
            <div className="flex flex-wrap gap-1 mt-2">
              {laneColors.map(color => (
                <button
                  key={color.id}
                  className={`w-5 h-5 rounded-full bg-${color.id}-500 ${
                    newColor === color.id ? 'ring-2 ring-white' : ''
                  } hover:scale-110 transition-transform`}
                  onClick={() => setNewColor(color.id)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center">
              <h3 className="text-sm font-semibold flex items-center">
                {lane.title} 
                <span className="ml-2 bg-white/10 text-xs px-1.5 rounded-full">
                  {laneNotes.length}
                </span>
              </h3>
            </div>
            
            <div className="relative">
              <button 
                className="p-1 rounded hover:bg-white/10 transition-colors"
                onClick={() => setShowLaneMenu(!showLaneMenu)}
              >
                <MoreHorizontal size={16} />
              </button>
              
              {/* Lane options menu */}
              {showLaneMenu && (
                <div className="absolute top-full right-0 mt-1 bg-card-bg rounded-md shadow-lg border border-border-light z-10 w-40">
                  <ul>
                    <li>
                      <button 
                        className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 transition-colors"
                        onClick={() => {
                          setIsEditingTitle(true);
                          setShowLaneMenu(false);
                        }}
                      >
                        <Edit size={14} />
                        <span className="text-sm">Edit Lane</span>
                      </button>
                    </li>
                    <li>
                      <button 
                        className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                        onClick={() => {
                          onDeleteLane(lane.id);
                          setShowLaneMenu(false);
                        }}
                      >
                        <Trash2 size={14} />
                        <span className="text-sm">Delete Lane</span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Card container */}
      <div className="lane-content flex-1 p-2 overflow-y-auto custom-scrollbar">
        {laneNotes.map((note, cardIndex) => (
          <KanbanCard 
            key={note.id} 
            noteId={note.id} 
            note={note} 
            laneId={lane.id} 
            index={cardIndex}
            onOpenNote={onOpenNote}
            onMoveCard={onMoveCard}
            onAddToCanvas={onAddToCanvas}
          />
        ))}
        
        {laneNotes.length === 0 && (
          <div className="empty-lane flex flex-col items-center justify-center py-6 text-text-tertiary text-sm">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <MoveHorizontal size={20} className="opacity-50" />
            </div>
            <p>Drop cards here</p>
          </div>
        )}
      </div>
      
      {/* Add card button */}
      <div className="lane-footer p-2 border-t border-border-light mt-auto">
        <button 
          className="w-full py-1.5 flex items-center justify-center gap-1 text-sm rounded hover:bg-white/5 transition-colors text-text-secondary hover:text-text-primary"
          onClick={() => onAddNote(lane.id)}
        >
          <Plus size={14} />
          <span>Add Card</span>
        </button>
      </div>
    </div>
  );
};

// Main Kanban Board Component
const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  onOpenNote, 
  onGoBackToCanvas,
  onAddToCanvas 
}) => {
  const { notes, updateNote, addNote } = useNoteStore();
  const [lanes, setLanes] = useState<KanbanLane[]>([
    { id: 'backlog', title: 'Backlog', color: 'blue', noteIds: [] },
    { id: 'todo', title: 'To Do', color: 'red', noteIds: [] },
    { id: 'inprogress', title: 'In Progress', color: 'yellow', noteIds: [] },
    { id: 'done', title: 'Done', color: 'green', noteIds: [] }
  ]);
  const [showAddLane, setShowAddLane] = useState(false);
  const [newLaneTitle, setNewLaneTitle] = useState('');
  const [newLaneColor, setNewLaneColor] = useState('blue');
  
  // Add search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  // Initialize lanes with notes on component mount
  useEffect(() => {
    const initializedLanes = [...lanes];
    const assignedNoteIds = new Set<string>();
    
    // First, assign notes that already have a laneId property
    notes.forEach(note => {
      if (note.laneId) {
        const laneIndex = initializedLanes.findIndex(lane => lane.id === note.laneId);
        if (laneIndex >= 0) {
          initializedLanes[laneIndex].noteIds.push(note.id);
          assignedNoteIds.add(note.id);
        }
      }
    });
    
    // Next, assign remaining notes based on their metadata
    notes.forEach(note => {
      if (assignedNoteIds.has(note.id)) return;
      
      // Put completed tasks in "Done" lane
      if (note.tasks && note.tasks.length > 0) {
        const allTasksDone = note.tasks.every(task => task.done);
        if (allTasksDone) {
          initializedLanes[3].noteIds.push(note.id); // "Done" lane
        } else {
          initializedLanes[2].noteIds.push(note.id); // "In Progress" lane
        }
      } 
      // Check for priority or due date
      else if (note.priority === 'high' || (note.dueDate && new Date(note.dueDate) <= new Date())) {
        initializedLanes[1].noteIds.push(note.id); // "To Do" lane
      }
      // Default to backlog
      else {
        initializedLanes[0].noteIds.push(note.id); // "Backlog" lane
      }
      
      assignedNoteIds.add(note.id);
    });
    
    setLanes(initializedLanes);
  }, []);

  // Filtered notes based on search term
  const filteredNotes = useMemo(() => {
    if (!searchTerm.trim()) return notes;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return notes.filter(note => {
      // Search in content
      if (note.content && note.content.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }
      
      // Search in category
      if (note.category && note.category.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }
      
      // Search in tasks
      if (note.tasks && note.tasks.some(task => 
        task.text.toLowerCase().includes(lowerSearchTerm)
      )) {
        return true;
      }
      
      return false;
    });
  }, [notes, searchTerm]);

  // Handle moving a card between lanes
  const handleMoveCard = (noteId: string, sourceLaneId: string, targetLaneId: string, targetIndex: number) => {
    // Update lanes state
    setLanes(prevLanes => {
      const newLanes = [...prevLanes];
      
      // Remove from source lane
      const sourceLane = newLanes.find(lane => lane.id === sourceLaneId);
      if (sourceLane) {
        sourceLane.noteIds = sourceLane.noteIds.filter(id => id !== noteId);
      }
      
      // Add to target lane at specific index
      const targetLane = newLanes.find(lane => lane.id === targetLaneId);
      if (targetLane) {
        const newNoteIds = [...targetLane.noteIds];
        newNoteIds.splice(targetIndex, 0, noteId);
        targetLane.noteIds = newNoteIds;
      }
      
      return newLanes;
    });
    
    // Update note with new lane ID
    const note = notes.find(n => n.id === noteId);
    if (note) {
      updateNote(noteId, {
        ...note,
        laneId: targetLaneId, 
        updatedAt: new Date().toISOString()
      });
    }
  };

  // Handle moving a lane
  const handleMoveLane = (dragIndex: number, hoverIndex: number) => {
    setLanes(prevLanes => {
      const newLanes = [...prevLanes];
      const [draggedLane] = newLanes.splice(dragIndex, 1);
      newLanes.splice(hoverIndex, 0, draggedLane);
      return newLanes;
    });
  };

  // Handle adding a new lane
  const handleAddLane = () => {
    if (newLaneTitle.trim()) {
      const newLane: KanbanLane = {
        id: `lane-${Date.now()}`,
        title: newLaneTitle,
        color: newLaneColor,
        noteIds: []
      };
      
      setLanes(prevLanes => [...prevLanes, newLane]);
      setNewLaneTitle('');
      setShowAddLane(false);
    }
  };

  // Handle editing a lane
  const handleEditLane = (laneId: string, title: string, color: string) => {
    setLanes(prevLanes => 
      prevLanes.map(lane => 
        lane.id === laneId 
          ? { ...lane, title, color } 
          : lane
      )
    );
  };

  // Handle deleting a lane
  const handleDeleteLane = (laneId: string) => {
    if (window.confirm('Are you sure you want to delete this lane? Cards will be moved to the Backlog.')) {
      // Get notes from the lane being deleted
      const laneToDelete = lanes.find(lane => lane.id === laneId);
      if (!laneToDelete) return;
      
      const notesToMove = laneToDelete.noteIds;
      
      // Move notes to backlog
      setLanes(prevLanes => {
        const newLanes = prevLanes.filter(lane => lane.id !== laneId);
        
        // Find backlog lane
        const backlogLane = newLanes.find(lane => lane.id === 'backlog');
        if (backlogLane && notesToMove.length > 0) {
          backlogLane.noteIds = [...backlogLane.noteIds, ...notesToMove];
        }
        
        return newLanes;
      });
      
      // Update notes with backlog laneId
      notesToMove.forEach(noteId => {
        const note = notes.find(n => n.id === noteId);
        if (note) {
          updateNote(noteId, {
            ...note,
            laneId: 'backlog',
            updatedAt: new Date().toISOString()
          });
        }
      });
    }
  };

  // Handle adding a new note to a lane
  const handleAddNote = (laneId: string) => {
    // Create a new note
    const newNote: NoteType = {
      id: `note-${Date.now()}`,
      content: '# New Card\n\nAdd content here...',
      position: { x: 0, y: 0 },
      type: 'sticky',
      color: 'blue',
      tasks: [],
      laneId: laneId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add note to store
    addNote(newNote);
    
    // Add note ID to lane
    setLanes(prevLanes => 
      prevLanes.map(lane => 
        lane.id === laneId 
          ? { ...lane, noteIds: [...lane.noteIds, newNote.id] } 
          : lane
      )
    );
    
    // Open the note for editing
    onOpenNote(newNote.id);
  };

  // Available lane colors
  const laneColors = [
    { id: 'blue', name: 'Blue' },
    { id: 'green', name: 'Green' },
    { id: 'red', name: 'Red' },
    { id: 'yellow', name: 'Yellow' },
    { id: 'purple', name: 'Purple' },
    { id: 'pink', name: 'Pink' },
    { id: 'indigo', name: 'Indigo' },
    { id: 'teal', name: 'Teal' }
  ];
  
  // Filter options for the dropdown
  const filterOptions = [
    { id: 'all', label: 'All Tasks' },
    { id: 'my-tasks', label: 'My Tasks' },
    { id: 'high-priority', label: 'High Priority' },
    { id: 'due-soon', label: 'Due Soon' }
  ];
  
  // Total count of all cards
  const totalCards = lanes.reduce((total, lane) => total + lane.noteIds.length, 0);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="kanban-board h-full flex flex-col bg-app-bg">
        {/* Board header - Tron theme styled */}
        <div className="board-header p-3 border-b border-border-light bg-header-bg">
          {/* Top level header with navigation and title */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button 
                className="p-2 bg-white/5 rounded hover:bg-white/10 transition-colors"
                onClick={onGoBackToCanvas}
                title="Back to Canvas"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text">
                Project Management Board
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">
                {totalCards} {totalCards === 1 ? 'card' : 'cards'}
              </span>
            </div>
          </div>
          
          {/* Second row with search and filters */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Search box */}
            <div className="relative flex-grow max-w-md">
              <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                className="w-full bg-white/5 rounded px-9 py-2 text-sm outline-none focus:ring-1 focus:ring-accent-blue placeholder-text-tertiary"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2">
              {/* Filter dropdown */}
              <div className="relative">
                <button
                  className="px-3 py-2 bg-white/5 rounded flex items-center gap-1 hover:bg-white/10 transition-colors"
                  onClick={() => setSelectedFilter(selectedFilter ? null : 'all')}
                >
                  <SlidersHorizontal size={16} />
                  <span className="text-sm">Filter</span>
                </button>
                
                {selectedFilter && (
                  <div className="absolute top-full right-0 mt-1 bg-card-bg rounded-md shadow-lg border border-border-light z-10 w-40">
                    <ul>
                      {filterOptions.map(option => (
                        <li key={option.id}>
                          <button
                            className={`w-full text-left px-3 py-2 text-sm ${
                              selectedFilter === option.id ? 'bg-accent-blue/20 text-accent-blue' : 'hover:bg-white/5'
                            }`}
                            onClick={() => setSelectedFilter(option.id)}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Other filter controls can be added here */}
            </div>
          </div>
        </div>
        
        {/* Board content */}
        <div className="board-content flex-1 p-4 overflow-x-auto overflow-y-hidden">
          <div className="lanes-container flex h-full">
            {/* Render lanes */}
            {lanes.map((lane, laneIndex) => (
              <KanbanLane 
                key={lane.id} 
                lane={lane} 
                notes={filteredNotes}
                index={laneIndex}
                onOpenNote={onOpenNote}
                onAddNote={handleAddNote}
                onMoveLane={handleMoveLane}
                onEditLane={handleEditLane}
                onDeleteLane={handleDeleteLane}
                onMoveCard={handleMoveCard}
                onAddToCanvas={onAddToCanvas}
              />
            ))}
            
            {/* Add lane button/form */}
            <div className="add-lane min-w-[280px] max-w-[280px] mx-2">
              {showAddLane ? (
                <div className="bg-card-bg rounded-md shadow-md p-3 border border-border-light">
                  <input
                    type="text"
                    className="w-full bg-white/5 p-2 rounded mb-2 outline-none focus:ring-1 focus:ring-accent-blue text-sm"
                    placeholder="Enter lane title..."
                    value={newLaneTitle}
                    onChange={(e) => setNewLaneTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLane();
                      if (e.key === 'Escape') setShowAddLane(false);
                    }}
                    autoFocus
                  />
                  
                  {/* Color selection */}
                  <div className="color-selection mb-3">
                    <label className="text-xs text-text-secondary block mb-1">Lane Color</label>
                    <div className="flex flex-wrap gap-1">
                      {laneColors.map(color => (
                        <button
                          key={color.id}
                          className={`w-6 h-6 rounded-full bg-${color.id}-500 ${
                            newLaneColor === color.id ? 'ring-2 ring-white' : ''
                          } transition-transform hover:scale-110`}
                          onClick={() => setNewLaneColor(color.id)}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      className="flex-1 py-2 bg-white/5 rounded hover:bg-white/10 transition-colors text-sm"
                      onClick={() => setShowAddLane(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 py-2 bg-accent-blue rounded hover:bg-accent-blue/80 transition-colors text-sm"
                      onClick={handleAddLane}
                      disabled={!newLaneTitle.trim()}
                    >
                      Add Lane
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  className="w-full h-12 border-2 border-dashed border-border-light rounded-md flex items-center justify-center text-text-secondary hover:text-accent-blue hover:border-accent-blue/50 transition-colors"
                  onClick={() => setShowAddLane(true)}
                >
                  <Plus size={20} className="mr-2" />
                  <span>Add Lane</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default KanbanBoard; 