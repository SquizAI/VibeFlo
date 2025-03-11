import React from 'react';
import { Grid, Columns, Rows, Square, Plus, Minus, Move, LayoutGrid } from 'lucide-react';

export type GridLayout = 'none' | 'quarters' | 'columns' | 'rows' | 'custom';
export type GridCell = { id: string; label: string; color?: string; x: number; y: number; width: number; height: number };

interface CanvasGridProps {
  canvasWidth: number;
  canvasHeight: number;
  layout: GridLayout;
  columns: number;
  rows: number;
  gridVisible: boolean;
  cells: GridCell[];
  activeCell: string | null;
  onLayoutChange: (layout: GridLayout) => void;
  onColumnsChange: (columns: number) => void;
  onRowsChange: (rows: number) => void;
  onCellCreate: (cell: GridCell) => void;
  onCellUpdate: (id: string, updates: Partial<GridCell>) => void;
  onCellDelete: (id: string) => void;
  onCellSelect: (id: string | null) => void;
}

const CanvasGrid: React.FC<CanvasGridProps> = ({
  canvasWidth,
  canvasHeight,
  layout,
  columns,
  rows,
  gridVisible,
  cells,
  activeCell,
  onLayoutChange,
  onColumnsChange,
  onRowsChange,
  onCellCreate,
  onCellUpdate,
  onCellDelete,
  onCellSelect
}) => {
  // Calculate grid lines based on layout
  const renderGridLines = () => {
    if (!gridVisible) return null;
    
    const lines = [];
    
    if (layout === 'quarters') {
      // Horizontal middle line
      lines.push(
        <div 
          key="h-middle"
          className="absolute bg-accent-blue/30" 
          style={{
            left: 0,
            top: '50%',
            width: '100%',
            height: '2px',
            transform: 'translateY(-1px)'
          }}
        />
      );
      
      // Vertical middle line
      lines.push(
        <div 
          key="v-middle"
          className="absolute bg-accent-blue/30" 
          style={{
            left: '50%',
            top: 0,
            width: '2px',
            height: '100%',
            transform: 'translateX(-1px)'
          }}
        />
      );
    } else if (layout === 'columns') {
      // Vertical lines for columns
      for (let i = 1; i < columns; i++) {
        const position = (i / columns) * 100;
        lines.push(
          <div 
            key={`col-${i}`}
            className="absolute bg-accent-blue/30" 
            style={{
              left: `${position}%`,
              top: 0,
              width: '2px',
              height: '100%',
              transform: 'translateX(-1px)'
            }}
          />
        );
      }
    } else if (layout === 'rows') {
      // Horizontal lines for rows
      for (let i = 1; i < rows; i++) {
        const position = (i / rows) * 100;
        lines.push(
          <div 
            key={`row-${i}`}
            className="absolute bg-accent-blue/30" 
            style={{
              left: 0,
              top: `${position}%`,
              width: '100%',
              height: '2px',
              transform: 'translateY(-1px)'
            }}
          />
        );
      }
    } else if (layout === 'custom') {
      // For custom layout, we'll render the cell boundaries
      return null;
    }
    
    return lines;
  };
  
  // Render the cells
  const renderCells = () => {
    if (!gridVisible || layout === 'none') return null;
    
    return cells.map(cell => (
      <div
        key={cell.id}
        className={`absolute border-2 ${
          cell.id === activeCell 
            ? 'border-accent-green' 
            : 'border-accent-blue/20'
        } rounded-md transition-colors cursor-pointer`}
        style={{
          left: cell.x,
          top: cell.y,
          width: cell.width,
          height: cell.height,
          backgroundColor: cell.color ? `${cell.color}10` : 'transparent'
        }}
        onClick={() => onCellSelect(cell.id)}
      >
        {/* Cell label */}
        <div 
          className="absolute top-2 left-2 text-xs font-medium px-2 py-1 rounded bg-black/30"
          style={{ color: cell.color || 'var(--text-primary)' }}
        >
          {cell.label}
        </div>
      </div>
    ));
  };
  
  // Generate standard cells based on layout
  const generateStandardCells = () => {
    const newCells: GridCell[] = [];
    let id = 1;
    
    if (layout === 'quarters') {
      // Top-left
      newCells.push({
        id: `cell-${id++}`,
        label: 'Top Left',
        color: 'var(--accent-blue)',
        x: 0,
        y: 0,
        width: canvasWidth / 2,
        height: canvasHeight / 2
      });
      
      // Top-right
      newCells.push({
        id: `cell-${id++}`,
        label: 'Top Right',
        color: 'var(--accent-green)',
        x: canvasWidth / 2,
        y: 0,
        width: canvasWidth / 2,
        height: canvasHeight / 2
      });
      
      // Bottom-left
      newCells.push({
        id: `cell-${id++}`,
        label: 'Bottom Left',
        color: 'var(--accent-yellow)',
        x: 0,
        y: canvasHeight / 2,
        width: canvasWidth / 2,
        height: canvasHeight / 2
      });
      
      // Bottom-right
      newCells.push({
        id: `cell-${id++}`,
        label: 'Bottom Right',
        color: 'var(--accent-pink)',
        x: canvasWidth / 2,
        y: canvasHeight / 2,
        width: canvasWidth / 2,
        height: canvasHeight / 2
      });
    } else if (layout === 'columns') {
      const columnWidth = canvasWidth / columns;
      
      for (let i = 0; i < columns; i++) {
        newCells.push({
          id: `cell-${id++}`,
          label: `Column ${i + 1}`,
          color: `var(--accent-${i % 2 === 0 ? 'blue' : 'green'})`,
          x: i * columnWidth,
          y: 0,
          width: columnWidth,
          height: canvasHeight
        });
      }
    } else if (layout === 'rows') {
      const rowHeight = canvasHeight / rows;
      
      for (let i = 0; i < rows; i++) {
        newCells.push({
          id: `cell-${id++}`,
          label: `Row ${i + 1}`,
          color: `var(--accent-${i % 2 === 0 ? 'blue' : 'yellow'})`,
          x: 0,
          y: i * rowHeight,
          width: canvasWidth,
          height: rowHeight
        });
      }
    }
    
    // Apply the cells - in a real implementation you'd want to avoid wiping existing cells
    newCells.forEach(cell => onCellCreate(cell));
  };
  
  return (
    <>
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {renderGridLines()}
        {renderCells()}
      </div>
      
      {/* Grid Controls */}
      {gridVisible && (
        <div className="absolute top-4 left-4 p-2 bg-card-bg border border-border-light rounded-md shadow-lg z-10">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium mb-1 text-text-primary">Canvas Organization</div>
            
            <div className="flex gap-2">
              <button
                className={`p-2 rounded ${layout === 'none' ? 'bg-accent-blue text-white' : 'bg-node-bg hover:bg-node-bg/80 text-text-primary'}`}
                onClick={() => onLayoutChange('none')}
                title="No grid"
              >
                <Square size={16} />
              </button>
              <button
                className={`p-2 rounded ${layout === 'quarters' ? 'bg-accent-blue text-white' : 'bg-node-bg hover:bg-node-bg/80 text-text-primary'}`}
                onClick={() => { 
                  onLayoutChange('quarters');
                  generateStandardCells();
                }}
                title="Quarter grid"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`p-2 rounded ${layout === 'columns' ? 'bg-accent-blue text-white' : 'bg-node-bg hover:bg-node-bg/80 text-text-primary'}`}
                onClick={() => {
                  onLayoutChange('columns');
                  generateStandardCells();
                }}
                title="Column grid"
              >
                <Columns size={16} />
              </button>
              <button
                className={`p-2 rounded ${layout === 'rows' ? 'bg-accent-blue text-white' : 'bg-node-bg hover:bg-node-bg/80 text-text-primary'}`}
                onClick={() => {
                  onLayoutChange('rows');
                  generateStandardCells();
                }}
                title="Row grid"
              >
                <Rows size={16} />
              </button>
            </div>
            
            {(layout === 'columns' || layout === 'rows') && (
              <div className="mt-2">
                <div className="text-xs text-text-secondary mb-1">
                  {layout === 'columns' ? 'Columns' : 'Rows'}: {layout === 'columns' ? columns : rows}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 rounded bg-node-bg hover:bg-node-bg/80 text-text-primary"
                    onClick={() => {
                      if (layout === 'columns') {
                        onColumnsChange(Math.max(1, columns - 1));
                      } else {
                        onRowsChange(Math.max(1, rows - 1));
                      }
                    }}
                    disabled={(layout === 'columns' && columns === 1) || (layout === 'rows' && rows === 1)}
                  >
                    <Minus size={14} />
                  </button>
                  
                  <div className="flex-1 h-2 bg-node-bg rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent-blue rounded-full"
                      style={{ 
                        width: `${layout === 'columns' ? (columns / 6) * 100 : (rows / 6) * 100}%` 
                      }}
                    ></div>
                  </div>
                  
                  <button
                    className="p-1 rounded bg-node-bg hover:bg-node-bg/80 text-text-primary"
                    onClick={() => {
                      if (layout === 'columns') {
                        onColumnsChange(Math.min(6, columns + 1));
                      } else {
                        onRowsChange(Math.min(6, rows + 1));
                      }
                    }}
                    disabled={(layout === 'columns' && columns === 6) || (layout === 'rows' && rows === 6)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CanvasGrid; 