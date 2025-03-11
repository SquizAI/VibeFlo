import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Note as NoteType, Position, Task, CategoryColorMap, Comment as NoteComment, Label, Attachment } from '../types';
import {
  GripHorizontal, CheckSquare, Square, Trash2, Check, Calendar, Clock,
  Flag, Paperclip, MessageSquare, Tag, ChevronDown, ChevronUp, ChevronRight, Bell,
  Palette, Maximize2, X, Plus, Edit
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { XYCoord } from 'react-dnd';
import update from 'immutability-helper';
import AutoLabelSuggestion from './AutoLabel';

interface NoteProps {
  note: NoteType;
  onMove: (id: string, newPosition: Position) => void;
  onContentChange: (id: string, content: string) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onResize?: (id: string, size: { width: number, height: number }) => void;
  categoryColors?: CategoryColorMap;
  onUpdateNote?: (id: string, updates: Partial<NoteType>) => void;
  onDeleteNote?: (id: string) => void;
  isEnlarged?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  onPinNote?: (id: string) => void;
  onStartDrag?: (id: string) => void;
  onStartResize?: (id: string) => void;
  onEndDrag?: (id: string) => void;
  onEndResize?: (id: string) => void;
  containerWidth?: number;
  containerHeight?: number;
  displayMode?: string;
  onAddTag?: (id: string, tag: string) => void;
  onRemoveTag?: (id: string, tagId: string) => void;
  onNoteRef?: (ref: HTMLDivElement) => void;
}

const colorClasses = {
  blue: 'bg-card-bg border-accent-blue text-text-primary hover:bg-card-hover border shadow-glow-blue',
  green: 'bg-card-bg border-accent-green text-text-primary hover:bg-card-hover border shadow-glow-green',
  pink: 'bg-card-bg border-accent-pink text-text-primary hover:bg-card-hover border shadow-glow-pink',
  yellow: 'bg-card-bg border-accent-yellow text-text-primary hover:bg-card-hover border shadow-glow-yellow',
  purple: 'bg-card-bg border-accent-purple text-text-primary hover:bg-card-hover border shadow-glow-purple',
  orange: 'bg-card-bg border-accent-orange text-text-primary hover:bg-card-hover border shadow-glow-orange',
  teal: 'bg-card-bg border-accent-teal text-text-primary hover:bg-card-hover border shadow-glow-teal',
  red: 'bg-card-bg border-accent-red text-text-primary hover:bg-card-hover border shadow-glow-red',
  indigo: 'bg-card-bg border-accent-indigo text-text-primary hover:bg-card-hover border shadow-glow-indigo',
  amber: 'bg-card-bg border-accent-amber text-text-primary hover:bg-card-hover border shadow-glow-amber',
  emerald: 'bg-card-bg border-accent-emerald text-text-primary hover:bg-card-hover border shadow-glow-emerald',
  rose: 'bg-card-bg border-accent-rose text-text-primary hover:bg-card-hover border shadow-glow-rose'
};

// Color mapping for legacy notes
const colorMapping = {
  cyan: 'blue',
  violet: 'pink',
  fuchsia: 'pink',
  rose: 'yellow',
};

// Add a performance throttle function at the top of the file
function throttle(callback: Function, delay: number) {
  let lastCall = 0;
  return function(...args: any[]) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      callback(...args);
    }
  };
}

// Add TaskItem component for drag and drop functionality
interface TaskItemProps {
  id: string;
  index: number;
  task: Task;
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  categoryColors: CategoryColorMap;
  onDoubleClick?: (e: React.MouseEvent) => void;
  customRender?: React.ReactNode;
}

const TaskItem: React.FC<TaskItemProps> = ({ 
  id, 
  index, 
  task, 
  moveTask, 
  onTaskUpdate,
  onTaskDelete,
  categoryColors,
  onDoubleClick,
  customRender
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: () => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [, drop] = useDrop({
    accept: 'TASK',
    hover(item: { id: string; index: number }, monitor) {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;
      
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      
      // Only perform the move when the mouse has crossed half of the item's height
      
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      
      // Time to actually perform the action
      moveTask(dragIndex, hoverIndex);
      
      // Note: we're mutating the monitor item here!
      item.index = hoverIndex;
    },
  });
  
  // Initialize drag and drop
  drag(drop(ref));
  
  // Set category color
  const categoryColor = task.category && categoryColors?.[task.category] 
    ? categoryColors[task.category] 
    : 'gray';
    
  return (
    <div 
      ref={ref} 
      className={`task-item ${isDragging ? 'dragging' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={onDoubleClick}
    >
      <div className="task-item-handle">
        <GripHorizontal size={16} className="text-text-secondary cursor-grab" />
      </div>
      
      <div className="task-item-content">
        <div className="task-checkbox-wrapper">
          <div
            className="task-checkbox"
            onClick={(e) => {
              e.stopPropagation();
              onTaskUpdate(task.id, { done: !task.done });
            }}
          >
            {task.done ? <CheckSquare size={16} /> : <Square size={16} />}
          </div>
        </div>
        
        <div className={`task-text ${task.done ? 'completed' : ''}`}>
          <div className="task-text-content" onClick={(e) => {
            e.stopPropagation();
            onTaskUpdate(task.id, { done: !task.done });
          }}>
            {task.text}
          </div>
          
          {task.category && (
            <div 
              className="task-category" 
              style={{ 
                backgroundColor: `var(--accent-${categoryColor})20`,
                color: `var(--accent-${categoryColor})`
              }}
            >
              {task.category}
            </div>
          )}
        </div>
        
        <button 
          className="task-delete-button" 
          onClick={(e) => {
            e.stopPropagation();
            onTaskDelete(task.id);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {customRender && (
        <div className="task-edit-input-wrapper" onClick={(e) => e.stopPropagation()}>
          {customRender}
        </div>
      )}
    </div>
  );
};

// Add AI tooltip component
interface AiTooltipProps {
  forTask?: boolean;
  onSuggestionAccept: (suggestion: string) => void;
}

const AiTooltip: React.FC<AiTooltipProps> = ({ forTask = false, onSuggestionAccept }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Generate AI suggestions based on note content
  const generateSuggestions = async () => {
    setIsLoading(true);
    
    try {
      // In a real implementation, this would call your AI API
      // For now, we'll use a more sophisticated mock implementation
      
      // Generate mock content for suggestions without referencing props
      const contentToAnalyze = forTask 
        ? "Project management tasks and deadlines" 
        : "Project development notes and ideas";
      
      // Keywords to help categorize the content
      const projectKeywords = ["project", "plan", "timeline", "milestone", "deadline", "meeting"];
      const designKeywords = ["design", "ui", "ux", "wireframe", "mockup", "layout", "interface"];
      const developmentKeywords = ["code", "develop", "implementation", "feature", "bug", "test"];
      const marketingKeywords = ["marketing", "launch", "promotion", "social media", "content"];
      
      // Determine the likely category based on content
      const lowerContent = contentToAnalyze.toLowerCase();
      let category = "general";
      
      if (projectKeywords.some(word => lowerContent.includes(word))) {
        category = "project";
      } else if (designKeywords.some(word => lowerContent.includes(word))) {
        category = "design";
      } else if (developmentKeywords.some(word => lowerContent.includes(word))) {
        category = "development";
      } else if (marketingKeywords.some(word => lowerContent.includes(word))) {
        category = "marketing";
      }
      
      // Generate contextually relevant suggestions
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      if (forTask) {
        // Task suggestions based on category
        const suggestions = {
          project: [
            "Schedule kickoff meeting with stakeholders",
            "Create detailed project timeline with milestones",
            "Set up weekly status update meetings",
            "Define project success metrics and KPIs",
            "Prepare risk assessment document"
          ],
          design: [
            "Create user personas for target audience",
            "Design wireframes for mobile and desktop views",
            "Conduct user testing on initial prototypes",
            "Define design system and component library",
            "Prepare assets for developer handoff"
          ],
          development: [
            "Set up development environment and repository",
            "Implement authentication system",
            "Create database schema and migrations",
            "Write unit tests for core functionality",
            "Configure CI/CD pipeline for automated deployments"
          ],
          marketing: [
            "Draft content calendar for product launch",
            "Design email campaign for existing customers",
            "Create social media announcement graphics",
            "Prepare press release for launch day",
            "Set up analytics to track campaign performance"
          ],
          general: [
            "Define next steps and priorities",
            "Schedule follow-up meeting to review progress",
            "Research potential solutions to current challenges",
            "Document decisions and actionable items",
            "Create checklist for completion verification"
          ]
        };
        
        setSuggestions(suggestions[category as keyof typeof suggestions]);
        console.log("Generated task suggestions for category:", category);
      } else {
        // Brainstorming suggestions based on category
        const suggestions = {
          project: [
            "Project Timeline and Milestones",
            "Resource Allocation Plan",
            "Stakeholder Communication Strategy",
            "Risk Management Framework",
            "Quality Assurance Methodology"
          ],
          design: [
            "User Journey Maps",
            "Design System Components",
            "Accessibility Considerations",
            "Visual Design Principles",
            "Animation and Interaction Specifications"
          ],
          development: [
            "Technical Architecture Overview",
            "API Design and Documentation",
            "Performance Optimization Strategies",
            "Security Implementation Plan",
            "Version Control and Branching Strategy"
          ],
          marketing: [
            "Target Audience Analysis",
            "Channel Strategy Breakdown",
            "Content Creation Guidelines",
            "Launch Campaign Timeline",
            "Success Metrics and Analytics Plan"
          ],
          general: [
            "Goals and Objectives Section",
            "Research Findings Overview",
            "Next Steps and Action Items",
            "Decision Log and Rationale",
            "Open Questions and Dependencies"
          ]
        };
        
        setSuggestions(suggestions[category as keyof typeof suggestions]);
        console.log("Generated note suggestions for category:", category);
      }
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      setSuggestions(["Failed to generate suggestions. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleOpen = () => {
    setIsOpen(prev => !prev);
    if (!isOpen && suggestions.length === 0) {
      generateSuggestions();
    }
  };
  
  return (
    <div className="ai-tooltip-container">
      <button 
        className="ai-tooltip-trigger"
        onClick={toggleOpen}
        title={forTask ? "Get AI task suggestions" : "Get AI brainstorming help"}
      >
        <span className="ai-icon">✨</span>
        <span className="ai-label">{forTask ? "Suggest Tasks" : "Brainstorm"}</span>
      </button>
      
      {isOpen && (
        <div className="ai-tooltip-content">
          <div className="ai-tooltip-header">
            <h4>{forTask ? "Suggested Tasks" : "Brainstorming Ideas"}</h4>
            <button onClick={() => setIsOpen(false)} className="ai-tooltip-close">×</button>
          </div>
          
          <div className="ai-tooltip-body">
            {isLoading ? (
              <div className="ai-loading">Generating suggestions...</div>
            ) : (
              <ul className="ai-suggestion-list">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="ai-suggestion-item">
                    <span>{suggestion}</span>
                    <button 
                      className="ai-use-suggestion"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSuggestionAccept(suggestion);
                        setIsOpen(false);
                      }}
                    >
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="ai-tooltip-footer">
            <button 
              className="ai-refresh-button"
              onClick={generateSuggestions}
              disabled={isLoading}
            >
              Refresh Suggestions
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Update the EditableTask component to support subtasks
interface EditableTaskProps {
  task: Task;
  index: number;
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onAddSubtask?: (parentId: string) => void;
  categoryColors?: CategoryColorMap;
  depth?: number;
}

const EditableTask: React.FC<EditableTaskProps> = ({
  task,
  index,
  moveTask,
  onTaskUpdate,
  onTaskDelete,
  onAddSubtask,
  categoryColors = {}, // Provide default empty object
  depth = 0
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [taskText, setTaskText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  
  // Add state for toggling subtasks visibility
  const [isExpanded, setIsExpanded] = useState(task.isExpanded !== false);
  
  // Update task expansion state when it changes
  useEffect(() => {
    if (task.isExpanded !== undefined && task.isExpanded !== isExpanded) {
      setIsExpanded(task.isExpanded);
    }
  }, [task.isExpanded]);
  
  // Initialize drag and drop
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: () => ({ id: task.id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [, drop] = useDrop({
    accept: 'TASK',
    hover(item: { id: string; index: number }, monitor) {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;
      
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      
      // Only perform the move when the mouse has crossed half of the item's height
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      
      // Time to actually perform the action
      moveTask(dragIndex, hoverIndex);
      
      // Note: we're mutating the monitor item here!
      item.index = hoverIndex;
    },
  });
  
  // Connect drag and drop refs
  drag(drop(ref));
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  
  // Handle double click to start editing
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };
  
  // Save edits on blur or Enter key
  const saveEdit = () => {
    if (taskText.trim() !== task.text) {
      onTaskUpdate(task.id, { text: taskText.trim() });
    }
    setIsEditing(false);
  };
  
  // Handle key events for save or cancel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setTaskText(task.text); // Reset to original
      setIsEditing(false);
    }
  };
  
  // Handle toggling subtask visibility
  const toggleSubtasks = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Update local state
    setIsExpanded(!isExpanded);
    
    // Update task state
    onTaskUpdate(task.id, { isExpanded: !isExpanded });
  };
  
  // Handle adding a subtask
  const handleAddSubtask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddSubtask) {
      onAddSubtask(task.id);
    }
  };
  
  // Set category color
  const categoryColor = task.category && categoryColors?.[task.category] 
    ? categoryColors[task.category] 
    : 'gray';
  
  // Check if this task has subtasks
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  
  return (
    <div>
      <div 
        ref={ref} 
        className={`task-item ${isDragging ? 'dragging' : ''} ${hasSubtasks ? 'has-subtasks' : ''}`}
        style={{ 
          opacity: isDragging ? 0.5 : 1,
          marginLeft: `${depth * 16}px` // Indent based on depth
        }}
      >
        {/* Toggle button for subtasks, only if subtasks exist */}
        {hasSubtasks && (
          <button 
            className="subtask-toggle"
            onClick={toggleSubtasks}
            title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
        
        <div className="task-item-handle">
          <GripHorizontal size={16} className="text-text-secondary cursor-grab" />
        </div>
        
        <div className="task-item-content">
          {/* Show category above task text */}
          {task.category && !isEditing && (
            <div 
              className="task-category" 
              style={{ 
                backgroundColor: `var(--accent-${categoryColor})20`,
                color: `var(--accent-${categoryColor})`
              }}
            >
              {task.category}
            </div>
          )}
          
          <div className="task-checkbox-wrapper">
            <div
              className="task-checkbox"
              onClick={(e) => {
                e.stopPropagation();
                onTaskUpdate(task.id, { done: !task.done });
              }}
            >
              {task.done ? <CheckSquare size={16} /> : <Square size={16} />}
            </div>
          </div>
          
          <div className={`task-text ${task.done ? 'completed' : ''}`}>
            {isEditing ? (
              <div className="task-inline-edit" onClick={e => e.stopPropagation()}>
                <input
                  ref={inputRef}
                  className="task-edit-input"
                  value={taskText}
                  onChange={e => setTaskText(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={handleKeyDown}
                  data-testid={`task-edit-input-${task.id}`}
                />
              </div>
            ) : (
              <div 
                className="task-text-content" 
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskUpdate(task.id, { done: !task.done });
                }}
                onDoubleClick={handleDoubleClick}
              >
                {task.text}
              </div>
            )}
          </div>
          
          <button 
            className="task-delete-button" 
            onClick={(e) => {
              e.stopPropagation();
              onTaskDelete(task.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {/* Render subtasks if they exist and are expanded */}
      {hasSubtasks && isExpanded && (
        <div className="subtasks-container">
          {task.subtasks?.map((subtask, subtaskIndex) => (
            <EditableTask
              key={subtask.id}
              task={subtask}
              index={subtaskIndex}
              moveTask={moveTask}
              onTaskUpdate={onTaskUpdate}
              onTaskDelete={onTaskDelete}
              onAddSubtask={onAddSubtask}
              categoryColors={categoryColors}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
      
      {/* Add subtask button */}
      {isExpanded && (
        <button 
          className="add-subtask-button"
          onClick={handleAddSubtask}
        >
          <Plus size={12} />
          <span>Add subtask</span>
        </button>
      )}
    </div>
  );
};

// Add a utility for auto-labeling

// Common categories for auto-labeling with associated colors
const AUTO_LABEL_CATEGORIES = [
  { name: 'Work', keywords: ['work', 'job', 'project', 'meeting', 'deadline', 'client', 'report'], color: '#3b82f6' },
  { name: 'Personal', keywords: ['family', 'home', 'personal', 'life', 'birthday', 'anniversary'], color: '#ec4899' },
];

export function Note({ 
  note, 
  onMove, 
  onContentChange, 
  isSelectable = false, 
  isSelected = false, 
  onSelect,
  onResize,
  categoryColors,
  onUpdateNote,
  onDeleteNote,
  isEnlarged = false,
  isDragging,
  isResizing,
  onPinNote,
  onStartDrag,
  onStartResize,
  onEndDrag,
  onEndResize,
  containerWidth,
  containerHeight,
  displayMode,
  onAddTag,
  onRemoveTag,
  onNoteRef
}: NoteProps) {
  const [isDraggingThis, setIsDraggingThis] = useState(false);
  
  // Fix the nodeRef definition to use a callback ref approach
  // Create ref for direct DOM manipulation during dragging
  const nodeRef = useRef<HTMLDivElement | null>(null);
  
  // Keep track of where in the note the user initially clicked
  const mouseOffsetRef = useRef({ x: 0, y: 0 });
  
  // Store current position for smoother updates
  const currentPositionRef = useRef(note.position);
  
  // Reference for the note's current size
  const currentSizeRef = useRef(note.size || { width: 300, height: 200 });
  
  // Add state for resize direction
  const [resizeDirection, setResizeDirection] = useState<'none' | 'right' | 'bottom' | 'corner'>('none');
  
  // Add state for local enlarged status control when the prop isn't provided
  const [localEnlarged, setLocalEnlarged] = useState(false);
  
  // Use either the controlled or uncontrolled enlarged state
  const noteIsEnlarged = isEnlarged || localEnlarged;
  
  // State for editing the content
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(note.content);
  
  // Update editedContent when note content changes
  useEffect(() => {
    setEditedContent(note.content);
  }, [note.content]);
  
  // Update position reference when note position changes
  useEffect(() => {
    currentPositionRef.current = note.position;
  }, [note.position]);
  
  // Update size reference when note size changes
  useEffect(() => {
    if (note.size) {
      currentSizeRef.current = note.size;
    }
  }, [note.size]);

  const {
    toggleTask, deleteNote, completeNote, addComment, addLabel,
    addAttachment, setDueDate, setPriority, setAssignee,
    toggleExpanded, setReminder, updateNote, settings, updateLabel, removeLabel,
    updateAttachment, removeAttachment, updateComment, removeComment
  } = useNoteStore();
  
  // Get color mappings from settings
  const { categoryColors: storeCategoryColors } = settings;
  
  // Merge provided categoryColors with store categoryColors
  const effectiveCategoryColors = {...storeCategoryColors, ...categoryColors};

  const [showColorPicker, setShowColorPicker] = useState(false);

  // Map old color names to new ones
  const noteColor = note.color in colorMapping 
    ? colorMapping[note.color as keyof typeof colorMapping] 
    : (note.color in colorClasses ? note.color : 'blue');

  // Restore the mouse handling functions for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Skip if clicking buttons, tasks, or in selection mode or editable fields
    if (
      e.button !== 0 || // Only handle left clicks
      isSelectable || // Skip in selection mode
      isEditing || // Skip when editing
      (e.target as HTMLElement).closest('.task-item') || // Skip if clicking a task
      (e.target as HTMLElement).closest('button') || // Skip if clicking a button
      (e.target as HTMLElement).tagName === 'TEXTAREA' || // Skip if clicking textarea
      (e.target as HTMLElement).tagName === 'INPUT' // Skip if clicking input
    ) {
      return;
    }
    
    e.stopPropagation();
    
    // Set dragging state
    setIsDraggingThis(true);
    
    // Calculate correct mouse offset from the note's corner
    if (nodeRef.current) {
      const noteRect = nodeRef.current.getBoundingClientRect();
      mouseOffsetRef.current = {
        x: e.clientX - noteRect.left,
        y: e.clientY - noteRect.top
      };
      
      // Store current position
      currentPositionRef.current = { ...note.position };
    }
    
    // Add global event listeners
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    // Disable transitions while dragging for smoothness
    if (nodeRef.current) {
      nodeRef.current.style.transition = 'none';
    }
  };
  
  // Global mouse move function
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingThis) return;
    
    // Get transformation values from the canvas if possible
    const transformContainer = document.querySelector('.react-transform-component');
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    
    if (transformContainer) {
      // Try to get transformation values from the transform style
      const transform = window.getComputedStyle(transformContainer).transform;
      if (transform && transform !== 'none') {
        const matrix = new DOMMatrixReadOnly(transform);
        scale = matrix.a || 1; // The 'a' value in the matrix is the x scale
        // Matrix values e and f are translation in pixels
        offsetX = matrix.e || 0;
        offsetY = matrix.f || 0;
      }
    }
    
    // Calculate new position, adjusting for cursor position, scale, and pan offset
    // Divide clientX/Y by scale to account for zoom level
    const newX = ((e.clientX - offsetX) / scale) - mouseOffsetRef.current.x;
    const newY = ((e.clientY - offsetY) / scale) - mouseOffsetRef.current.y;
    
    // Apply directly to DOM for smooth movement
    if (nodeRef.current) {
      // Use left/top for more reliable positioning
      nodeRef.current.style.left = `${newX}px`;
      nodeRef.current.style.top = `${newY}px`;
    }
    
    // Store the current position to update state on mouse up
    currentPositionRef.current = { x: newX, y: newY };
  }, [isDraggingThis]);
  
  // Global mouse up function
  const handleGlobalMouseUp = useCallback(() => {
    if (!isDraggingThis) return;
    
    // Update the actual state with the final position
    if (onMove) {
      onMove(note.id, currentPositionRef.current);
    }
    
    // Reset dragging state
    setIsDraggingThis(false);
    
    // Re-enable transitions
    if (nodeRef.current) {
      nodeRef.current.style.transition = '';
    }
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDraggingThis, note.id, onMove]);
  
  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);
  
  // Save content changes
  const handleContentBlur = () => {
    if (editedContent !== note.content) {
      onContentChange(note.id, editedContent);
    }
    setIsEditing(false);
  };
  
  // Update editedContent while typing
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
  };
  
  // Start editing content on double click
  const handleContentDoubleClick = (e: React.MouseEvent) => {
    if (isSelectable) return; // Don't enter edit mode in selection mode
    e.stopPropagation();
    setIsEditing(true);
  };
  
  // Add a function to add a new task
  const handleAddTask = () => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: "New task",
      done: false,
      category: "General"
    };
    
    const updatedTasks = [...(note.tasks || []), newTask];
    
    // Update the note with new tasks
    const updatedNote = {
      ...note,
      tasks: updatedTasks,
      type: 'task' // Ensure note is a task type
    } as NoteType; // Type assertion to fix compatibility issue
    
    // Update through props or store
    if (onUpdateNote) {
      onUpdateNote(note.id, { tasks: updatedTasks, type: 'task' });
    } else {
      updateNote(note.id, updatedNote);
    }
  };
  
  // Add function to handle adding a subtask
  const handleAddSubtask = (parentId: string) => {
    if (!note.tasks) return;
    
    // Find the parent task
    const findTaskAndAddSubtask = (tasks: Task[], parentId: string): Task[] => {
      return tasks.map(task => {
        if (task.id === parentId) {
          // Add subtask to this task
          const newSubtask: Task = {
            id: crypto.randomUUID(),
            text: "New subtask",
            done: false,
            category: task.category, // Inherit category from parent
            parentId: task.id,
            depth: (task.depth || 0) + 1
          };
          
          return {
            ...task,
            subtasks: [...(task.subtasks || []), newSubtask],
            isExpanded: true // Expand to show the new subtask
          };
        } else if (task.subtasks && task.subtasks.length > 0) {
          // Recursively search subtasks
          return {
            ...task,
            subtasks: findTaskAndAddSubtask(task.subtasks, parentId)
          };
        }
        return task;
      });
    };
    
    const updatedTasks = findTaskAndAddSubtask(note.tasks, parentId);
    
    // Update the note with the modified tasks
    if (onUpdateNote) {
      onUpdateNote(note.id, { tasks: updatedTasks });
    } else {
      updateNote(note.id, { tasks: updatedTasks });
    }
  };
  
  // Function to handle task reordering via drag and drop
  const moveTask = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      if (!note.tasks) return;
      
      const draggedTask = note.tasks[dragIndex];
      
      // Create a new array with the tasks in the new order
      const updatedTasks = update(note.tasks, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, draggedTask],
        ],
      });
      
      // Update the note with the new task order
      if (onUpdateNote) {
        onUpdateNote(note.id, { tasks: updatedTasks });
      } else {
        updateNote(note.id, { tasks: updatedTasks });
      }
    },
    [note.tasks, note.id, onUpdateNote, updateNote]
  );
  
  // Update the task update function
  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    if (!note.tasks) return;
    
    // Function to recursively find and update a task or subtask
    const findAndUpdateTask = (tasks: Task[], taskId: string, updates: Partial<Task>): Task[] => {
      return tasks.map(task => {
        if (task.id === taskId) {
          // Update this task
          return { ...task, ...updates };
        } else if (task.subtasks && task.subtasks.length > 0) {
          // Recursively search subtasks
          return {
            ...task,
            subtasks: findAndUpdateTask(task.subtasks, taskId, updates)
          };
        }
        return task;
      });
    };
    
    const updatedTasks = findAndUpdateTask(note.tasks, taskId, updates);
    
    // Update the note with the modified tasks
    if (onUpdateNote) {
      onUpdateNote(note.id, { tasks: updatedTasks });
    } else {
      updateNote(note.id, { tasks: updatedTasks });
    }
  };
  
  // Update task deletion to handle subtasks
  const handleTaskDelete = (taskId: string) => {
    if (!note.tasks) return;
    
    // Function to recursively find and delete a task or subtask
    const findAndDeleteTask = (tasks: Task[], taskId: string): Task[] => {
      // Filter out the task to be deleted at this level
      const filteredTasks = tasks.filter(task => task.id !== taskId);
      
      // For remaining tasks, process their subtasks
      return filteredTasks.map(task => {
        if (task.subtasks && task.subtasks.length > 0) {
          return {
            ...task,
            subtasks: findAndDeleteTask(task.subtasks, taskId)
          };
        }
        return task;
      });
    };
    
    const updatedTasks = findAndDeleteTask(note.tasks, taskId);
    
    // Update the note with the modified tasks
    if (onUpdateNote) {
      onUpdateNote(note.id, { tasks: updatedTasks });
    } else {
      updateNote(note.id, { tasks: updatedTasks });
    }
  };
  
  // Handle inline task text editing
  const handleTaskTextEdit = (taskId: string, newText: string) => {
    handleTaskUpdate(taskId, { text: newText } as Partial<Task>);
  };
  
  // Handle selection click
  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isSelectable && onSelect) {
      onSelect(note.id);
    }
  };
  
  // Add function to handle AI task suggestions
  const handleTaskSuggestion = (suggestion: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: suggestion,
      done: false,
      category: 'AI Suggested'
    };
    
    const updatedTasks = [...(note.tasks || []), newTask];
    
    const updatedNote = {
      ...note,
      tasks: updatedTasks
    };
    
    onContentChange(note.id, updatedNote.content);
  };
  
  // Add function to handle AI brainstorming suggestions
  const handleBrainstormSuggestion = (suggestion: string) => {
    const updatedContent = note.content + '\n\n' + suggestion;
    onContentChange(note.id, updatedContent);
  };
  
  // Now modify the renderTasks function to use our EditableTask component
  const renderTasks = () => {
    if (!note.tasks) return null;
    
    return (
      <div className="tasks-container">
        <div className="tasks-header">
          <h4>Tasks</h4>
          <div className="task-actions">
            <button
              onClick={handleAddTask}
              className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add task
            </button>
            <div className="ml-2">
              <AiTooltip forTask={true} onSuggestionAccept={handleTaskSuggestion} />
            </div>
          </div>
        </div>
        
        {note.tasks.length > 0 ? (
          <div className="tasks-list">
            {note.tasks.map((task, index) => (
              <EditableTask
                key={task.id}
                task={task}
                index={index}
                moveTask={moveTask}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onAddSubtask={handleAddSubtask}
                categoryColors={effectiveCategoryColors}
              />
            ))}
          </div>
        ) : (
          <div className="no-tasks-message">
            No tasks yet. Add tasks or get AI suggestions.
          </div>
        )}
      </div>
    );
  };

  // Add resize handler functions
  const handleResizeStart = (direction: 'right' | 'bottom' | 'corner', e: React.MouseEvent) => {
    e.stopPropagation();
    setResizeDirection(direction);
    
    if (onStartResize) {
      onStartResize(note.id);
    }
    
    // Add event listeners for resize
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (resizeDirection === 'none' || !nodeRef.current) return;
    
    const noteRect = nodeRef.current.getBoundingClientRect();
    
    // Get transformation values from the canvas if possible
    const transformContainer = document.querySelector('.react-transform-component');
    let scale = 1;
    
    if (transformContainer) {
      // Try to get transformation values from the transform style
      const transform = window.getComputedStyle(transformContainer).transform;
      if (transform && transform !== 'none') {
        const matrix = new DOMMatrixReadOnly(transform);
        scale = matrix.a || 1; // The 'a' value in the matrix is the x scale
      }
    }
    
    // Calculate new dimensions based on resize direction
    let newWidth = currentSizeRef.current.width;
    let newHeight = currentSizeRef.current.height;
    
    // Apply minimum size constraints
    const minWidth = 200;
    const minHeight = 150;
    
    if (resizeDirection === 'right' || resizeDirection === 'corner') {
      newWidth = Math.max(minWidth, (e.clientX - noteRect.left) / scale);
    }
    
    if (resizeDirection === 'bottom' || resizeDirection === 'corner') {
      newHeight = Math.max(minHeight, (e.clientY - noteRect.top) / scale);
    }
    
    // Update the element style directly for smooth resize
    nodeRef.current.style.width = `${newWidth}px`;
    nodeRef.current.style.height = `${newHeight}px`;
    
    // Update the current size reference
    currentSizeRef.current = { width: newWidth, height: newHeight };
  }, [resizeDirection]);
  
  const handleResizeEnd = useCallback(() => {
    if (resizeDirection === 'none') return;
    
    // Update the note size through props
    if (onResize) {
      onResize(note.id, currentSizeRef.current);
    }
    
    // Or update through updateNote if available
    if (onUpdateNote) {
      onUpdateNote(note.id, { size: currentSizeRef.current });
    }
    
    // Reset resize direction
    setResizeDirection('none');
    
    if (onEndResize) {
      onEndResize(note.id);
    }
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [resizeDirection, note.id, onResize, onUpdateNote, onEndResize]);
  
  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  return (
    <div
      ref={nodeRef}
      className={`note ${note.color} ${isSelected ? 'selected' : ''} ${isDraggingThis ? 'dragging' : ''} ${noteIsEnlarged ? 'enlarged' : ''}`}
      style={{
        left: `${note.position.x}px`,
        top: `${note.position.y}px`,
        width: note.size ? `${note.size.width}px` : undefined,
        height: note.size ? `${note.size.height}px` : undefined,
        zIndex: isDraggingThis ? 10 : undefined,
      }}
      data-note-id={`note-${note.id}`}
      onMouseDown={handleMouseDown}
      onClick={isSelectable ? handleSelectionClick : undefined}
    >
      <div
        className="p-3 cursor-grab flex items-center justify-between border-b border-white/10 gap-2"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 opacity-50" />
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Palette className="w-4 h-4" />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-2 p-2 bg-gray-900 rounded-lg shadow-xl border border-white/10 flex flex-wrap gap-2 w-40">
              {Object.keys(colorClasses).map((color) => (
                <button
                  key={`${note.id}-color-${color}`}
                  onClick={() => {
                    updateNote(note.id, { color });
                    setShowColorPicker(false);
                  }}
                  className={`w-6 h-6 rounded-full ${
                    color === 'blue' ? 'bg-accent-blue' :
                    color === 'green' ? 'bg-accent-green' :
                    color === 'pink' ? 'bg-accent-pink' :
                    color === 'yellow' ? 'bg-accent-yellow' :
                    color === 'purple' ? 'bg-accent-purple' :
                    color === 'orange' ? 'bg-accent-orange' :
                    color === 'teal' ? 'bg-accent-teal' :
                    color === 'red' ? 'bg-accent-red' :
                    color === 'indigo' ? 'bg-accent-indigo' :
                    color === 'amber' ? 'bg-accent-amber' :
                    color === 'emerald' ? 'bg-accent-emerald' :
                    'bg-accent-rose'
                  } ${noteColor === color ? 'ring-2 ring-white/80 ring-offset-1 ring-offset-gray-900' : 'hover:scale-110'} transition-transform`}
                  aria-label={`Set color to ${color}`}
                />
              ))}
            </div>
          )}
          {note.priority && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              note.priority === 'high' ? 'bg-rose-500/20 text-rose-300' :
              note.priority === 'medium' ? 'bg-amber-500/20 text-amber-300' :
              'bg-blue-500/20 text-blue-300'
            }`}>
              {note.priority}
            </span>
          )}
          {note.completed && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
              Completed
            </span>
          )}
          {note.dueDate && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              {new Date(note.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocalEnlarged(!noteIsEnlarged)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            aria-label={noteIsEnlarged ? "Shrink note" : "Enlarge note"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleExpanded(note.id)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {note.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {note.completed ? (
            <button
              onClick={() => updateNote(note.id, { completed: false })}
              className="p-1 hover:bg-white/10 rounded transition-colors text-green-400"
              aria-label="Uncomplete note"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => completeNote(note.id)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="Complete note"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => deleteNote(note.id)}
            className="p-1 hover:bg-white/10 rounded transition-colors text-rose-400 hover:text-rose-300"
            aria-label="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <textarea
        className={`w-full p-4 bg-transparent resize-none focus:outline-none ${
          note.completed ? 'opacity-75 line-through' : ''
        }`}
        placeholder="Write something..."
        value={note.content}
        onChange={(e) => {
          e.stopPropagation();
          onContentChange(note.id, e.target.value);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        rows={noteIsEnlarged ? 8 : 4}
      />
      {note.expanded && (
        <div className="p-4 border-t border-white/10 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="w-full flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => setDueDate(note.id, new Date().toISOString())}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-colors ${note.dueDate ? 'bg-amber-950/50 text-amber-300' : 'bg-white/5 hover:bg-white/10'}`}
            >
              <Calendar className="w-3 h-3" />
              {note.dueDate ? 'Change Due Date' : 'Add Due Date'}
            </button>
            <button
              onClick={() => {
                const nextPriority = !note.priority 
                  ? 'medium' 
                  : note.priority === 'low' 
                    ? 'medium' 
                    : note.priority === 'medium' 
                      ? 'high' 
                      : 'low';
                setPriority(note.id, nextPriority);
              }}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-colors ${
                note.priority 
                  ? note.priority === 'high' 
                    ? 'bg-rose-950/50 text-rose-300' 
                    : note.priority === 'medium' 
                      ? 'bg-amber-950/50 text-amber-300' 
                      : 'bg-blue-950/50 text-blue-300'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Flag className="w-3 h-3" />
              {note.priority ? `Priority: ${note.priority.charAt(0).toUpperCase() + note.priority.slice(1)}` : 'Set Priority'}
            </button>
            <button
              onClick={() => setReminder(note.id, new Date().toISOString())}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-colors ${note.reminder ? 'bg-purple-950/50 text-purple-300' : 'bg-white/5 hover:bg-white/10'}`}
            >
              <Bell className="w-3 h-3" />
              {note.reminder ? 'Change Reminder' : 'Set Reminder'}
            </button>
            <button
              onClick={() => addAttachment(note.id, {
                id: crypto.randomUUID(),
                type: 'link',
                url: '',
                title: 'New Attachment'
              })}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Paperclip className="w-3 h-3" />
              Attach
            </button>
            <button
              onClick={() => addLabel(note.id, {
                id: crypto.randomUUID(),
                name: 'New Label',
                color: '#6366f1'
              })}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Tag className="w-3 h-3" />
              Label
            </button>
            </div>
          </div>
          
          {/* Display metadata section */}
          <div className="space-y-2">
            {/* Display Due Date if set */}
            {note.dueDate && (
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <Calendar className="w-3 h-3" />
                <span>Due: {new Date(note.dueDate).toLocaleDateString(undefined, { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Create date picker or dialog for date selection
                    const newDate = prompt('Enter due date (YYYY-MM-DD):', 
                      note.dueDate ? new Date(note.dueDate).toISOString().split('T')[0] : '');
                    if (newDate) {
                      setDueDate(note.id, new Date(newDate).toISOString());
                    }
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDueDate(note.id, '');
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-rose-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Display Priority if set */}
            {note.priority && (
              <div className="flex items-center gap-2 text-xs" style={{
                color: note.priority === 'high' 
                  ? 'var(--accent-pink)' 
                  : note.priority === 'medium' 
                    ? 'var(--accent-yellow)' 
                    : 'var(--accent-blue)'
              }}>
                <Flag className="w-3 h-3" />
                <span>Priority: {note.priority.charAt(0).toUpperCase() + note.priority.slice(1)}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextPriority = note.priority === 'low' 
                      ? 'medium' 
                      : note.priority === 'medium' 
                        ? 'high' 
                        : 'low';
                    setPriority(note.id, nextPriority);
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPriority(note.id, undefined as any);
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-rose-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Display Reminder if set */}
            {note.reminder && (
              <div className="flex items-center gap-2 text-xs text-purple-300">
                <Bell className="w-3 h-3" />
                <span>Reminder: {new Date(note.reminder).toLocaleDateString(undefined, { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Create date picker or dialog for date selection
                    const newDate = prompt('Enter reminder date (YYYY-MM-DD):', 
                      note.reminder ? new Date(note.reminder).toISOString().split('T')[0] : '');
                    if (newDate) {
                      setReminder(note.id, new Date(newDate).toISOString());
                    }
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setReminder(note.id, '');
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-rose-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          
          {note.labels && note.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {note.labels.map(label => (
                <div
                  key={`${note.id}-label-${label.id}`}
                  className="flex items-center text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${label.color}30`, color: label.color }}
                >
                  <span>{label.name}</span>
                  <div className="flex ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newName = prompt('Edit label name:', label.name);
                        if (newName) {
                          updateLabel(note.id, label.id, { ...label, name: newName });
                        }
                      }}
                      className="ml-1 p-0.5 hover:bg-white/10 rounded-full"
                    >
                      <Edit className="w-2 h-2" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLabel(note.id, label.id);
                      }}
                      className="ml-1 p-0.5 hover:bg-white/10 rounded-full"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {note.attachments && note.attachments.length > 0 && (
            <div className="space-y-1 mb-2">
              {note.attachments.map(attachment => (
                <div
                  key={`${note.id}-attachment-${attachment.id}`}
                  className="flex items-center text-xs text-white/70 hover:text-white/90"
                >
                  <Paperclip className="w-3 h-3 mr-1" />
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate"
                    onClick={(e) => {
                      if (!attachment.url.trim()) {
                        e.preventDefault();
                        alert('This attachment has no URL. Please edit it first.');
                      }
                    }}
                  >
                    {attachment.title || 'Untitled Attachment'}
                  </a>
                  <div className="flex ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newTitle = prompt('Edit attachment title:', attachment.title);
                        if (newTitle !== null) { // Check for cancel button
                          const newUrl = prompt('Edit attachment URL (include http:// or https://):', attachment.url);
                          if (newUrl !== null) { // Check for cancel button
                            const updatedAttachment = {
                              id: attachment.id,
                              type: attachment.type as 'link' | 'image' | 'file',
                              title: newTitle,
                              url: newUrl
                            };
                            updateAttachment(note.id, attachment.id, updatedAttachment);
                          }
                        }
                      }}
                      className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <Edit className="w-2 h-2" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(note.id, attachment.id);
                      }}
                      className="ml-1 p-0.5 hover:bg-white/10 rounded text-rose-400 transition-colors"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {note.comments && note.comments.length > 0 && (
            <div className="space-y-2 mb-3">
              {note.comments.map(comment => (
                <div key={`${note.id}-comment-${comment.id}`} className="text-sm text-white/70 group">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    <span className="text-xs text-white/50">
                      {new Date(comment.timestamp).toLocaleString()}
                    </span>
                    <div className="flex ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newText = prompt('Edit comment:', comment.text);
                          if (newText !== null) {
                            const updatedComment: NoteComment = {
                              id: comment.id,
                              text: newText,
                              timestamp: comment.timestamp
                            };
                            updateComment(note.id, comment.id, updatedComment);
                          }
                        }}
                        className="p-0.5 hover:bg-white/10 rounded transition-colors"
                      >
                        <Edit className="w-2 h-2" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeComment(note.id, comment.id);
                        }}
                        className="p-0.5 hover:bg-white/10 rounded text-rose-400 transition-colors"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  </div>
                  <p className="ml-5">{comment.text}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              className="flex-1 bg-white/5 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  addComment(note.id, input.value);
                  input.value = '';
                }
              }}
            />
          </div>
        </div>
      )}
      {note.tasks && note.tasks.length > 0 && (
        <div className="px-4 pb-4">
          <div className="text-sm font-medium text-white/90 mb-2">Tasks:</div>
          <div className="space-y-2">
            {renderTasks()}
          </div>
        </div>
      )}
      {/* Add resize handles */}
      <div 
        className="resize-handle resize-right"
        onMouseDown={(e) => handleResizeStart('right', e)}
      />
      <div 
        className="resize-handle resize-bottom"
        onMouseDown={(e) => handleResizeStart('bottom', e)}
      />
      <div 
        className="resize-handle resize-corner"
        onMouseDown={(e) => handleResizeStart('corner', e)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 9L1 1M5 9L1 5M9 5L5 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>
      
      {/* Auto label suggestions */}
      {note.expanded && (
        <AutoLabelSuggestion 
          noteId={note.id} 
          content={note.content} 
          onAddLabel={addLabel} 
        />
      )}
      
      {note.labels && note.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {note.labels.map(label => (
            <div
              key={`${note.id}-label-${label.id}`}
              className="flex items-center text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${label.color}30`, color: label.color }}
            >
              <span>{label.name}</span>
              <div className="flex ml-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt('Edit label name:', label.name);
                    if (newName) {
                      updateLabel(note.id, label.id, { ...label, name: newName });
                    }
                  }}
                  className="ml-1 p-0.5 hover:bg-white/10 rounded-full"
                >
                  <Edit className="w-2 h-2" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLabel(note.id, label.id);
                  }}
                  className="ml-1 p-0.5 hover:bg-white/10 rounded-full"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}