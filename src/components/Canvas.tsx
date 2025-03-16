import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Note as NoteType, Position, Task, PriorityLevel } from '../types';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Note } from './Note/index';
// Import types from Note component
import { NoteType as NoteComponentType } from './Note/types';
import { Plus, Mic, Minus, Loader2, ListTodo, Settings as SettingsIcon, X, Layout, FileText, FolderOpen, UploadCloud, Book, FilePlus, Search, ChevronRight, ChevronLeft, AlignLeft, AlignCenter, AlignRight, Clipboard, Calendar, BrainCircuit, CheckSquare, Grid, Move, ArrowDown, ArrowRight, Flag, SlidersHorizontal, Trello, CheckCircle, Maximize2 } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Settings } from './Settings';
import { useNoteStore } from '../store/noteStore';
import { useDiscardStore } from '../store/discardStore';
import { 
  categorizeTasksAndSuggestNotes, 
  extractKeyTerms,
  enhanceTranscribedText, 
  transcribeAudio,
  transcribeAudioWithKeyTerms,
  cleanGroceryItemText
} from '../lib/ai';
import { openai } from '../lib/openai';
import CanvasGrid, { GridLayout, GridCell } from './CanvasGrid';
import { AlignmentTool } from './AlignmentTool';
import { MarkdownImporter } from './MarkdownImporter';
import { SmartOrganizeTool } from './SmartOrganizeTool.tsx';
import { CanvasSettingsModal } from './CanvasSettingsModal';
import FilteringPanel, { FilterOptions, SortOption } from './FilteringPanel';
import KanbanBoard from './KanbanBoard';
import NoteAlignmentPanel from './NoteAlignmentPanel';

// Define GridLayout type explicitly to avoid conflicts
type GridLayoutType = 'auto' | 'manual' | 'none';

// Simple replacement for useResizeObserver
function useSimpleResizeObserver() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setSize({ width, height });
      }
    });
    
    resizeObserver.observe(ref.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return { ref, ...size };
}

// Debounce function to prevent multiple rapid calls
function debounce(func: Function, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: any[]) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;

// Define bounded canvas dimensions with 16:9 aspect ratio
const INITIAL_CANVAS_WIDTH = 12000;
const INITIAL_CANVAS_HEIGHT = 6750; // 16:9 aspect ratio
const CANVAS_EXPAND_SIZE = 3000; // Size to expand canvas when needed

interface CanvasProps {
  onSwitchToNotes: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({ onSwitchToNotes }) => {
  const { notes, addNote, moveNote, updateNote, addTask, settings, setNotes } = useNoteStore();
  const [isRecording, setIsRecording] = useState(false);
  const [lastCtrlPress, setLastCtrlPress] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showGrid, setShowGrid] = useState(true);
  const [showDictationPanel, setShowDictationPanel] = useState(false); // State to control dictation panel visibility
  
  // Add Kanban board state
  const [viewMode, setViewMode] = useState<'canvas' | 'kanban'>('canvas');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  // Add new state for filtering and sorting
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    categories: [],
    priorities: [],
    hasTasks: null,
    dueDateStatus: 'all'
  });
  const [sortOption, setSortOption] = useState<SortOption>({
    field: 'updated',
    direction: 'desc'
  });
  const [filteredNotes, setFilteredNotes] = useState<NoteType[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showAlignmentPanel, setShowAlignmentPanel] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  
  // Extract all unique categories and priorities from notes
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    
    notes.forEach(note => {
      // Add note category if it exists
      if (note.category) {
        categories.add(note.category);
      }
      
      // Add task categories if they exist
      if (note.tasks) {
        note.tasks.forEach(task => {
          if (task.category) {
            categories.add(task.category);
          }
        });
      }
    });
    
    return Array.from(categories);
  }, [notes]);
  
  const availablePriorities: PriorityLevel[] = ['low', 'medium', 'high'];

  const colors = ['blue', 'green', 'pink', 'yellow'];

  // Add a new state to track when we receive chunks of audio data
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);

  // Add a state for the alignment tool
  const [isAlignmentOpen, setIsAlignmentOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Add new state variables for dictation preview and approval
  const [previewNotes, setPreviewNotes] = useState<NoteType[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [dictationStatus, setDictationStatus] = useState<'idle' | 'listening' | 'processing' | 'previewing'>('idle');

  // Add these references at the top under the state declarations
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const viewportRef = useRef<any>(null);

  // Add state for the Markdown importer modal
  const [isMarkdownImporterOpen, setIsMarkdownImporterOpen] = useState(false);

  // Add a visible state for real-time transcription
  const [visibleTranscript, setVisibleTranscript] = useState('');
  
  // AI reasoning display state
  const [showAIReasoning, setShowAIReasoning] = useState(false);
  
  // Brainstorming state
  const [brainstormNote, setBrainstormNote] = useState<NoteType | null>(null);
  const [isLoadingBrainstorm, setIsLoadingBrainstorm] = useState(false);
  const [brainstormSuggestions, setBrainstormSuggestions] = useState<{id: string, type: string, text: string}[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Array<{ id: string; type: string; text: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Toggle AI reasoning visibility
  const toggleAIReasoning = () => {
    setShowAIReasoning(!showAIReasoning);
  };
  
  // Function to open the brainstorm modal for a specific note
  const openBrainstormModal = (noteId: string) => {
    console.log('Opening brainstorm modal for note:', noteId);
    
    // Debounce to prevent multiple rapid clicks
    const now = Date.now();
    if (now - lastBrainstormClick < 1000) {
      console.log('Debounced brainstorm request');
      return;
    }
    setLastBrainstormClick(now);
    
    // Check if we're already brainstorming this note
    if (brainstormNote) {
      console.log('Already brainstorming this note, ignoring duplicate request');
      return;
    }
    
    const note = notes.find(n => n.id === noteId);
    if (!note) {
      console.error('Note not found for brainstorming');
      return;
    }
    
    console.log('Setting brainstorm note:', note);
    setBrainstormNote(note);
    resetBrainstorm();
    
    // Automatically start generating suggestions
    setTimeout(() => {
      generateBrainstormSuggestions();
    }, 300);
  };
  
  // Generate AI suggestions for the current brainstorm note
  const generateBrainstormSuggestions = async () => {
    console.log('Generating brainstorm suggestions');
    
    if (!brainstormNote) {
      console.error('No brainstorm note available');
      return;
    }
    
    setIsLoadingBrainstorm(true);
    
    try {
      // Prepare the note content and task list
      const noteContent = typeof brainstormNote.content === 'string' 
        ? brainstormNote.content 
        : '';
      
      const taskList = Array.isArray(brainstormNote.tasks) 
        ? brainstormNote.tasks.map(t => `- ${t.text} ${t.category ? `[${t.category}]` : ''} ${t.done ? '[✓]' : '[  ]'}`).join('\n')
        : '';
      
      // Determine if we should use web search
      let useWebSearch = false;
      let webSearchResults = '';
      
      // Check if there are meal planning or nutrition keywords
      const mealPlanningKeywords = ['meal', 'food', 'diet', 'nutrition', 'recipe', 'eating', 'cook', 'dinner', 'lunch', 'breakfast'];
      const containsMealPlanningKeywords = mealPlanningKeywords.some(keyword => 
        (noteContent + taskList).toLowerCase().includes(keyword.toLowerCase())
      );
      
      // Check note category if it exists
      const isMealPlanningCategory = 
        brainstormNote.category?.toLowerCase().includes('meal') || 
        brainstormNote.category?.toLowerCase().includes('food') || 
        brainstormNote.category?.toLowerCase().includes('nutrition');
        
      if (containsMealPlanningKeywords || isMealPlanningCategory) {
        console.log('Note related to meal planning/nutrition, will enhance with web search');
        useWebSearch = true;
        
        // Simulate web search with structured data
        webSearchResults = `
Web search results for meal planning trends and tips:
1. Current meal planning trends include meal prep Sunday, batch cooking, and ingredient-focused planning.
2. Popular nutrition approaches include Mediterranean diet, plant-based meals, and balanced macros.
3. Time-saving meal planning tools: shared shopping lists, calendar integrations, and one-pot recipes.
4. Statistics show 40% higher adherence to nutrition plans when meals are planned in advance.
`;
        console.log('Web search results:', webSearchResults);
      }
      
      // Use OpenAI to generate suggestions
      const prompt = `You are an agentic assistant integrated with a note-taking application. The user has a note they would like help enhancing. Your task is to analyze this note and provide helpful suggestions.

NOTE CONTENT:
${noteContent || '(Empty note)'}

${taskList ? `EXISTING TASKS:\n${taskList}` : 'NO TASKS'}

${useWebSearch ? `RELEVANT WEB SEARCH RESULTS:\n${webSearchResults}` : ''}

Create helpful suggestions to enhance this note. Your suggestions should be creative, practical and genuinely useful based on the content. Consider:
- Missing tasks that would logically complete a sequence
- Better organization approaches
- Important content additions that would make the note more complete
- Research findings that enhance the topic (especially for meal planning, nutrition, or recipes)
- Schedule suggestions for tasks that appear time-sensitive

IMPORTANT: Return a valid JSON object with a "suggestions" array. Each suggestion should have:
- "type": one of "task", "content", "organization", "schedule", or "research"
- "text": the actual suggestion content

Example response format:
{
  "suggestions": [
    {
      "type": "task",
      "text": "Call dentist to confirm appointment time"
    },
    {
      "type": "organization",
      "text": "Separate work tasks from personal tasks with headers"
    },
    {
      "type": "content",
      "text": "Add directions to the meeting location"
    },
    {
      "type": "research",
      "text": "Research shows eating protein first in meals helps control blood sugar"
    },
    {
      "type": "schedule",
      "text": "Schedule meal prep for Sunday afternoon"
    }
  ]
}

Return 5-8 suggestions focused on being immediately useful to the user.`;

      console.log('Sending prompt to OpenAI API');
      
      try {
        // Call the OpenAI API
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
        const apiUrl = 'https://api.openai.com/v1/chat/completions';
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [{
              role: 'user',
              content: prompt
            }],
            temperature: 0.7,
            max_tokens: 1000
          })
        });
        
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const resultText = data.choices[0]?.message?.content || '';
        
        console.log('Raw OpenAI response:', resultText);
        const result = JSON.parse(resultText);
        
        if (Array.isArray(result.suggestions)) {
          // Add IDs to the suggestions
          const suggestionsWithIds = result.suggestions.map((s: any, i: number) => ({
            ...s,
            id: `suggestion-${Date.now()}-${i}`
          }));
          
          console.log('Generated agentic suggestions with web search integration:', suggestionsWithIds);
          setBrainstormSuggestions(suggestionsWithIds);
        } else {
          console.error('Unexpected response structure:', result);
          // Fallback to generic suggestions if there's an issue with the response format
          setBrainstormSuggestions([
            {
              id: `suggestion-${Date.now()}-0`,
              type: 'organization',
              text: 'Consider organizing your tasks by priority or deadline.'
            },
            {
              id: `suggestion-${Date.now()}-1`,
              type: 'task',
              text: 'Add a specific deadline to track progress.'
            }
          ]);
        }
      } catch (error) {
        console.error('Error calling OpenAI API:', error);
        // Set fallback suggestions
        setBrainstormSuggestions([
          {
            id: `suggestion-${Date.now()}-0`,
            type: 'organization',
            text: 'Consider organizing your tasks by priority or deadline.'
          },
          {
            id: `suggestion-${Date.now()}-1`,
            type: 'task',
            text: 'Add a specific deadline to track progress.'
          }
        ]);
      }
    } catch (error) {
      console.error('Error in generateBrainstormSuggestions:', error);
      setBrainstormSuggestions([
        {
          id: `suggestion-${Date.now()}-0`,
          type: 'organization',
          text: 'Consider organizing your tasks by priority or deadline.'
        },
        {
          id: `suggestion-${Date.now()}-1`,
          type: 'task',
          text: 'Add a specific deadline to track progress.'
        }
      ]);
    }
    
    setIsLoadingBrainstorm(false);
  };
  
  // Apply a suggestion to the note
  const applySuggestion = (suggestion: {id: string, type: string, text: string}) => {
    console.log('Applying suggestion:', suggestion);
    
    if (!brainstormNote) {
      console.error('No brainstorm note available');
      return;
    }
    
    // Find the original note
    const originalNote = notes.find(n => n.id === brainstormNote.id);
    if (!originalNote) {
      console.error('Cannot find original note to update');
      return;
    }
    
    switch (suggestion.type) {
      case 'task': {
        // Initialize tasks array if it doesn't exist
        if (!originalNote.tasks) {
          originalNote.tasks = [];
        }
        
        // Create a new task
        const newTask: Task = {
          id: `task-${Date.now()}-${originalNote.tasks.length}`,
          text: suggestion.text,
          done: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'General' // Use a string directly
        };
        
        originalNote.tasks.push(newTask);
        console.log('Added task to note');
        break;
      }
      
      case 'content': {
        // Append content to the note
        const currentContent = typeof originalNote.content === 'string' 
          ? originalNote.content 
          : '';
          
        originalNote.content = currentContent + '\n\n' + suggestion.text;
        console.log('Updated content:', originalNote.content);
        break;
      }
      
      case 'organization': {
        // For organization suggestions, we add it to the content for now
        // Future: could implement more sophisticated organization logic
        const currentContent = typeof originalNote.content === 'string' 
          ? originalNote.content 
          : '';
          
        originalNote.content = currentContent + '\n\n📋 Organization Tip: ' + suggestion.text;
        console.log('Added organization tip to content');
        break;
      }
      
      case 'research': {
        // Add research findings to note content with a special format
        const currentContent = typeof originalNote.content === 'string' 
          ? originalNote.content 
          : '';
          
        originalNote.content = currentContent + '\n\n🔍 Research Finding: ' + suggestion.text;
        console.log('Added research finding to content');
        break;
      }
      
      case 'schedule': {
        // Add schedule info as both a task and in the content
        if (!Array.isArray(originalNote.tasks)) {
          originalNote.tasks = [];
        }
        
        const newTask: Task = {
          id: `task-${Date.now()}-${originalNote.tasks.length}`,
          text: suggestion.text,
          done: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'Schedule',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Set due date for tomorrow
        };
        
        originalNote.tasks.push(newTask);
        
        // Also add to content
        const currentContent = typeof originalNote.content === 'string' 
          ? originalNote.content 
          : '';
          
        originalNote.content = currentContent + '\n\n⏰ Scheduled: ' + suggestion.text;
        console.log('Added scheduled item as task and content');
        break;
      }
      
      default:
        console.warn('Unknown suggestion type:', suggestion.type);
    }
  };
  
  // Apply selected suggestions to the note
  const finalizeBrainstormChanges = () => {
    console.log('Finalizing brainstorm changes');
    if (!brainstormNote) {
      console.error('No brainstorm note available for finalizing');
      return;
    }

    // If there are no selected suggestions, we just close the modal
    if (selectedSuggestions.length === 0) {
      console.log('No suggestions selected, closing modal');
      resetBrainstorm();
      return;
    }

    console.log('Applying selected suggestions:', selectedSuggestions);
    
    // Find the original note
    const originalNote = notes.find(n => n.id === brainstormNote.id);
    if (!originalNote) {
      console.error('Cannot find original note to update');
      resetBrainstorm();
      return;
    }

    // Make a copy of all notes to modify
    const newNotes = [...notes];
    const noteIndex = newNotes.findIndex(n => n.id === brainstormNote.id);
    
    if (noteIndex === -1) {
      console.error('Cannot find note index');
      resetBrainstorm();
      return;
    }

    // Get the note to modify
    const updatedNote = {...newNotes[noteIndex]};
    console.log('Original note before updates:', updatedNote);
    
    // Apply each selected suggestion
    selectedSuggestions.forEach(suggestion => {
      applySuggestion(suggestion);
    });
    
    // Add note from brainstorm to their respective note
    console.log('Updated note being saved:', updatedNote);
    newNotes[noteIndex] = updatedNote;
    
    // Update notes in state
    setNotes(newNotes);
    
    // Provide feedback to the user
    alert('Agentic assistant applied suggestions!');
    
    // Reset brainstorming state
    resetBrainstorm();
  };

  // Add a new state for note type selector
  const [showNoteTypeSelector, setShowNoteTypeSelector] = useState(false);
  const noteSelectorRef = useRef<HTMLDivElement>(null);

  // Add state for mini map
  const [miniMapViewport, setMiniMapViewport] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Add new state for canvas dimensions
  const [canvasWidth, setCanvasWidth] = useState(INITIAL_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(INITIAL_CANVAS_HEIGHT);
  const [showCanvasBoundaries, setShowCanvasBoundaries] = useState(true);

  // Add missing grid-related state variables
  const [gridVisible, setGridVisible] = useState(true);
  const [gridLayout, setGridLayout] = useState<GridLayoutType>('auto');
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(4);
  const [gridCells, setGridCells] = useState<any[]>([]);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  // Toggle note selection
  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId) 
        : [...prev, noteId]
    );
  };

  // Open and close alignment tool
  const openAlignmentTool = () => {
    setIsAlignmentOpen(true);
    setIsSelectMode(true);
  };

  const closeAlignmentTool = () => {
    setIsAlignmentOpen(false);
    setIsSelectMode(false);
    setSelectedNotes([]);
  };

  // Fix the handleRealTimeTranscription function
  const handleRealTimeTranscription = async (chunks: BlobPart[]) => {
    // Skip if we don't have enough audio data yet
    if (chunks.length < 2) {
      setDictationStatus('idle');
      return;
    }
    
    try {
      // Create an audio blob from the chunks
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      
      // Make sure we have enough data
      if (audioBlob.size < 1000) {
        console.warn('Audio blob is too small, waiting for more data');
        return;
      }
      
      // First show the user that something is happening
      setDictationStatus('processing');
      setProcessingStatus('Transcribing your recording...');
      
      // Perform full transcription on the complete audio
      try {
        // Extract key terms from notes for improved transcription accuracy
        const keyTerms = notes
          .filter(note => note.content && typeof note.content === 'string')
          .map(note => note.content as string);
          
        // Use our AI library transcription with key terms for better accuracy
        console.log('Sending audio blob to transcription API, size:', audioBlob.size);
        const transcript = await transcribeAudioWithKeyTerms(audioBlob, keyTerms);
        
        if (transcript) {
          console.log("Final transcript:", transcript);
          setVisibleTranscript(transcript);
          
          // Perform the full smart processing of the dictation
          setProcessingStatus('Processing content...');
          await processDictationTranscript(transcript);
          // Set dictation status to previewing to show results
          setDictationStatus('previewing');
        } else {
          console.error('Empty transcript returned');
          setDictationStatus('idle');
          setIsProcessing(false);
        }
      } catch (transcriptionError) {
        console.error('Error with full transcription:', transcriptionError);
        setDictationStatus('idle');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error during real-time transcription:', error);
      setDictationStatus('idle');
      setIsProcessing(false);
    }
  };

  // Update effect to use Web Speech API for truly real-time transcription
  useEffect(() => {
    if (!isRecording) {
      // Clear the transcript when not recording
      setRealtimeTranscript("");
      return;
    }
    
    // Immediate placeholder to show user something is happening
    setRealtimeTranscript("Listening...");
    
    // Initialize Web Speech API's SpeechRecognition for truly real-time transcription
    let recognition: any;
    
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Handle real-time transcription results
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Update the visible transcript in real-time
          setVisibleTranscript(prev => {
            // Only add final results to the accumulated transcript
            if (finalTranscript) {
              return prev + finalTranscript;
            }
            // Show interim results separately
            return prev + (interimTranscript ? ` [${interimTranscript}]` : '');
          });
        };
        
        // Handle errors
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          if (event.error === 'no-speech') {
            setVisibleTranscript(prev => prev + " [Waiting for speech...]");
          }
        };
        
        // Start recognition
        recognition.start();
        console.log('Web Speech API recognition started');
      } else {
        console.warn('Speech Recognition API not available in this browser');
        // Fall back to chunk-based approach using real audio chunks
        const intervalId = setInterval(() => {
          if (audioChunks.length > 0) {
            handleRealTimeTranscription(audioChunks);
          }
        }, 1000);
        
        return () => clearInterval(intervalId);
      }
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      // Fall back to chunk-based approach using real audio chunks
      const intervalId = setInterval(() => {
        if (audioChunks.length > 0) {
          handleRealTimeTranscription(audioChunks);
        }
      }, 1000);
      
      return () => clearInterval(intervalId);
    }
    
    // Clean up recognition when effect is unmounted
    return () => {
      if (recognition) {
        try {
          recognition.stop();
          console.log('Speech recognition stopped');
        } catch (e) {
          console.error('Error stopping speech recognition:', e);
        }
      }
    };
  }, [isRecording, audioChunks]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        const now = Date.now();
        if (now - lastCtrlPress < 500) { // Double press within 500ms
          if (isRecording) {
            stopRecording();
          } else {
            startRecording();
          }
        }
        setLastCtrlPress(now);
      }
      
      // Add keyboard shortcut for voice dictation (Cmd+D or Ctrl+D)
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]); // Add isRecording to the dependencies

  // Note type handling
  const handleAddNoteWithType = (type: string) => {
    // Map selected type to actual Note type
    const noteType: 'sticky' | 'task' | 'project' = 
      type === 'tasks' ? 'task' :
      type === 'project' ? 'project' :
      'sticky'; // default, brainstorm, calendar all map to sticky
    
    // Define colors based on note type
    const typeColors = {
      default: colors[Math.floor(Math.random() * colors.length)],
      tasks: 'green',
      project: 'blue',
      calendar: 'purple',
      brainstorm: 'yellow'
    };
    
    // Set initial content based on note type
    const initialContent = type === 'project' ? '# Project Note\n\n' : 
                          type === 'tasks' ? '# Task List\n\n' : 
                          type === 'calendar' ? '# Schedule\n\n' : 
                          type === 'brainstorm' ? '# Brainstorm\n\n' : 
                          '# Note\n\n';
    
    const newNote: NoteType = {
      id: `note-${Date.now()}`,
      content: initialContent,
      position: { x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 100 },
      tasks: [],
      type: noteType,
      color: typeColors[type as keyof typeof typeColors] || colors[Math.floor(Math.random() * colors.length)],
      expanded: true, // Ensure expanded is true
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Use addNote from the store which preserves the expanded property
    addNote(newNote);
    setShowNoteTypeSelector(false);
  };

  // Close note type selector if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (noteSelectorRef.current && !noteSelectorRef.current.contains(event.target as Node)) {
        setShowNoteTypeSelector(false);
      }
    }
    
    if (showNoteTypeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNoteTypeSelector]);
  
  // Replace the simple handleAddNote with a toggle function
  const toggleNoteTypeSelector = () => {
    setShowNoteTypeSelector(prev => !prev);
  };

  const handleNoteMove = useCallback((id: string, newPosition: Position) => {
    // Get the grid size from the CSS
    const GRID_SIZE = 100; // Main grid size
    const FINE_GRID_SIZE = 20; // Fine grid size
    
    // Snap to grid if grid is visible
    let snappedPosition = { ...newPosition };
    
    if (showGrid) {
      // Snap to the fine grid by default
      snappedPosition = {
        x: Math.round(newPosition.x / FINE_GRID_SIZE) * FINE_GRID_SIZE,
        y: Math.round(newPosition.y / FINE_GRID_SIZE) * FINE_GRID_SIZE
      };
      
      // If shift key is pressed, snap to the main grid
      if (window.event && (window.event as KeyboardEvent).shiftKey) {
        snappedPosition = {
          x: Math.round(newPosition.x / GRID_SIZE) * GRID_SIZE,
          y: Math.round(newPosition.y / GRID_SIZE) * GRID_SIZE
        };
      }
    }
    
    // No need to bound position since we're using an infinite canvas
    
    // Use a direct update instead of going through state if possible
    const noteElement = document.querySelector(`[data-note-id="${id}"]`) as HTMLDivElement | null;
    if (noteElement) {
      // Apply the transform directly for smoother animations during drag
      noteElement.style.transform = `translate3d(${snappedPosition.x}px, ${snappedPosition.y}px, 0)`;
      
      // Add snapping class for animation
      noteElement.classList.add('snapping');
      setTimeout(() => {
        noteElement.classList.remove('snapping');
      }, 200);
    }
    
    // Still update the state for persistence, but with a small delay to prevent stuttering
    requestAnimationFrame(() => {
      moveNote(id, snappedPosition);
    });
  }, [moveNote, showGrid]);

  const handleContentChange = useCallback((id: string, content: string) => {
    updateNote(id, { content });
  }, []);

  // Create a function to identify potential topics/sections in a transcript
  const identifyTopics = async (text: string) => {
    try {
      // This could be enhanced with an AI model to identify topic boundaries
      // For now, we'll use a simple approach to look for patterns indicating sections
      const patterns = [
        /next topic/i, /moving on/i, /additionally/i, 
        /furthermore/i, /in addition/i, /also/i, /now let's/i,
        /section:/i, /part:/i, /new item:/i, /point number/i
      ];
      
      let sections = [text];
      
      // Look for potential section breaks
      for (const pattern of patterns) {
        const newSections: string[] = [];
        sections.forEach(section => {
          const splits = section.split(pattern);
          if (splits.length > 1) {
            newSections.push(...splits.map(s => s.trim()).filter(s => s.length > 0));
          } else {
            newSections.push(section);
          }
        });
        sections = newSections;
      }
      
      // Filter out sections that are too short
      sections = sections.filter(section => section.length > 20);
      
      // If we didn't find any clear sections, return the original text
      return sections.length > 0 ? sections : [text];
    } catch (error) {
      console.error('Error identifying topics:', error);
      return [text];
    }
  };

  // Modify the processDictationTranscript function to fix type issues
  const processDictationTranscript = async (text: string) => {
    if (!text || text.trim().length === 0) {
      console.log('Empty transcript, nothing to process');
      setDictationStatus('idle');
      setIsProcessing(false);
      return;
    }
    
    try {
      setIsProcessing(true);
      setProcessingStatus('Analyzing voice transcript...');
      console.log('Processing transcript of length:', text.length);
      
      // Use the real AI categorization system from our library
      setProcessingStatus('Identifying tasks and categories...');
      console.log('Calling categorizeTasksAndSuggestNotes API...');
      
      const result = await categorizeTasksAndSuggestNotes(text);
      console.log('AI categorization complete:', result.noteGroups?.length || 0, 'note groups');
      
      // Create a list to store our new notes
      const previewNotesList: NoteType[] = [];
      
      // Process the note groups suggested by the AI
      if (result.noteGroups && result.noteGroups.length > 0) {
        // Create a note for each suggested group
        result.noteGroups.forEach((group, index) => {
          const now = new Date().toISOString();
          const groupTasks = group.taskIndices.map(idx => result.tasks[idx]);
          
          // Ensure we create the object with the correct type structure
          const newNote: NoteType = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'sticky', 
            content: `${group.title}\n\n${text}`,
            position: {
              x: (window.innerWidth / 2) - 150 + (index * 30),
              y: (window.innerHeight / 2) - 100 + (index * 30)
            },
            color: colors[Math.floor(Math.random() * colors.length)],
            category: group.category,
            tasks: groupTasks.map(task => ({
              id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              text: task.text,
              done: task.done || false,
              category: task.category,
              createdAt: now,
              updatedAt: now
            })),
            isVoiceNote: true, // Mark this as created from voice dictation
            createdAt: now,
            updatedAt: now
          };
          
          previewNotesList.push(newNote);
        });
      } else {
        // If AI couldn't categorize, create a single note with the full text
        const now = new Date().toISOString();
        const newNote: NoteType = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'sticky',
          content: text,
          position: {
            x: (window.innerWidth / 2) - 150,
            y: (window.innerHeight / 2) - 100
          },
          color: colors[Math.floor(Math.random() * colors.length)],
          isVoiceNote: true,
          createdAt: now,
          updatedAt: now
        };
        previewNotesList.push(newNote);
      }
      
      // Add the new notes to the canvas
      console.log('Creating', previewNotesList.length, 'new notes from dictation');
      const updatedNotes = [...notes, ...previewNotesList];
      setNotes(updatedNotes);
      
      // Set status
      setDictationStatus('idle');
      setProcessingStatus('Processing complete!');
      
    } catch (error) {
      console.error('Error processing dictation transcript:', error);
      // Fallback to simpler processing if the AI categorization fails
      createSimpleNoteFromText(text);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Fallback function to create a simple note if AI processing fails
  const createSimpleNoteFromText = (text: string) => {
    const now = new Date().toISOString();
    const newNote: NoteType = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'sticky',
      content: text,
      position: {
        x: (window.innerWidth / 2) - 150,
        y: (window.innerHeight / 2) - 100
      },
      color: colors[Math.floor(Math.random() * colors.length)],
      isVoiceNote: true,
      createdAt: now,
      updatedAt: now
    };
    
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    console.log('Created simple note as fallback:', newNote);
  };

  // Add a new function to handle brainstorming for any note
  const handleBrainstorm = useCallback(debounce((noteId: string) => {
    console.log('Debounced brainstorm called for note ID:', noteId);
    const note = notes.find(n => n.id === noteId);
    if (note) {
      // Make a deep copy to avoid reference issues
      const noteCopy = JSON.parse(JSON.stringify(note));
      
      // Check if we're already brainstorming this note
      if (brainstormNote && brainstormNote.id === noteId) {
        console.log('Already brainstorming this note, ignoring duplicate request');
        return;
      }
      
      openBrainstormModal(noteCopy);
    }
  }, 500), [notes, brainstormNote, openBrainstormModal]);

  // Reset brainstorm state
  const resetBrainstorm = () => {
    setBrainstormNote(null);
    setBrainstormSuggestions([]);
    setSelectedSuggestions([]);
  };

  const [isAdjustingColumns, setIsAdjustingColumns] = useState(false);
  const [assistantMode, setAssistantMode] = useState(true); // Enable assistant mode by default

  // Toggle suggestion selection
  const toggleSuggestionSelection = (suggestion: { id: string; type: string; text: string }) => {
    console.log('Toggling suggestion selection:', suggestion);
    
    // Check if the suggestion is already selected
    const isSelected = selectedSuggestions.some(s => s.id === suggestion.id);
    
    if (isSelected) {
      setSelectedSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } else {
      setSelectedSuggestions(prev => [...prev, suggestion]);
    }
  };

  // Add state for debouncing brainstorm clicks
  const [lastBrainstormClick, setLastBrainstormClick] = useState(0);

  const alignSelectedNotes = (alignment: 'left' | 'center' | 'right') => {
    // Implement alignment logic based on the alignment parameter
    console.log(`Aligning selected notes: ${alignment}`);
  };

  const distributeSelectedNotes = (distribution: 'vertical' | 'horizontal') => {
    // Implement distribution logic based on the distribution parameter
    console.log(`Distributing selected notes: ${distribution}`);
  };

  // Add state for the smart organize tool
  const [isSmartOrganizeOpen, setIsSmartOrganizeOpen] = useState(false);
  const [organizeStyle, setOrganizeStyle] = useState('by-grid');

  // New function for smart organization
  const smartOrganizeNotes = async (style: string) => {
    // Exit if there are no notes to organize
    if (!notes || notes.length === 0) return;
    
    setOrganizeStyle(style);
    
    try {
      // Only show the loading state if we're using the AI
      if (style === 'by-ai') {
        setIsLoading(true);
      }
      
      let organizedNotes: NoteType[] = [...notes];
      
      if (style === 'by-grid') {
        // Simply arrange notes in the existing grid cells
        arrangeNotesInCells();
        return;
      }
      else if (style === 'by-category') {
        // Group notes by their main category (use most frequent task category)
        const notesByCategory: {[key: string]: NoteType[]} = {};
        
        // Group notes by detected categories
        notes.forEach(note => {
          // Count categories in tasks
          const categoryCounts: {[key: string]: number} = {};
          note.tasks?.forEach(task => {
            const category = task.category || 'Uncategorized';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          });
          
          // Find the most common category
          let mainCategory = 'Uncategorized';
          let maxCount = 0;
          
          Object.entries(categoryCounts).forEach(([category, count]) => {
            if (count > maxCount) {
              maxCount = count;
              mainCategory = category;
            }
          });
          
          // Add note to the category group
          if (!notesByCategory[mainCategory]) {
            notesByCategory[mainCategory] = [];
          }
          notesByCategory[mainCategory].push(note);
        });
        
        // Calculate positions for each category group
        const categorySpacing = 400;
        const NOTES_PER_ROW = 3;
        const NOTE_SPACING = 50;
        const NOTE_WIDTH = 300;
        const NOTE_HEIGHT = 250;
        
        let categoryIndex = 0;
        
        // Position notes by category
        Object.entries(notesByCategory).forEach(([category, categoryNotes]) => {
          const categoryX = 100;
          const categoryY = 100 + (categoryIndex * categorySpacing);
          
          // Position notes in a grid within their category
          categoryNotes.forEach((note, i) => {
            const row = Math.floor(i / NOTES_PER_ROW);
            const col = i % NOTES_PER_ROW;
            
            const x = categoryX + (col * (NOTE_WIDTH + NOTE_SPACING));
            const y = categoryY + (row * (NOTE_HEIGHT + NOTE_SPACING));
            
            // Update note position
            const idx = organizedNotes.findIndex(n => n.id === note.id);
            if (idx !== -1) {
              organizedNotes[idx] = {
                ...organizedNotes[idx],
                position: { x, y }
              };
            }
          });
          
          categoryIndex++;
        });
        
        // Update all notes with their new positions
        setNotes(organizedNotes);
      }
      else if (style === 'by-ai') {
        // Use OpenAI to analyze and organize notes by context
        const noteContents = notes.map(note => {
          const taskTexts = note.tasks?.map(task => task.text).join('\n') || '';
          // Use optional content property
          return `Content: ${note.content || ''}\nTasks: ${taskTexts}`;
        });
        
        // Call the API to categorize and organize notes
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `Analyze the following notes and organize them into logical groups. 
              Create a layout where related notes are positioned near each other.
              
              Return a JSON object with:
              1. "categories" - Array of category names you've identified
              2. "noteGroups" - Object where keys are category names and values are arrays of note indices
              3. "layout" - Array of objects with note index and x,y coordinates (0-1000 range for both x and y)`
            },
            { role: 'user', content: noteContents.join('\n---\n') }
          ],
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          temperature: 0.3
        });
        
        const result = JSON.parse(completion.choices[0].message.content!);
        
        // Apply the new layout
        if (result.layout && Array.isArray(result.layout)) {
          result.layout.forEach((item: {index: number, x: number, y: number}) => {
            if (item.index >= 0 && item.index < notes.length) {
              organizedNotes[item.index] = {
                ...organizedNotes[item.index],
                position: { x: item.x, y: item.y }
              };
            }
          });
          
          // Update all notes with their new positions
          setNotes(organizedNotes);
        }
      }
    } catch (error) {
      console.error('Error organizing notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to open the smart organize tool
  const openSmartOrganizeTool = () => {
    setIsSmartOrganizeOpen(true);
  };

  // Function to close the smart organize tool
  const closeSmartOrganizeTool = () => {
    setIsSmartOrganizeOpen(false);
  };

  // Add state for canvas settings modal
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState(false);

  // Function to open canvas settings modal
  const openCanvasSettingsModal = () => {
    setIsCanvasSettingsOpen(true);
  };

  // Function to close canvas settings modal
  const closeCanvasSettingsModal = () => {
    setIsCanvasSettingsOpen(false);
  };

  // Add a function to handle filter changes
  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };
  
  // Add a function to handle sort changes
  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
  };
  
  // Add a function to filter and sort notes
  const filterAndSortNotes = useCallback(() => {
    // Start with all notes
    let result = [...notes];
    
    // Apply text search
    if (filters.searchTerm) {
      const searchTermLower = filters.searchTerm.toLowerCase();
      result = result.filter(note => {
        // Search in content
        if (note.content && note.content.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        // Search in tasks
        if (note.tasks && note.tasks.some(task => 
          task.text.toLowerCase().includes(searchTermLower) ||
          (task.category && task.category.toLowerCase().includes(searchTermLower))
        )) {
          return true;
        }
        
        // Search in category
        if (note.category && note.category.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        return false;
      });
    }
    
    // Filter by categories
    if (filters.categories.length > 0) {
      result = result.filter(note => {
        // Check note category
        if (note.category && filters.categories.includes(note.category)) {
          return true;
        }
        
        // Check task categories
        if (note.tasks && note.tasks.some(task => 
          task.category && filters.categories.includes(task.category)
        )) {
          return true;
        }
        
        return false;
      });
    }
    
    // Filter by priority
    if (filters.priorities.length > 0) {
      result = result.filter(note => {
        // Check note priority
        if (note.priority && filters.priorities.includes(note.priority)) {
          return true;
        }
        
        // Check task priorities
        if (note.tasks && note.tasks.some(task => 
          task.priority && filters.priorities.includes(task.priority)
        )) {
          return true;
        }
        
        return false;
      });
    }
    
    // Filter by has tasks
    if (filters.hasTasks !== null) {
      result = result.filter(note => {
        const hasTasks = note.tasks && note.tasks.length > 0;
        return filters.hasTasks ? hasTasks : !hasTasks;
      });
    }
    
    // Filter by due date status
    if (filters.dueDateStatus !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekFromToday = new Date(today);
      weekFromToday.setDate(today.getDate() + 7);
      
      result = result.filter(note => {
        // Handle case where no due date is required
        if (filters.dueDateStatus === 'none') {
          return !note.dueDate;
        }
        
        // Skip notes without due dates for other filter options
        if (!note.dueDate) {
          return false;
        }
        
        const dueDate = new Date(note.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        switch (filters.dueDateStatus) {
          case 'overdue':
            return dueDate < today;
          case 'today':
            return dueDate.getTime() === today.getTime();
          case 'thisWeek':
            return dueDate >= today && dueDate <= weekFromToday;
          case 'future':
            return dueDate > weekFromToday;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      // Calculate sort values based on sort field
      let valueA: any;
      let valueB: any;
      
      switch (sortOption.field) {
        case 'title':
          valueA = a.content || '';
          valueB = b.content || '';
          break;
        case 'priority':
          // Map priorities to numbers (high=3, medium=2, low=1, none=0)
          const priorityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
          valueA = a.priority ? priorityMap[a.priority] : 0;
          valueB = b.priority ? priorityMap[b.priority] : 0;
          break;
        case 'dueDate':
          valueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          valueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          break;
        case 'created':
          valueA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valueB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'updated':
          valueA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          valueB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          break;
        case 'completion':
          // Calculate completion percentage
          const getCompletionPercent = (note: NoteType) => {
            if (!note.tasks || note.tasks.length === 0) return 0;
            const completed = note.tasks.filter(t => t.done).length;
            return (completed / note.tasks.length) * 100;
          };
          valueA = getCompletionPercent(a);
          valueB = getCompletionPercent(b);
          break;
        case 'category':
          valueA = a.category || '';
          valueB = b.category || '';
          break;
        default:
          valueA = a.updatedAt;
          valueB = b.updatedAt;
      }
      
      // Apply direction
      const directionMultiplier = sortOption.direction === 'asc' ? 1 : -1;
      
      // Compare
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return valueA.localeCompare(valueB) * directionMultiplier;
      } else {
        return (valueA - valueB) * directionMultiplier;
      }
    });
    
    return result;
  }, [notes, filters, sortOption]);
  
  // Update filtered notes when notes, filters, or sort changes
  useEffect(() => {
    const result = filterAndSortNotes();
    setFilteredNotes(result);
  }, [notes, filters, sortOption, filterAndSortNotes]);

  // Function to toggle between canvas and kanban view
  const toggleViewMode = () => {
    // If transitioning to canvas view, reset transform to default
    if (viewMode === 'kanban' && viewportRef.current?.setTransform) {
      // Reset the transform before switching to ensure the canvas is properly positioned
      setTimeout(() => {
        if (viewportRef.current?.setTransform) {
          viewportRef.current.setTransform(
            window.innerWidth / 2, 
            window.innerHeight / 2, 
            1 // zoom level
          );
        }
      }, 50);
    }
    
    // Show a brief transition effect
    document.body.classList.add('view-transition');
    setTimeout(() => {
      document.body.classList.remove('view-transition');
    }, 300);
    
    setViewMode(prev => prev === 'canvas' ? 'kanban' : 'canvas');
  };

  // Function to handle opening a note from kanban
  const handleOpenNoteFromKanban = (noteId: string) => {
    setActiveNoteId(noteId);
    
    // First change to canvas view
    setViewMode('canvas');
    
    // Scroll to the note in canvas view
    const note = notes.find(n => n.id === noteId);
    if (note && viewportRef.current) {
      // Set the position in the next render cycle
      setTimeout(() => {
        if (viewportRef.current?.setTransform) {
          viewportRef.current.setTransform(
            -note.position.x + window.innerWidth / 2, 
            -note.position.y + window.innerHeight / 2, 
            1 // zoom level
          );
          
          // Flash effect to highlight the note
          const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
          if (noteElement) {
            noteElement.classList.add('highlight-note');
            setTimeout(() => {
              noteElement.classList.remove('highlight-note');
            }, 1500);
          }
        }
      }, 100);
    }
  };

  // Function to add existing kanban note to canvas
  const handleAddToCanvas = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note && updateNote) {
      // Generate a position near the center of the canvas
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const randomOffsetX = Math.random() * 200 - 100; // -100 to 100
      const randomOffsetY = Math.random() * 200 - 100; // -100 to 100
      
      // Update the note with a new position
      updateNote(noteId, {
        position: { 
          x: centerX + randomOffsetX, 
          y: centerY + randomOffsetY 
        },
        updatedAt: new Date().toISOString()
      });
      
      // Switch to canvas view to show the note
      handleOpenNoteFromKanban(noteId);
    }
  };

  // Function to return from kanban to canvas
  const handleGoBackToCanvas = () => {
    setViewMode('canvas');
  };

  // Handle alignment of notes
  const handleAlignNotes = (alignType: string) => {
    if (selectedNotes.length < 2) return;
    
    console.log(`Aligning notes: ${alignType}`);
    // Implement alignment logic based on the alignType
    // For example: 'left', 'center', 'right', 'top', 'middle', 'bottom'
    
    const selectedNoteObjects = notes.filter(note => selectedNotes.includes(note.id));
    
    // Example implementation for left alignment
    if (alignType === 'left') {
      const leftmostX = Math.min(...selectedNoteObjects.map(note => note.position.x));
      
      const updatedNotes = notes.map(note => {
        if (selectedNotes.includes(note.id)) {
          return {
            ...note,
            position: {
              ...note.position,
              x: leftmostX
            }
          };
        }
        return note;
      });
      
      setNotes(updatedNotes);
    }
    
    // Implement other alignment types similarly
  };
  
  // Handle distribution of notes
  const handleDistributeNotes = (distributeType: string) => {
    if (selectedNotes.length < 3) return; // Need at least 3 notes to distribute
    
    console.log(`Distributing notes: ${distributeType}`);
    // Implement distribution logic based on distributeType
    // For example: 'horizontal', 'vertical'
  };
  
  // Handle organization of notes
  const handleOrganizeNotes = (organizeType: string) => {
    console.log(`Organizing notes: ${organizeType}`);
    // Implement organization logic based on organizeType
    // For example: 'grid', 'columns', 'rows', 'stack', 'mindmap', etc.
  };
  
  // Toggle alignment panel visibility
  const toggleAlignmentPanel = () => {
    setShowAlignmentPanel(!showAlignmentPanel);
  };

  // Add the missing recording functions
  const startRecording = async () => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Starting recording...');
      
      // Add a visual indication that recording has started
      const micButton = document.querySelector('.mic-button') as HTMLElement;
      if (micButton) {
        micButton.classList.add('recording');
        micButton.setAttribute('title', 'Stop recording');
      }
      
      // Get real audio from the user's microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      mediaStreamRef.current = stream;
      
      // Create real MediaRecorder instance with optimal settings
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      // Reset chunks array
      setAudioChunks([]);
      
      // Event handler for receiving real audio data
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          console.log(`Received audio chunk: ${e.data.size} bytes`);
          setAudioChunks((chunks) => [...chunks, e.data]);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        setProcessingStatus('Processing audio...');
        
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          console.log(`Created audio blob of size ${audioBlob.size} bytes`);
          
          if (audioBlob.size > 1000) {
            setDictationStatus('processing');
            await handleRealTimeTranscription(audioChunks);
            setShowPreview(true);
          } else {
            console.warn('Audio recording was too short');
            setDictationStatus('idle');
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('Error transcribing audio:', error);
          setIsProcessing(false);
          setDictationStatus('idle');
          alert('Error transcribing audio. Please try again.');
        }
        
        // Stop all tracks to properly close the microphone
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped audio track:', track.kind);
          });
        }
      };
      
      // Start recording with smaller chunk intervals for better real-time feedback
      mediaRecorder.start(500); // Collect chunks every 500ms
      console.log('Started recording with MediaRecorder');
      
      // Update states
      setIsRecording(true);
      setDictationStatus('listening');
      setVisibleTranscript('');
      setRealtimeTranscript('Listening...');
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsProcessing(false);
      alert('Could not start recording. Please check that your microphone is connected and you have granted permission to use it.');
    }
  };

  const stopRecording = () => {
    setIsProcessing(true);
    setProcessingStatus('Finishing recording...');
    
    // Remove recording indicator
    const micButton = document.querySelector('.mic-button') as HTMLElement;
    if (micButton) {
      micButton.classList.remove('recording');
      micButton.setAttribute('title', 'Start recording');
    }
    
    // Properly stop the MediaRecorder if it's running
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('Stopping MediaRecorder');
      mediaRecorderRef.current.stop();
      
      // The onstop handler in startRecording will process the audio
    } else {
      console.warn('MediaRecorder was not active');
      setIsProcessing(false);
      setIsRecording(false);
      setDictationStatus('idle');
    }
    
    setIsRecording(false);
  };

  // Add the missing arrangeNotesInCells function
  const arrangeNotesInCells = () => {
    // Create a simple grid arrangement for notes
    const padding = 20;
    const maxWidth = 250;
    const maxHeight = 250;
    
    // Get a copy of notes to modify
    const organizedNotes = [...notes];
    
    // Define a simple grid with rows and columns
    const columns = Math.ceil(Math.sqrt(organizedNotes.length));
    const rows = Math.ceil(organizedNotes.length / columns);
    
    // Position each note in a grid cell
    organizedNotes.forEach((note, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      // Update note position
      note.position = {
        x: padding + col * (maxWidth + padding),
        y: padding + row * (maxHeight + padding)
      };
    });
    
    // Update notes with new positions
    setNotes(organizedNotes);
  };

  // Add updateMiniMapViewport function
  const updateMiniMapViewport = (state: any) => {
    try {
      if (state && typeof state.scale !== 'undefined') {
        console.log('Updating viewport map:', {
          x: state.positionX,
          y: state.positionY,
          scale: state.scale,
          windowSize: { width: window.innerWidth, height: window.innerHeight }
        });
        
        setMiniMapViewport({
          x: state.positionX,
          y: state.positionY,
          width: window.innerWidth / state.scale,
          height: window.innerHeight / state.scale
        });
      } else {
        console.log('Invalid state for minimap update');
      }
    } catch (error) {
      console.error('Error updating minimap viewport:', error);
    }
  };

  // Add handleDeleteNote function
  const handleDeleteNote = (id: string) => {
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
  };

  // Add missing cell handler functions
  const handleCellCreate = (cell: any) => {
    setGridCells([...gridCells, cell]);
  };

  const handleCellUpdate = (id: string, updates: any) => {
    setGridCells(gridCells.map(cell => 
      cell.id === id ? { ...cell, ...updates } : cell
    ));
  };

  const handleCellDelete = (id: string) => {
    setGridCells(gridCells.filter(cell => cell.id !== id));
  };

  // Add openNote function
  const openNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note && viewportRef.current?.setTransform) {
      viewportRef.current.setTransform(
        -note.position.x + window.innerWidth / 2,
        -note.position.y + window.innerHeight / 2,
        1
      );
    }
  };

  // Add missing preview functions
  const clearPreview = () => {
    setPreviewNotes([]);
    setShowPreview(false);
    setDictationStatus('idle');
  };

  const approveNotes = () => {
    // Add approved notes from preview to main notes
    setNotes([...notes, ...previewNotes]);
    clearPreview();
  };

  // Add these zoom and pan handler functions
  const handleZoom = (e: { state: any }): void => {
    // Update transform state on zoom
    try {
      if (e && e.state) {
        console.log('Zoom event:', {
          scale: e.state.scale,
          positionX: e.state.positionX,
          positionY: e.state.positionY
        });
        
        // Apply the transform directly for smoother zoom
        const canvasElement = document.querySelector('.react-transform-component') as HTMLElement;
        if (canvasElement) {
          canvasElement.style.willChange = 'transform';
        }
        
        if (viewportRef.current) {
          updateMiniMapViewport(e.state);
        }
      } else {
        console.log('Invalid zoom event state:', e);
      }
    } catch (error) {
      console.error('Error during zoom handling:', error);
    }
  };

  const handlePan = (e: { state: any }): void => {
    // Update transform state on pan
    try {
      if (e && e.state) {
        console.log('Pan event:', {
          scale: e.state.scale,
          positionX: e.state.positionX,
          positionY: e.state.positionY
        });
        
        // Apply the transform directly for smoother panning
        const canvasElement = document.querySelector('.react-transform-component') as HTMLElement;
        if (canvasElement) {
          canvasElement.style.willChange = 'transform';
        }
        
        if (viewportRef.current) {
          updateMiniMapViewport(e.state);
        }
      } else {
        console.log('Invalid pan event state:', e);
      }
    } catch (error) {
      console.error('Error during pan handling:', error);
    }
  };

  // Log viewport state on component mount
  useEffect(() => {
    // Log after a short delay to ensure the viewport is initialized
    const timer = setTimeout(() => {
      console.log('Initial canvas state:');
      logViewportState();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Add handleAddNote function
  const handleAddNote = () => {
    const newNote: NoteType = {
      id: `note-${Date.now()}`,
      content: '# New Note',
      position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
      type: 'sticky',
      color: 'blue',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addNote(newNote);
  };

  // Add a debug function to log current transform state
  const logViewportState = () => {
    if (viewportRef.current) {
      try {
        const state = viewportRef.current.state;
        if (state && typeof state.scale !== 'undefined') {
          console.log('Current viewport state:', {
            scale: state.scale,
            positionX: state.positionX,
            positionY: state.positionY,
            contentComponent: viewportRef.current.contentComponent,
            wrapperComponent: viewportRef.current.wrapperComponent
          });
        } else {
          console.log('Viewport state not initialized yet');
        }
      } catch (err) {
        console.log('Error accessing viewport state:', err);
      }
    } else {
      console.log('Viewport ref not available');
    }
  };

  // Add a keydown handler to trigger the log on F2 key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        console.log('--- Canvas Debug Info ---');
        logViewportState();
        console.log('Canvas dimensions:', {
          width: 4000,
          height: 2250
        });
        console.log('Notes count:', notes.length);
        console.log('----------------------');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [notes]);

  // Add a keydown handler to toggle grid with G key and for other shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 for debug info
      if (e.key === 'F2') {
        console.log('--- Canvas Debug Info ---');
        logViewportState();
        console.log('Canvas dimensions:', {
          width: INITIAL_CANVAS_WIDTH,
          height: INITIAL_CANVAS_HEIGHT
        });
        console.log('Notes count:', notes.length);
        console.log('----------------------');
      }
      
      // G key to toggle grid
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setShowGrid(prev => !prev);
        // Toggle the body class directly for immediate feedback
        document.body.classList.toggle('show-grid');
      }
    };

    // Apply grid class to body based on showGrid state
    if (showGrid) {
      document.body.classList.add('show-grid');
    } else {
      document.body.classList.remove('show-grid');
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [notes, showGrid]);

  return (
    <div className="h-full flex flex-col relative">
      {/* Dictation Status Overlay */}
      {dictationStatus !== 'idle' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card-bg p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-auto">
            {dictationStatus === 'listening' && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                      <Mic size={32} className="text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-2">Listening...</h2>
                <p className="text-gray-400 mb-4">Speak clearly into your microphone</p>
                <button 
                  onClick={stopRecording}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                  Stop Recording
                </button>
              </div>
            )}
            
            {dictationStatus === 'processing' && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center">
                    <Loader2 size={32} className="text-white animate-spin" />
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-2">Processing...</h2>
                <p className="text-gray-400 mb-4">{processingStatus}</p>
              </div>
            )}
            
            {dictationStatus === 'previewing' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Dictation Results</h2>
                  <button 
                    onClick={() => setDictationStatus('idle')}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-medium mb-2">Transcript:</h3>
                  <p className="whitespace-pre-wrap text-gray-300">{visibleTranscript}</p>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Generated Notes:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {notes.slice(-3).map((note) => {
                      // Extract a title from the content if possible
                      const content = note.content?.toString() || '';
                      const firstLine = content.split('\n')[0].replace(/^#+\s+/, '');
                      const title = firstLine.length > 0 ? firstLine : 'Untitled Note';
                      
                      return (
                        <div 
                          key={note.id}
                          className={`p-3 rounded-lg border-l-4 border-${note.color || 'blue'}-500 bg-gray-800`}
                        >
                          <h4 className="font-medium mb-1 truncate">{title}</h4>
                          <p className="text-sm text-gray-400 truncate">{content.substring(0, 100)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setDictationStatus('idle')}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 relative">
        <DndProvider backend={HTML5Backend}>
          {/* Add an infinite grid overlay that stays fixed regardless of panning */}
          <div className="infinite-grid-overlay"></div>
          
          {viewMode === 'canvas' ? (
            <TransformWrapper
              ref={viewportRef}
              initialScale={1}
              minScale={MIN_ZOOM}
              maxScale={MAX_ZOOM}
              wheel={{ 
                step: 0.03,
                smoothStep: 0.005,
                activationKeys: []
              }}
              onZoom={handleZoom}
              onPanning={handlePan}
              onInit={() => {
                console.log('TransformWrapper initialized');
                // Delay logging to ensure state is populated
                setTimeout(() => {
                  try {
                    if (viewportRef.current?.state) {
                      console.log('Initial transform state:', viewportRef.current.state);
                      logViewportState();
                    } else {
                      console.log('Transform state not available yet after init');
                    }
                  } catch (err) {
                    console.error('Error during transform init callback:', err);
                  }
                }, 1000);
              }}
              initialPositionX={0}
              initialPositionY={0}
              limitToBounds={false}
              disablePadding={true}
              minPositionX={-Infinity}
              maxPositionX={Infinity}
              minPositionY={-Infinity}
              maxPositionY={Infinity}
              panning={{ 
                disabled: false,
                velocityDisabled: false,
                lockAxisX: false,
                lockAxisY: false,
                activationKeys: [],
                excluded: []
              }}
              doubleClick={{ mode: "reset" }}
              centerOnInit={false}
            >
              {/* Toolbar */}
              <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-black/30 p-2 rounded">
                <button 
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                  onClick={handleAddNote}
                >
                  <Plus size={20} />
                </button>
                <button 
                  className={`p-2 ${isRecording ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'} rounded text-white`}
                  onClick={isRecording ? stopRecording : startRecording}
                  aria-label={isRecording ? "Stop recording" : "Start voice recording"}
                  title={isRecording ? "Stop recording" : "Start voice recording (⌘D)"}
                >
                  <Mic size={20} />
                </button>
                <button 
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  onClick={() => {
                    setShowGrid(!showGrid);
                    // Also log viewport state when toggling grid for easier debugging
                    console.log('Grid toggle - viewport state:');
                    logViewportState();
                  }}
                  title={`${showGrid ? 'Hide' : 'Show'} grid (G)`}
                >
                  <Grid size={20} />
                </button>
                <button 
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  onClick={toggleViewMode}
                  title={viewMode === 'canvas' ? "Switch to Kanban Board" : "Switch to Canvas"}
                >
                  {viewMode === 'canvas' ? <Trello size={20} /> : <Layout size={20} />}
                </button>
                <button 
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  onClick={openSmartOrganizeTool}
                >
                  <SlidersHorizontal size={20} />
                </button>
                <button 
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  onClick={() => {
                    // Reset canvas view
                    if (viewportRef.current?.resetTransform) {
                      viewportRef.current.resetTransform();
                    }
                  }}
                  title="Reset view"
                >
                  <Maximize2 size={20} />
                </button>
              </div>

              <TransformComponent
                wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing"
                contentClass="!w-full !h-full transform-gpu"
              >
                <div 
                  className="relative will-change-transform" 
                  style={{ 
                    width: "100%", 
                    height: "100%", 
                    backgroundImage: "none",
                    backgroundSize: '100px 100px',
                    transformOrigin: '0 0',
                    backgroundColor: 'transparent'
                  }}
                >
                  {notes.map((note) => (
                    <Note
                      key={note.id}
                      note={note}
                      onMove={handleNoteMove}
                      onContentChange={handleContentChange}
                    />
                  ))}
                </div>
              </TransformComponent>
            </TransformWrapper>
          ) : (
            <div className="h-full overflow-auto">
              <div className="p-4 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Kanban Board</h2>
                  <button 
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                    onClick={handleGoBackToCanvas}
                  >
                    <Layout size={20} />
                  </button>
                </div>
                
                <KanbanBoard 
                  onOpenNote={handleOpenNoteFromKanban}
                  onGoBackToCanvas={handleGoBackToCanvas}
                  onAddToCanvas={handleAddToCanvas}
                />
              </div>
            </div>
          )}
        </DndProvider>
      </div>
    </div>
  );
};