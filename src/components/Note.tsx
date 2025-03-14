import React, { useState, useCallback, useRef, useEffect, useMemo, useContext, FormEvent, MouseEvent, ChangeEvent } from 'react';
import { Note as NoteType, Position, Task, CategoryColorMap, Comment as NoteComment, Label, Attachment } from '../types';
import {
  GripHorizontal, CheckSquare, Square, Trash2, Check, Calendar, Clock,
  Flag, Paperclip, MessageSquare, Tag, ChevronDown, ChevronUp, ChevronRight, Bell,
  Palette, Maximize2, X, Plus, Edit, Sparkles, FolderPlus, Loader2
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { XYCoord } from 'react-dnd';
import update from 'immutability-helper';
import AutoLabelSuggestion from './AutoLabel';
import { useDraggable } from '@dnd-kit/core';
import { Editor } from '@tiptap/react';
import { format } from 'date-fns';
import { NoteMenuContext } from '../context/NoteMenuContext';
import { generateAIResponse } from '../utils/ai';
import TextAreaAutosize from 'react-textarea-autosize';
import { ReminderPopup } from './ReminderPopup';
import { LinkPopup } from './LinkPopup';
import { AttachmentPopup } from './AttachmentPopup';
import { useProjectStore } from '../store/projectStore';
import { useTagStore } from '../store/tagStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { calculateContrastingColor } from '../utils/colors';
import { CommentThread } from './CommentThread';
import { suggestTasks } from '../lib/ai';
import { openai } from '../lib/openai';

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
    <div className={`task-item-container ${depth > 0 ? 'subtask' : ''}`}>
      <div 
        ref={node => {
          drag(drop(node));
          ref.current = node;
        }}
        className={`task-item ${isDragging ? 'dragging' : ''} ${task.done ? 'completed' : ''}`}
        style={{ paddingLeft: `${depth * 16}px` }}
        data-testid={`task-item-${task.id}`}
      >
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
          {/* Category indicators now hidden by CSS class .task-category { display: none; } */}
          
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [editedContent, setEditedContent] = useState(note.content || '');
  const [reminderPopupOpen, setReminderPopupOpen] = useState(false);
  const [linkPopupOpen, setLinkPopupOpen] = useState(false);
  const [attachmentPopupOpen, setAttachmentPopupOpen] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState<{ [key: string]: boolean }>({});
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [taskText, setTaskText] = useState<string>('');
  const [isLoadingTaskSuggestions, setIsLoadingTaskSuggestions] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState<Array<{id: string, text: string, category: string, selected: boolean}>>([]);
  const [showTaskSuggestions, setShowTaskSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<Array<{ id: string; text: string; category: string; priority: string; selected: boolean; isEditing: boolean }>>([]);
  const [taskCategorySuggestions, setTaskCategorySuggestions] = useState<Array<{ task_text: string; suggested_category: string }>>([]);
  const [recommendedCategories, setRecommendedCategories] = useState<string[]>([]);
  const [taskSortBy, setTaskSortBy] = useState<'category' | 'priority'>('category');
  
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
    
    // Call the appropriate update function
    if (onUpdateNote) {
      onUpdateNote(note.id, { tasks: updatedTasks, type: 'task' });
    } else if (updateNote) {
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
    } else if (updateNote) {
      updateNote(note.id, { tasks: updatedTasks });
    }
  };
  
  // Function to update a task in the note
  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    const findAndUpdateTask = (tasks: Task[]): Task[] => {
      return tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, ...updates };
        } else if (task.subtasks && task.subtasks.length > 0) {
          return { ...task, subtasks: findAndUpdateTask(task.subtasks) };
        } else {
          return task;
        }
      });
    };
    
    const updatedTasks = findAndUpdateTask(note.tasks);
    
    // Call the appropriate update function
    if (onUpdateNote) {
      onUpdateNote(note.id, { tasks: updatedTasks });
    } else if (updateNote) {
      updateNote(note.id, { tasks: updatedTasks });
    }
  };
  
  // Function to delete a task from the note
  const handleTaskDelete = (taskId: string) => {
    const findAndDeleteTask = (tasks: Task[]): Task[] => {
      return tasks
        .filter(task => task.id !== taskId)
        .map(task => {
          if (task.subtasks && task.subtasks.length > 0) {
            return { ...task, subtasks: findAndDeleteTask(task.subtasks) };
          } else {
            return task;
          }
        });
    };
    
    const updatedTasks = findAndDeleteTask(note.tasks);
    
    // Call the appropriate update function
    if (onUpdateNote) {
      onUpdateNote(note.id, { tasks: updatedTasks });
    } else if (updateNote) {
      updateNote(note.id, { tasks: updatedTasks });
    }
  };
  
  // Function to handle task suggestions with AI
  const handleTaskSuggestion = async () => {
    console.log("Generating AI task suggestions for note");
    setIsLoading(true);
    setShowTaskSuggestions(true);
    setSuggestedTasks([]);
    
    try {
      // Extract existing categories from tasks
      const existingCategories: string[] = [];
      if (Array.isArray(note.tasks)) {
        note.tasks.forEach(task => {
          if (task.category && !existingCategories.includes(task.category)) {
            existingCategories.push(task.category);
          }
        });
      }
      
      // Prepare the note content and task list for the AI
      const noteContent = typeof note.content === 'string' ? note.content : '';
      const taskList = Array.isArray(note.tasks) 
        ? note.tasks.map(t => `- ${t.text} ${t.category ? `[${t.category}]` : ''} ${t.done ? '[✓]' : '[  ]'}`).join('\n')
        : '';
      
      // Prepare the json schema for structured output
      const jsonSchema = {
        type: "object",
        properties: {
          task_suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The task description"
                },
                category: {
                  type: "string",
                  description: "Category name for the task"
                },
                priority: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "Priority level for the task"
                },
                suggested_categories_for_existing_tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task_text: {
                        type: "string",
                        description: "Text of an existing task"
                      },
                      suggested_category: {
                        type: "string",
                        description: "A better category for this task"
                      }
                    },
                    required: ["task_text", "suggested_category"]
                  },
                  description: "Suggestions for categorizing existing uncategorized tasks"
                }
              },
              required: ["text", "category", "priority"]
            },
            description: "List of task suggestions"
          },
          recommended_categories: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Recommended categories for organizing tasks in this note"
          }
        },
        required: ["task_suggestions", "recommended_categories"]
      };

      console.log('Sending prompt to OpenAI API with structured output schema');
      
      // Call the OpenAI API
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
      const apiUrl = 'https://api.openai.com/v1/chat/completions';
      
      const systemPrompt = `You are an AI task assistant integrated into a note-taking application.
Your job is to analyze notes and suggest relevant tasks that would help the user complete their objectives.
You should also recommend categories for organizing tasks and suggest better categories for existing tasks when appropriate.`;

      const userPrompt = `Analyze this note and suggest new tasks that would help complete the user's objectives.

NOTE CONTENT:
${noteContent || '(Empty note)'}

${taskList ? `EXISTING TASKS:\n${taskList}` : 'NO TASKS'}

EXISTING CATEGORIES: ${existingCategories.length > 0 ? existingCategories.join(', ') : 'None'}

Generate 3-5 helpful task suggestions based on the note's content and existing tasks.
The suggestions should be practical, specific, and actionable.
Assign appropriate categories and priorities to each task.
Also suggest categories for any uncategorized existing tasks.
If you recommend new categories, include them in both task suggestions and the recommended_categories list.`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { 
            type: "json_schema", 
            schema: jsonSchema
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const resultText = data.choices[0]?.message?.content || '';
      
      console.log('Raw OpenAI response:', resultText);
      let result;
      
      try {
        result = JSON.parse(resultText);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        throw new Error('Failed to parse the AI response');
      }
      
      if (Array.isArray(result.task_suggestions)) {
        // Format suggestions with IDs and selected state
        const formattedSuggestions = result.task_suggestions.map((suggestion: any) => ({
          id: crypto.randomUUID(),
          text: suggestion.text,
          category: suggestion.category,
          priority: suggestion.priority || 'medium',
          selected: false,
          isEditing: false // Add state for editing mode
        }));
        
        setSuggestedTasks(formattedSuggestions);
        
        // Store any suggested categories for existing tasks
        if (result.suggested_categories_for_existing_tasks) {
          setTaskCategorySuggestions(result.suggested_categories_for_existing_tasks);
        }
        
        // Store recommended categories
        if (result.recommended_categories) {
          setRecommendedCategories(result.recommended_categories);
        }
      } else {
        console.error('Unexpected response structure:', result);
        throw new Error('Invalid suggestion format received from AI');
      }
    } catch (error) {
      console.error('Error generating task suggestions:', error);
      
      // Fallback suggestions if the API call fails
      setSuggestedTasks([
        {
          id: crypto.randomUUID(),
          text: 'Review content and identify next steps',
          category: 'General',
          priority: 'medium',
          selected: false,
          isEditing: false
        },
        {
          id: crypto.randomUUID(),
          text: 'Set a deadline for completing these tasks',
          category: 'Planning',
          priority: 'high',
          selected: false,
          isEditing: false
        },
        {
          id: crypto.randomUUID(),
          text: 'Share this note with relevant team members',
          category: 'Collaboration',
          priority: 'low',
          selected: false,
          isEditing: false
        }
      ]);
      
      setRecommendedCategories(['General', 'Planning', 'Collaboration']);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle task suggestion selection
  const toggleTaskSelection = (suggestionId: string) => {
    setSuggestedTasks(prevSuggestions => 
      prevSuggestions.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, selected: !suggestion.selected } 
          : suggestion
      )
    );
  };
  
  // Apply selected task suggestions
  const applySelectedTaskSuggestions = () => {
    const selectedSuggestions = suggestedTasks.filter(suggestion => suggestion.selected);
    
    if (selectedSuggestions.length === 0) {
      setShowTaskSuggestions(false);
      return;
    }
    
    // Create new tasks from the selected suggestions
    const newTasks = selectedSuggestions.map(suggestion => ({
      id: crypto.randomUUID(),
      text: suggestion.text,
      done: false,
      category: suggestion.category,
      priority: suggestion.priority,
      createdAt: new Date().toISOString()
    }));
    
    // Apply category suggestions to existing tasks if any
    let updatedExistingTasks = [...(note.tasks || [])];
    if (taskCategorySuggestions.length > 0) {
      updatedExistingTasks = updatedExistingTasks.map(task => {
        // Find a suggestion for this task
        const categorySuggestion = taskCategorySuggestions.find(
          suggestion => suggestion.task_text === task.text
        );
        
        // If found, apply the suggested category
        if (categorySuggestion) {
          return {
            ...task,
            category: categorySuggestion.suggested_category
          };
        }
        
        return task;
      });
    }
    
    // Update the note with the new and updated tasks
    const updatedTasks = [...updatedExistingTasks, ...newTasks];
    const updatedNote = { ...note, tasks: updatedTasks };
    
    // Call the appropriate update function
    if (onUpdateNote) {
      onUpdateNote(updatedNote);
    } else if (updateNote) {
      updateNote(updatedNote);
    }
    
    // Reset task suggestion state
    setShowTaskSuggestions(false);
    setSuggestedTasks([]);
    setTaskCategorySuggestions([]);
    setRecommendedCategories([]);
  };
  
  // Cancel task suggestions
  const cancelTaskSuggestions = () => {
    setShowTaskSuggestions(false);
    setSuggestedTasks([]);
  };
  
  // Add function to toggle task suggestion edit mode
  const toggleTaskSuggestionEdit = (suggestionId: string) => {
    setSuggestedTasks(prev => 
      prev.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, isEditing: !suggestion.isEditing } 
          : suggestion
      )
    );
  };

  // Add function to update task suggestion text
  const updateTaskSuggestion = (suggestionId: string, updates: Partial<{ text: string, category: string, priority: string }>) => {
    setSuggestedTasks(prev => 
      prev.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, ...updates, isEditing: false } 
          : suggestion
      )
    );
  };

  // Add function to toggle task sort method
  const toggleTaskSort = () => {
    setTaskSortBy(prev => prev === 'category' ? 'priority' : 'category');
  };

  // Now modify the renderTasks function to use our EditableTask component
  const renderTasks = () => {
    if (!note.tasks) return null;
    
    // Group tasks by category
    const tasksByCategory: {[category: string]: Task[]} = {};
    
    // Use "Uncategorized" as default category
    tasksByCategory["Uncategorized"] = [];
    
    // Group tasks by their categories
    note.tasks.forEach(task => {
      const category = task.category || "Uncategorized";
      if (!tasksByCategory[category]) {
        tasksByCategory[category] = [];
      }
      tasksByCategory[category].push(task);
    });
    
    // Calculate progress
    const totalTasks = note.tasks.length;
    const completedTasks = note.tasks.filter(task => task.done).length;
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return (
      <div className="tasks-container">
        <div className="tasks-header">
          <h4>Tasks</h4>
          <div className="task-actions">
            <button
              onClick={handleAddTask}
              className="task-action-button"
              title="Add a new task"
            >
              <Plus className="w-3 h-3" />
              <span>Add task</span>
            </button>
            <button
              onClick={handleTaskSuggestion}
              className="task-action-button"
              title="Get AI task suggestions"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>Suggest Tasks</span>
            </button>
          </div>
        </div>
        
        {/* Task progress bar */}
        {totalTasks > 0 && (
          <div className="task-progress-container">
            <div className="task-progress">
              <div 
                className="task-progress-bar" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="task-progress-text">
              {completedTasks} of {totalTasks} tasks completed ({Math.round(progressPercentage)}%)
            </div>
          </div>
        )}
        
        {/* Add category button */}
        <div className="task-category-controls">
          <button 
            onClick={() => {
              // Logic to add a new category goes here
              // You could show a modal or inline form
              const category = prompt("Enter a category name");
              if (category && category.trim()) {
                // Update the first uncategorized task with this category
                const uncategorized = tasksByCategory["Uncategorized"];
                if (uncategorized.length > 0) {
                  handleTaskUpdate(uncategorized[0].id, { category });
                }
              }
            }}
            className="add-category-button"
            title="Create a new category"
          >
            <FolderPlus className="w-3 h-3" />
            <span>Add Category</span>
          </button>
        </div>
        
        {Object.keys(tasksByCategory).some(category => tasksByCategory[category].length > 0) ? (
          <div className="tasks-by-category">
            {Object.entries(tasksByCategory).map(([category, tasks]) => (
              // Skip rendering empty categories
              tasks.length > 0 ? (
                <div key={category} className="task-category-section">
                  <div className="task-category-header">
                    <h5>{category}</h5>
                    <span className="task-count">{tasks.length}</span>
                  </div>
                  <div className="tasks-list">
                    {tasks.map((task, index) => (
                      <EditableTask
                        key={task.id}
                        task={task}
                        index={index}
                        moveTask={moveTask}
                        onTaskUpdate={handleTaskUpdate}
                        onTaskDelete={handleTaskDelete}
                        onAddSubtask={handleAddSubtask}
                        categoryColors={effectiveCategoryColors}
                        depth={0}
                      />
                    ))}
                  </div>
                </div>
              ) : null
            ))}
          </div>
        ) : (
          // Empty state message when there are no tasks
          <div className="no-tasks-message">
            No tasks yet. Click "Add task" to create one or use "Suggest Tasks" for AI assistance.
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

  // Add click handler for opening notes in fullscreen
  const handleContentClick = (e: React.MouseEvent) => {
    if (isSelectable) return; // Don't enter fullscreen mode in selection mode
    e.stopPropagation();
    setLocalEnlarged(true);
  };

  // Handle ESC key to close fullscreen mode
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && noteIsEnlarged) {
        setLocalEnlarged(false);
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [noteIsEnlarged]);

  // Handle selection click for the note in selection mode
  const handleSelectionClick = () => {
    if (onSelect) {
      onSelect(note.id);
    }
  };

  // Render the task suggestions panel
  const renderTaskSuggestions = () => {
    if (!showTaskSuggestions) return null;
    
    // Sort the tasks based on the current sort method
    const sortedTasks = [...suggestedTasks].sort((a, b) => {
      if (taskSortBy === 'category') {
        return a.category.localeCompare(b.category);
      } else {
        // Sort by priority (high, medium, low)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      }
    });
    
    return (
      <div className="task-suggestions-panel">
        <div className="task-suggestions-header">
          <h4>AI Task Suggestions</h4>
          <button className="task-suggestions-close" onClick={cancelTaskSuggestions}>×</button>
        </div>
        
        <div className="task-suggestions-content">
          {isLoading ? (
            <div className="task-suggestions-loading">
              <div className="spinner"></div>
              <span>Generating suggestions...</span>
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="no-suggestions-message">
              No suggestions available
            </div>
          ) : (
            <>
              {recommendedCategories.length > 0 && (
                <div className="recommended-categories">
                  <h5>Recommended Categories</h5>
                  <div className="category-chips">
                    {recommendedCategories.map(category => (
                      <span key={category} className="category-chip">{category}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="task-sort-toggle">
                <label className="task-sort-label">Sort by:</label>
                <button 
                  className={`task-sort-button ${taskSortBy === 'category' ? 'active' : ''}`}
                  onClick={() => setTaskSortBy('category')}
                >
                  Category
                </button>
                <button 
                  className={`task-sort-button ${taskSortBy === 'priority' ? 'active' : ''}`}
                  onClick={() => setTaskSortBy('priority')}
                >
                  Priority
                </button>
              </div>
              
              <div className="task-suggestions-list">
                {sortedTasks.map(suggestion => (
                  <div 
                    key={suggestion.id}
                    className={`task-suggestion-item ${suggestion.selected ? 'selected' : ''} priority-${suggestion.priority}`}
                    onClick={() => toggleTaskSelection(suggestion.id)}
                  >
                    <div className="task-suggestion-checkbox">
                      <input 
                        type="checkbox" 
                        checked={suggestion.selected}
                        onChange={() => toggleTaskSelection(suggestion.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="task-suggestion-content">
                      {suggestion.isEditing ? (
                        <div className="task-suggestion-edit">
                          <input 
                            type="text" 
                            className="task-edit-input"
                            value={suggestion.text}
                            onChange={(e) => updateTaskSuggestion(suggestion.id, { text: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          <select 
                            className="category-select"
                            value={suggestion.category}
                            onChange={(e) => updateTaskSuggestion(suggestion.id, { category: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {[...new Set([...recommendedCategories, suggestion.category])].map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                            <option value="new">+ New Category</option>
                          </select>
                          <select 
                            className="priority-select"
                            value={suggestion.priority}
                            onChange={(e) => updateTaskSuggestion(suggestion.id, { priority: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="high">High Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="low">Low Priority</option>
                          </select>
                        </div>
                      ) : (
                        <>
                          <div className="task-suggestion-text">{suggestion.text}</div>
                          <div className="task-meta">
                            <span className="task-suggestion-category">{suggestion.category}</span>
                            <span className={`task-suggestion-priority priority-${suggestion.priority}`}>
                              {suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)} Priority
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="task-actions">
                      <button 
                        className="task-edit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskSuggestionEdit(suggestion.id);
                        }}
                        title={suggestion.isEditing ? "Save changes" : "Edit task"}
                      >
                        {suggestion.isEditing ? "✓" : "✎"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {taskCategorySuggestions.length > 0 && (
                <div className="task-category-suggestions">
                  <h5>Category Suggestions for Existing Tasks</h5>
                  <div className="category-suggestion-list">
                    {taskCategorySuggestions.map((suggestion, index) => (
                      <div key={index} className="category-suggestion-item">
                        <div className="task-text">{suggestion.task_text}</div>
                        <div className="suggested-category">
                          Suggested category: <span>{suggestion.suggested_category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="task-suggestions-actions">
                <button 
                  className="task-suggestions-apply" 
                  onClick={applySelectedTaskSuggestions}
                  disabled={!suggestedTasks.some(s => s.selected)}
                >
                  Apply Selected ({suggestedTasks.filter(s => s.selected).length})
                </button>
                <button className="task-suggestions-cancel" onClick={cancelTaskSuggestions}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Function to handle task reordering
  const moveTask = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      if (!note.tasks) return;
      
      const draggedTask = note.tasks[dragIndex];
      
      // Create a new array with the tasks in the new order
      const updatedTasks = [...note.tasks];
      updatedTasks.splice(dragIndex, 1); // Remove from old position
      updatedTasks.splice(hoverIndex, 0, draggedTask); // Insert at new position
      
      // Update the note with the new task order
      const updatedNote = { ...note, tasks: updatedTasks };
      
      // Call the appropriate update function
      if (onUpdateNote) {
        onUpdateNote(note.id, { tasks: updatedTasks });
      } else if (updateNote) {
        updateNote(note.id, { tasks: updatedTasks });
      }
    },
    [note, onUpdateNote, updateNote]
  );

  // Function to handle task reordering within categories
  const moveTaskWithinCategory = useCallback(
    (taskId: string, fromCategoryId: string, toCategoryId: string, newIndex: number) => {
      if (!note.tasks) return;
      
      // Group tasks by category
      const tasksByCategory: Record<string, any[]> = {};
      
      // Initialize categories
      note.tasks.forEach(task => {
        const category = task.category || 'Uncategorized';
        if (!tasksByCategory[category]) {
          tasksByCategory[category] = [];
        }
        tasksByCategory[category].push(task);
      });
      
      // Find the task to move
      const fromCategory = fromCategoryId || 'Uncategorized';
      const toCategory = toCategoryId || 'Uncategorized';
      
      let taskToMove;
      let fromCategoryTasks = tasksByCategory[fromCategory] || [];
      
      // Find and remove the task from its original category
      for (let i = 0; i < fromCategoryTasks.length; i++) {
        if (fromCategoryTasks[i].id === taskId) {
          taskToMove = fromCategoryTasks[i];
          fromCategoryTasks.splice(i, 1);
          break;
        }
      }
      
      if (!taskToMove) return;
      
      // If moving to a different category, update the task's category
      if (fromCategory !== toCategory) {
        taskToMove = { ...taskToMove, category: toCategory };
      }
      
      // Add the task to its new position in the target category
      let toCategoryTasks = tasksByCategory[toCategory] || [];
      if (newIndex > toCategoryTasks.length) {
        newIndex = toCategoryTasks.length;
      }
      toCategoryTasks.splice(newIndex, 0, taskToMove);
      
      // Update the categories in our map
      tasksByCategory[fromCategory] = fromCategoryTasks;
      tasksByCategory[toCategory] = toCategoryTasks;
      
      // Flatten all tasks back into a single array
      const updatedTasks = Object.values(tasksByCategory).flat();
      
      // Update the note with the reorganized tasks
      const updatedNote = { ...note, tasks: updatedTasks };
      
      // Call the appropriate update function
      if (onUpdateNote) {
        onUpdateNote(note.id, { tasks: updatedTasks });
      } else if (updateNote) {
        updateNote(note.id, { tasks: updatedTasks });
      }
    },
    [note, onUpdateNote, updateNote]
  );

  // Function to handle task priority changes
  const changeTaskPriority = useCallback(
    (taskId: string, newPriority: 'high' | 'medium' | 'low') => {
      if (!note.tasks) return;
      
      // Find the task to update
      const taskIndex = note.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) return;
      
      // Create a copy of the tasks array with the updated task
      const updatedTasks = [...note.tasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        priority: newPriority
      };
      
      // Update the note with the modified tasks
      const updatedNote = { ...note, tasks: updatedTasks };
      
      // Call the appropriate update function
      if (onUpdateNote) {
        onUpdateNote(note.id, { tasks: updatedTasks });
      } else if (updateNote) {
        updateNote(note.id, { tasks: updatedTasks });
      }
    },
    [note, onUpdateNote, updateNote]
  );

  return (
    <div
      ref={nodeRef}
      className={`note ${note.color} ${isSelected ? 'selected' : ''} ${isDraggingThis ? 'dragging' : ''} ${noteIsEnlarged ? 'enlarged' : ''}`}
      style={{
        width: noteIsEnlarged ? '80vw' : (note.size ? `${note.size.width}px` : undefined),
        height: noteIsEnlarged ? '80vh' : (note.size ? `${note.size.height}px` : undefined),
        zIndex: noteIsEnlarged ? 100 : (isDraggingThis ? 10 : undefined),
        position: noteIsEnlarged ? 'fixed' : 'absolute',
        ...(noteIsEnlarged 
          ? {} 
          : {
              left: `${note.position.x}px`,
              top: `${note.position.y}px`,
            }
        ),
        overflow: 'auto'
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
            <div className="absolute top-full left-0 mt-2 p-2 bg-gray-900 rounded-lg shadow-xl border border-white/10 flex flex-wrap gap-2 w-40 z-[101]">
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
                    'bg-accent-rose'
                  } ${note.color === color ? 'ring-2 ring-white/80 ring-offset-1 ring-offset-gray-900' : 'hover:scale-110'} transition-transform`}
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
        onClick={handleContentClick}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={handleContentDoubleClick}
        rows={noteIsEnlarged ? 16 : 4}
      />
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
      
      {/* Add task suggestions panel */}
      {renderTaskSuggestions()}
    </div>
  );
}