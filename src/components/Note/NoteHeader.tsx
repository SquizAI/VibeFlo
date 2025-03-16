import React, { useState, useRef, useEffect } from 'react';
import { X, Palette, MoreVertical, Kanban, ChevronDown } from 'lucide-react';
import { NoteHeaderProps } from './types';

const NoteHeader: React.FC<NoteHeaderProps> = ({
  note,
  showColorPicker,
  setShowColorPicker,
  onDeleteNote,
  onDragStart,
  onDragEnd,
  onSendToKanban
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showLaneMenu, setShowLaneMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowLaneMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Available lanes - these should match the defaults in KanbanBoard.tsx
  const defaultLanes = [
    { id: 'backlog', title: 'Backlog' },
    { id: 'todo', title: 'To Do' },
    { id: 'inprogress', title: 'In Progress' },
    { id: 'done', title: 'Done' }
  ];

  return (
    <div 
      className="p-3 cursor-grab note-handle flex items-center justify-between border-b border-white/10 gap-2"
      onMouseDown={(e) => {
        // Start dragging only if we click directly on the header (not its buttons)
        if ((e.target as HTMLElement).className.includes('note-handle')) {
          onDragStart();
        }
      }}
      onMouseUp={onDragEnd}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-1 hover:bg-white/10 rounded transition-colors relative"
          aria-label="Change note color"
        >
          <Palette className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-2">
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-card-bg z-50 rounded shadow-lg border border-border-light w-48">
              <ul className="py-1">
                <li>
                  <button 
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10"
                    onClick={() => setShowLaneMenu(true)}
                  >
                    <Kanban size={14} />
                    <span>Send to Kanban</span>
                    <ChevronDown size={14} className="ml-auto" />
                  </button>
                  
                  {showLaneMenu && (
                    <div className="bg-card-bg border-t border-border-light rounded-b-md">
                      <ul className="py-1">
                        {defaultLanes.map(lane => (
                          <li key={lane.id}>
                            <button 
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 pl-8"
                              onClick={() => {
                                if (onSendToKanban) {
                                  onSendToKanban(note.id, lane.id);
                                  setShowMenu(false);
                                  setShowLaneMenu(false);
                                }
                              }}
                            >
                              {lane.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              </ul>
            </div>
          )}
        </div>
        
        <button
          onClick={onDeleteNote}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Delete note"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NoteHeader; 