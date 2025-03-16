import React, { useState, useEffect } from 'react';
import { 
  AlignHorizontalJustifyCenter, 
  AlignHorizontalJustifyStart, 
  AlignHorizontalJustifyEnd, 
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  Grid,
  X,
  Layout,
  LayoutGrid,
  Rows,
  Columns,
  Circle,
  GripHorizontal,
  Ruler,
  MoveHorizontal,
  MoveVertical,
  Maximize2,
  Minimize2,
  ChevronsUpDown,
  ChevronsLeftRight,
  MousePointer,
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom,
  Combine
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { Note, Position } from '../types';

// Calculate grid dimensions
const DEFAULT_GRID_SIZE = 50; // Grid size in pixels
const NOTE_WIDTH = 320; // Standard note width
const NOTE_HEIGHT = 200; // Approximate note height
const DEFAULT_SPACING = 30; // Default spacing between notes

// Enhanced alignment options
type AlignmentOption = 
  | 'left' | 'center' | 'right'  // Horizontal
  | 'top' | 'middle' | 'bottom'  // Vertical
  | 'distribute-horizontally' | 'distribute-vertically' // Distribution
  | 'grid' | 'snap-to-grid'      // Grid-related
  | 'auto-grid' | 'columns' | 'rows' | 'circle' | 'stack'; // Advanced organization

interface AlignmentToolProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AlignmentTool({ isOpen, onClose }: AlignmentToolProps) {
  const { notes, moveNote, updateNote } = useNoteStore();
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [spacing, setSpacing] = useState(DEFAULT_SPACING);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showSelectionArea, setShowSelectionArea] = useState(true);
  const [selectionRect, setSelectionRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Function to show a temporary status message
  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Toggle note selection
  const toggleNoteSelection = (noteId: string) => {
    if (selectedNotes.includes(noteId)) {
      setSelectedNotes(prev => prev.filter(id => id !== noteId));
    } else {
      setSelectedNotes(prev => [...prev, noteId]);
    }
  };

  // Clear selections
  const clearSelections = () => {
    setSelectedNotes([]);
  };

  // Select all notes
  const selectAllNotes = () => {
    setSelectedNotes(notes.map(note => note.id));
  };

  // Get bounds of selected notes
  const getBounds = () => {
    const selectedNoteObjects = notes.filter(note => selectedNotes.includes(note.id));
    
    if (selectedNoteObjects.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    }
    
    const bounds = selectedNoteObjects.reduce(
      (acc, note) => ({
        minX: Math.min(acc.minX, note.position.x),
        maxX: Math.max(acc.maxX, note.position.x + NOTE_WIDTH),
        minY: Math.min(acc.minY, note.position.y),
        maxY: Math.max(acc.maxY, note.position.y + NOTE_HEIGHT),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );
    
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const centerX = bounds.minX + width / 2;
    const centerY = bounds.minY + height / 2;
    
    return { ...bounds, width, height, centerX, centerY };
  };

  // Update selection area rect when selected notes change
  useEffect(() => {
    if (selectedNotes.length > 0) {
      const bounds = getBounds();
      setSelectionRect({
        left: bounds.minX,
        top: bounds.minY,
        width: bounds.width,
        height: bounds.height
      });
      setShowSelectionArea(true);
    } else {
      setShowSelectionArea(false);
    }
  }, [selectedNotes, notes]);

  // Function to snap positions to grid
  const snapToGrid = (position: Position): Position => {
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    };
  };

  // Function to distribute notes evenly
  const distributeNotes = (axis: 'horizontal' | 'vertical') => {
    if (selectedNotes.length < 3) {
      showStatus("Need at least 3 notes to distribute");
      return;
    }

    const selectedNoteObjects = notes.filter(note => selectedNotes.includes(note.id));
    
    if (axis === 'horizontal') {
      // Sort notes by x position
      const sortedNotes = [...selectedNoteObjects].sort((a, b) => a.position.x - b.position.x);
      
      // Calculate the total width and spacing
      const firstNote = sortedNotes[0];
      const lastNote = sortedNotes[sortedNotes.length - 1];
      const totalWidth = lastNote.position.x - firstNote.position.x;
      
      // We don't move the first and last notes
      if (sortedNotes.length <= 2) return;
      
      // Calculate spacing between notes
      const spacing = totalWidth / (sortedNotes.length - 1);
      
      // Distribute middle notes evenly
      for (let i = 1; i < sortedNotes.length - 1; i++) {
        const newX = firstNote.position.x + spacing * i;
        moveNote(sortedNotes[i].id, { x: newX, y: sortedNotes[i].position.y });
      }
      
      showStatus("Notes distributed horizontally");
      
    } else { // vertical
      // Sort notes by y position
      const sortedNotes = [...selectedNoteObjects].sort((a, b) => a.position.y - b.position.y);
      
      // Calculate the total height and spacing
      const firstNote = sortedNotes[0];
      const lastNote = sortedNotes[sortedNotes.length - 1];
      const totalHeight = lastNote.position.y - firstNote.position.y;
      
      // We don't move the first and last notes
      if (sortedNotes.length <= 2) return;
      
      // Calculate spacing between notes
      const spacing = totalHeight / (sortedNotes.length - 1);
      
      // Distribute middle notes evenly
      for (let i = 1; i < sortedNotes.length - 1; i++) {
        const newY = firstNote.position.y + spacing * i;
        moveNote(sortedNotes[i].id, { x: sortedNotes[i].position.x, y: newY });
      }
      
      showStatus("Notes distributed vertically");
    }
  };

  // Function to arrange notes in a grid layout
  const arrangeInGrid = () => {
    if (selectedNotes.length < 2) {
      showStatus("Need at least 2 notes to arrange in grid");
      return;
    }

    const selectedNoteObjects = notes.filter(note => selectedNotes.includes(note.id));
    const bounds = getBounds();
    
    // Calculate how many columns we need based on the number of notes
    const numNotes = selectedNoteObjects.length;
    const columns = Math.ceil(Math.sqrt(numNotes)); // Square grid approximation
    
    // Sort notes by their current position (top-left to bottom-right)
    const sortedNotes = [...selectedNoteObjects].sort((a, b) => {
      // Sort by y first, then by x
      if (Math.abs(a.position.y - b.position.y) > NOTE_HEIGHT / 2) {
        return a.position.y - b.position.y;
      }
      return a.position.x - b.position.x;
    });
    
    // Arrange in grid
    sortedNotes.forEach((note, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      const newPosition = {
        x: bounds.minX + col * (NOTE_WIDTH + spacing),
        y: bounds.minY + row * (NOTE_HEIGHT + spacing)
      };
      
      moveNote(note.id, newPosition);
    });
    
    showStatus("Notes arranged in grid");
  };

  // Function to arrange notes in a circle
  const arrangeInCircle = () => {
    if (selectedNotes.length < 3) {
      showStatus("Need at least 3 notes to arrange in a circle");
      return;
    }

    const selectedNoteObjects = notes.filter(note => selectedNotes.includes(note.id));
    const bounds = getBounds();
    const centerX = bounds.centerX;
    const centerY = bounds.centerY;
    
    // Calculate radius based on note count and size
    const radius = Math.max(
      selectedNotes.length * 50, // Ensure minimum spacing between notes
      Math.max(bounds.width, bounds.height) / 1.5 // Or base on current selection size
    );
    
    // Arrange in circle
    selectedNoteObjects.forEach((note, index) => {
      const angle = (index / selectedNoteObjects.length) * Math.PI * 2;
      const newPosition = {
        x: centerX + Math.cos(angle) * radius - NOTE_WIDTH / 2,
        y: centerY + Math.sin(angle) * radius - NOTE_HEIGHT / 2
      };
      
      moveNote(note.id, newPosition);
    });
    
    showStatus("Notes arranged in circle");
  };

  // Function to arrange notes in columns
  const arrangeInColumns = () => {
    if (selectedNotes.length < 2) {
      showStatus("Need at least 2 notes to arrange in columns");
      return;
    }

    const selectedNoteObjects = notes.filter(note => selectedNotes.includes(note.id));
    
    // Group notes by approximate x-position
    const columnThreshold = NOTE_WIDTH * 0.75; // Notes closer than 75% of width are in same column
    const columns: Note[][] = [];
    
    // First sort by x position
    const sortedByX = [...selectedNoteObjects].sort((a, b) => a.position.x - b.position.x);
    
    // Group into columns
    sortedByX.forEach(note => {
      const noteX = note.position.x;
      
      // Try to find an existing column that's close enough
      const columnIndex = columns.findIndex(column => {
        const columnX = column[0].position.x;
        return Math.abs(columnX - noteX) < columnThreshold;
      });
      
      if (columnIndex >= 0) {
        // Add to existing column
        columns[columnIndex].push(note);
      } else {
        // Create new column
        columns.push([note]);
      }
    });
    
    // Sort each column by y-position
    columns.forEach(column => {
      column.sort((a, b) => a.position.y - b.position.y);
    });
    
    // Re-arrange notes in clean columns
    columns.forEach((column, columnIndex) => {
      // Use the current x position of the first note in the column
      const columnX = column[0].position.x;
      
      column.forEach((note, rowIndex) => {
        moveNote(note.id, {
          x: columnX,
          y: rowIndex * (NOTE_HEIGHT + spacing)
        });
      });
    });
    
    showStatus("Notes arranged in columns");
  };

  // Function to arrange notes in rows
  const arrangeInRows = () => {
    if (selectedNotes.length < 2) {
      showStatus("Need at least 2 notes to arrange in rows");
      return;
    }

    const selectedNoteObjects = notes.filter(note => selectedNotes.includes(note.id));
    
    // Group notes by approximate y-position
    const rowThreshold = NOTE_HEIGHT * 0.75; // Notes closer than 75% of height are in same row
    const rows: Note[][] = [];
    
    // First sort by y position
    const sortedByY = [...selectedNoteObjects].sort((a, b) => a.position.y - b.position.y);
    
    // Group into rows
    sortedByY.forEach(note => {
      const noteY = note.position.y;
      
      // Try to find an existing row that's close enough
      const rowIndex = rows.findIndex(row => {
        const rowY = row[0].position.y;
        return Math.abs(rowY - noteY) < rowThreshold;
      });
      
      if (rowIndex >= 0) {
        // Add to existing row
        rows[rowIndex].push(note);
      } else {
        // Create new row
        rows.push([note]);
      }
    });
    
    // Sort each row by x-position
    rows.forEach(row => {
      row.sort((a, b) => a.position.x - b.position.x);
    });
    
    // Re-arrange notes in clean rows
    rows.forEach((row, rowIndex) => {
      // Use the current y position of the first note in the row
      const rowY = row[0].position.y;
      
      row.forEach((note, columnIndex) => {
        moveNote(note.id, {
          x: columnIndex * (NOTE_WIDTH + spacing),
          y: rowY
        });
      });
    });
    
    showStatus("Notes arranged in rows");
  };

  // Function to stack notes
  const stackNotes = () => {
    if (selectedNotes.length < 2) {
      showStatus("Need at least 2 notes to stack");
      return;
    }

    const selectedNoteObjects = notes.filter(note => selectedNotes.includes(note.id));
    const bounds = getBounds();
    
    // Sort by current z-index or creation time if available
    // This maintains some logical order in the stack
    const sortedNotes = [...selectedNoteObjects].sort((a, b) => {
      // Sort by id as a reasonable fallback - most recent note on top
      return a.id.localeCompare(b.id);
    });
    
    // Stack with a small offset for each note
    sortedNotes.forEach((note, index) => {
      moveNote(note.id, {
        x: bounds.minX + index * 10,
        y: bounds.minY + index * 10
      });
    });
    
    showStatus("Notes stacked");
  };

  // Apply alignment
  const alignNotes = (alignment: AlignmentOption) => {
    if (selectedNotes.length < 1) {
      showStatus("Select at least one note to align");
      return;
    }

    const selectedNoteObjects = notes.filter(note => selectedNotes.includes(note.id));
    const bounds = getBounds();
    
    // Handle different alignment types
    switch (alignment) {
      // Basic horizontal alignments
      case 'left':
        selectedNoteObjects.forEach(note => {
          moveNote(note.id, { x: bounds.minX, y: note.position.y });
        });
        showStatus("Notes aligned to left");
        break;
        
      case 'center':
        selectedNoteObjects.forEach(note => {
          moveNote(note.id, { 
            x: bounds.centerX - NOTE_WIDTH / 2, 
            y: note.position.y 
          });
        });
        showStatus("Notes aligned to center");
        break;
        
      case 'right':
        selectedNoteObjects.forEach(note => {
          moveNote(note.id, { 
            x: bounds.maxX - NOTE_WIDTH, 
            y: note.position.y 
          });
        });
        showStatus("Notes aligned to right");
        break;
      
      // Basic vertical alignments
      case 'top':
        selectedNoteObjects.forEach(note => {
          moveNote(note.id, { x: note.position.x, y: bounds.minY });
        });
        showStatus("Notes aligned to top");
        break;
        
      case 'middle':
        selectedNoteObjects.forEach(note => {
          moveNote(note.id, { 
            x: note.position.x, 
            y: bounds.centerY - NOTE_HEIGHT / 2 
          });
        });
        showStatus("Notes aligned to middle");
        break;
        
      case 'bottom':
        selectedNoteObjects.forEach(note => {
          moveNote(note.id, { 
            x: note.position.x, 
            y: bounds.maxY - NOTE_HEIGHT
          });
        });
        showStatus("Notes aligned to bottom");
        break;
      
      // Distribution
      case 'distribute-horizontally':
        distributeNotes('horizontal');
        break;
        
      case 'distribute-vertically':
        distributeNotes('vertical');
        break;
      
      // Grid operations
      case 'snap-to-grid':
        selectedNoteObjects.forEach(note => {
          moveNote(note.id, snapToGrid(note.position));
        });
        showStatus("Notes snapped to grid");
        break;
      
      // Advanced arrangements
      case 'auto-grid':
        arrangeInGrid();
        break;
        
      case 'columns':
        arrangeInColumns();
        break;
        
      case 'rows':
        arrangeInRows();
        break;
        
      case 'circle':
        arrangeInCircle();
        break;
        
      case 'stack':
        stackNotes();
        break;
        
      default:
        showStatus("Unknown alignment option");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="alignment-tool-container">
      <div className="alignment-tool">
        <div className="alignment-tool-header">
          <h3>Alignment Tools</h3>
          <button onClick={onClose} className="alignment-close-button">
            <X size={18} />
          </button>
        </div>
        
        <div className="alignment-tool-content">
          {/* Selection Controls */}
          <div className="alignment-section">
            <h4>Selection</h4>
            <div className="alignment-buttons">
              <button 
                className={`alignment-button ${selectMode ? 'active' : ''}`}
                onClick={() => setSelectMode(!selectMode)}
                title="Toggle selection mode"
              >
                <MousePointer size={18} />
                <span>Select</span>
              </button>
              <button 
                className="alignment-button"
                onClick={selectAllNotes}
                title="Select all notes"
                disabled={notes.length === 0}
              >
                <Maximize2 size={18} />
                <span>Select All</span>
              </button>
              <button 
                className="alignment-button"
                onClick={clearSelections}
                title="Clear selection"
                disabled={selectedNotes.length === 0}
              >
                <Minimize2 size={18} />
                <span>Clear</span>
              </button>
            </div>
            
            <div className="alignment-selected-count">
              {selectedNotes.length} note{selectedNotes.length !== 1 ? 's' : ''} selected
            </div>
          </div>
          
          {/* Horizontal Alignment */}
          <div className="alignment-section">
            <h4>Horizontal Alignment</h4>
            <div className="alignment-buttons">
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('left')}
                title="Align left"
                disabled={selectedNotes.length < 2}
              >
                <AlignHorizontalJustifyStart size={18} />
                <span>Left</span>
              </button>
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('center')}
                title="Align center horizontally"
                disabled={selectedNotes.length < 2}
              >
                <AlignHorizontalJustifyCenter size={18} />
                <span>Center</span>
              </button>
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('right')}
                title="Align right"
                disabled={selectedNotes.length < 2}
              >
                <AlignHorizontalJustifyEnd size={18} />
                <span>Right</span>
              </button>
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('distribute-horizontally')}
                title="Distribute horizontally"
                disabled={selectedNotes.length < 3}
              >
                <ChevronsLeftRight size={18} />
                <span>Distribute</span>
              </button>
            </div>
          </div>
          
          {/* Vertical Alignment */}
          <div className="alignment-section">
            <h4>Vertical Alignment</h4>
            <div className="alignment-buttons">
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('top')}
                title="Align top"
                disabled={selectedNotes.length < 2}
              >
                <AlignVerticalJustifyStart size={18} />
                <span>Top</span>
              </button>
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('middle')}
                title="Align middle vertically"
                disabled={selectedNotes.length < 2}
              >
                <AlignVerticalJustifyCenter size={18} />
                <span>Middle</span>
              </button>
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('bottom')}
                title="Align bottom"
                disabled={selectedNotes.length < 2}
              >
                <AlignVerticalJustifyEnd size={18} />
                <span>Bottom</span>
              </button>
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('distribute-vertically')}
                title="Distribute vertically"
                disabled={selectedNotes.length < 3}
              >
                <ChevronsUpDown size={18} />
                <span>Distribute</span>
              </button>
            </div>
          </div>
          
          {/* Grid and Arrangement */}
          <div className="alignment-section">
            <h4>Arrangement</h4>
            <div className="alignment-buttons">
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('auto-grid')}
                title="Arrange in grid"
                disabled={selectedNotes.length < 2}
              >
                <LayoutGrid size={18} />
                <span>Grid</span>
              </button>
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('columns')}
                title="Arrange in columns"
                disabled={selectedNotes.length < 2}
              >
                <Columns size={18} />
                <span>Columns</span>
              </button>
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('rows')}
                title="Arrange in rows"
                disabled={selectedNotes.length < 2}
              >
                <Rows size={18} />
                <span>Rows</span>
              </button>
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('circle')}
                title="Arrange in circle"
                disabled={selectedNotes.length < 3}
              >
                <Circle size={18} />
                <span>Circle</span>
              </button>
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('stack')}
                title="Stack notes"
                disabled={selectedNotes.length < 2}
              >
                <Combine size={18} />
                <span>Stack</span>
              </button>
            </div>
          </div>
          
          {/* Grid Settings */}
          <div className="alignment-section">
            <h4>Grid Settings</h4>
            <div className="alignment-controls">
              <div className="alignment-control">
                <label>Grid Size</label>
                <div className="control-row">
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={gridSize} 
                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                    className="range-slider"
                  />
                  <span className="control-value">{gridSize}px</span>
                </div>
              </div>
              
              <div className="alignment-control">
                <label>Spacing</label>
                <div className="control-row">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={spacing} 
                    onChange={(e) => setSpacing(parseInt(e.target.value))}
                    className="range-slider"
                  />
                  <span className="control-value">{spacing}px</span>
                </div>
              </div>
              
              <button 
                className="alignment-button" 
                onClick={() => alignNotes('snap-to-grid')}
                title="Snap to grid"
                disabled={selectedNotes.length === 0}
              >
                <Grid size={18} />
                <span>Snap to Grid</span>
              </button>
            </div>
          </div>
        </div>
        
        {statusMessage && (
          <div className="alignment-status-message">
            {statusMessage}
          </div>
        )}
      </div>
      
      {/* Selection Area Overlay */}
      {showSelectionArea && selectedNotes.length > 0 && (
        <div 
          className="selection-area"
          style={{
            left: `${selectionRect.left}px`,
            top: `${selectionRect.top}px`,
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`
          }}
        ></div>
      )}
    </div>
  );
}

export function AlignmentButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="alignment-button smart-spacing" 
      title="Open alignment tools"
    >
      <Layout size={18} />
      <span>Alignment Tools</span>
    </button>
  );
} 