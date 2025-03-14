import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Note as NoteType, Position, Task } from '../types';
import { Note } from './Note';
import { Plus, Mic, Minus, Loader2, ListTodo, Settings as SettingsIcon, X, Layout, FileText, FolderOpen, UploadCloud, Book, FilePlus, Search, ChevronRight, ChevronLeft, AlignLeft, AlignCenter, AlignRight, Clipboard, Calendar, BrainCircuit, CheckSquare, Grid, Move, ArrowDown, ArrowRight } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Settings } from './Settings';
import { useNoteStore } from '../store/noteStore';
import { useDiscardStore } from '../store/discardStore';
import { categorizeTasksAndSuggestNotes, extractKeyTerms, transcribeAudio, transcribeAudioWithKeyTerms, enhanceTranscribedText } from '../lib/ai';
import { openai } from '../lib/openai';
import SidePanel from './SidePanel';
import CanvasGrid, { GridLayout, GridCell } from './CanvasGrid';
import { AlignmentTool } from './AlignmentTool';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { MarkdownImporter } from './MarkdownImporter';

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
const INITIAL_CANVAS_WIDTH = 4000;
const INITIAL_CANVAS_HEIGHT = 2250; // 16:9 aspect ratio
const CANVAS_EXPAND_SIZE = 1000; // Size to expand canvas when needed

interface CanvasProps {
  onSwitchToNotes: () => void;
}

export function Canvas({ onSwitchToNotes }: CanvasProps) {
  const { notes, addNote, moveNote, updateNote, addTask, settings, setNotes } = useNoteStore();
  const [isRecording, setIsRecording] = useState(false);
  const [lastCtrlPress, setLastCtrlPress] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const colors = ['blue', 'green', 'pink', 'yellow'];

  // Add a new state to track when we receive chunks of audio data
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);

  // Add a test mode to force the dictation panel to display
  const [testMode, setTestMode] = useState(false);

  // Add a state for the alignment tool
  const [isAlignmentOpen, setIsAlignmentOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);

  // Add new state variables for dictation preview and approval
  const [previewNotes, setPreviewNotes] = useState<NoteType[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [dictationStatus, setDictationStatus] = useState<'idle' | 'listening' | 'processing' | 'previewing'>('idle');

  // Add these references at the top under the state declarations
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Add state for the Markdown importer modal
  const [isMarkdownImporterOpen, setIsMarkdownImporterOpen] = useState(false);

  // Add to your component state
  const [hiddenNotes, setHiddenNotes] = useState<string[]>([]);
  const [showSidePanel, setShowSidePanel] = useState<boolean>(true);

  // Add a visible state for real-time transcription
  const [visibleTranscript, setVisibleTranscript] = useState('');
  
  // AI reasoning display state
  const [showAIReasoning, setShowAIReasoning] = useState(false);
  
  // Brainstorming state
  const [brainstormNote, setBrainstormNote] = useState<NoteType | null>(null);
  const [isLoadingBrainstorm, setIsLoadingBrainstorm] = useState(false);
  const [brainstormSuggestions, setBrainstormSuggestions] = useState<{id: string, type: string, text: string}[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Array<{ id: string; type: string; text: string }>>([]);

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
    
    // Check if we're already brainstorming
    if (brainstormNote) {
      console.log('Already brainstorming, cannot start another session');
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
      console.error('No brainstorm note to apply suggestion to');
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
        // Add a new task to the note
        if (!Array.isArray(originalNote.tasks)) {
          originalNote.tasks = [];
        }
        
        const newTask = {
          id: `task-${Date.now()}-${originalNote.tasks.length}`,
          text: suggestion.text,
          done: false,
          createdAt: new Date().toISOString(),
          category: originalNote.aiSuggestions?.category || 'General'
        };
        
        originalNote.tasks.push(newTask);
        console.log('Added new task:', newTask);
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
        
        const newTask = {
          id: `task-${Date.now()}-${originalNote.tasks.length}`,
          text: suggestion.text,
          done: false,
          createdAt: new Date().toISOString(),
          category: 'Schedule',
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Set due date for tomorrow
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
  const [miniMapViewport, setMiniMapViewport] = useState({ x: 0, y: 0, width: 100, height: 100 });

  // Add new state for canvas dimensions
  const [canvasWidth, setCanvasWidth] = useState(INITIAL_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(INITIAL_CANVAS_HEIGHT);
  const [showCanvasBoundaries, setShowCanvasBoundaries] = useState(true);

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
    if (chunks.length < 2) return;
    
    try {
      // Create an audio blob from the chunks
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      
      // Actually perform real-time transcription with the current audio chunk
      // instead of just simulating with random phrases
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        
        // Use Deepgram for real-time chunk transcription
        const arrayBuffer = await audioBlob.arrayBuffer();
        const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&interim_results=true', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${import.meta.env.VITE_DEEPGRAM_API_KEY}`,
            'Content-Type': 'audio/webm',
          },
          body: arrayBuffer,
        });
        
        if (response.ok) {
          const result = await response.json();
          const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
          
          if (transcript) {
            setVisibleTranscript(prev => {
              // Only add new content that isn't already in the transcript
              if (!prev.includes(transcript)) {
                return prev + " " + transcript;
              }
              return prev;
            });
          }
        }
      } catch (transcriptionError) {
        console.error('Error transcribing chunk:', transcriptionError);
      }
      
      // Show the user that transcription is happening by updating the UI immediately
      setDictationStatus('listening');
      
    } catch (error) {
      console.error('Error during real-time transcription:', error);
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
        // Fall back to chunk-based approach
        const intervalId = setInterval(() => {
          handleRealTimeTranscription(audioChunks);
        }, 1000);
        
        return () => clearInterval(intervalId);
      }
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      // Fall back to chunk-based approach
      const intervalId = setInterval(() => {
        handleRealTimeTranscription(audioChunks);
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lastCtrlPress, isRecording]);

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
      expanded: true // Ensure expanded is true
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
    // Ensure the note stays within reasonable bounds
    const boundedPosition = {
      x: Math.max(-500, Math.min(newPosition.x, 9500)),
      y: Math.max(-500, Math.min(newPosition.y, 9500)),
    };
    
    // Use a direct update instead of going through state if possible
    const noteElement = document.querySelector(`[data-note-id="${id}"]`) as HTMLDivElement | null;
    if (noteElement) {
      // Apply the transform directly for smoother animations during drag
      noteElement.style.transform = `translate3d(${boundedPosition.x}px, ${boundedPosition.y}px, 0)`;
    }
    
    // Still update the state for persistence, but with a small delay to prevent stuttering
    requestAnimationFrame(() => {
      moveNote(id, boundedPosition);
    });
  }, [moveNote]);

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

  // Modify the categorization flow to preview instead of direct creation
  const processDictationTranscript = async (text: string) => {
    setProcessingStatus('Analyzing transcript...');
    console.log('Processing transcript:', text.substring(0, 50) + '...');
    
    // Show processing feedback to the user
    setIsProcessing(true);
    setDictationStatus('processing');
    
    // Store the transcript so it's visible during processing
    setVisibleTranscript(text);
    
    const previewNotesList: NoteType[] = [];
    
    try {
      // First, use AI to categorize tasks and suggest note groups
      setProcessingStatus('Categorizing tasks and identifying note groups...');
      
      const categorizedResult = await categorizeTasksAndSuggestNotes(text);
      console.log('Categorization result:', 
        `${categorizedResult.noteGroups.length} groups, ${categorizedResult.tasks.length} tasks`);
      
      // Create a preview note for each note group
      setProcessingStatus(`Creating ${categorizedResult.noteGroups.length} categorized note previews...`);
      
      for (let groupIndex = 0; groupIndex < categorizedResult.noteGroups.length; groupIndex++) {
        const group = categorizedResult.noteGroups[groupIndex];
        
        // Get the tasks for this group
        const groupTasks = group.taskIndices.map(index => {
          const task = categorizedResult.tasks[index];
          return {
            id: `task-${Date.now()}-${index}`,
            text: task.text,
            done: false,
            category: task.category || 'general'
          };
        });
        
        // Create position with slight offset for each note
        const position: Position = {
          x: (window.innerWidth / 2) - 150 + (groupIndex * 50), 
          y: (window.innerHeight / 2) - 100 + (groupIndex * 50)
        };
        
        // Determine the note color based on category if possible
        const categoryName = group.category.toLowerCase();
        const noteColor = 
          categoryName.includes('work') ? 'blue' : 
          categoryName.includes('personal') ? 'green' :
          categoryName.includes('health') || categoryName.includes('fitness') ? 'pink' :
          categoryName.includes('shop') ? 'yellow' :
          colors[Math.floor(Math.random() * colors.length)];
        
        // Create the note
        const newNote: NoteType = {
          id: `preview-${groupIndex}-${Date.now()}`,
          content: group.title || `${group.category} Tasks`,
          type: 'task',
          color: noteColor,
          position,
          tasks: groupTasks,
          aiSuggestions: {
            reasoning: categorizedResult.reasoning,
            category: group.category,
            taskCount: groupTasks.length
          }
        };
        
        previewNotesList.push(newNote);
      }
      
      // If we didn't find any task groups, create a simple note from text segments
      if (previewNotesList.length === 0) {
        setProcessingStatus('Creating notes from text segments...');
        const textSegments = await identifyTopics(text);
        
        for (let i = 0; i < textSegments.length; i++) {
          const segment = textSegments[i];
          
          // Generate a meaningful title from the first line
          let title = segment.split(/[.!?]/)[0].slice(0, 30).trim();
          if (!title) {
            title = 'New Note';
          }
          
          // Create position with slight offset for each note
          const position: Position = {
            x: (window.innerWidth / 2) - 150 + (i * 30), 
            y: (window.innerHeight / 2) - 100 + (i * 30)
          };
          
          // Create the note 
          const newNote: NoteType = {
            id: `preview-${i}-${Date.now()}`,
            content: `${title}\n\n${segment}`,
            type: 'sticky',
            color: colors[Math.floor(Math.random() * colors.length)],
            position,
            tasks: []
          };
          
          previewNotesList.push(newNote);
        }
      }
      
      // Final processing status before showing preview
      setProcessingStatus('Preparing preview of your notes...');
      
      // Give a slight delay so the user can see the final processing status
      setTimeout(() => {
        // Update state for preview
        setPreviewNotes(previewNotesList);
        setShowPreview(true);
        setDictationStatus('previewing');
        setIsProcessing(false);
        
        console.log('Preview notes ready:', previewNotesList.length);
      }, 500);
      
    } catch (error) {
      console.error('Error processing dictation:', error);
      // Create a single fallback note with the raw transcript
      const fallbackNote: NoteType = {
        id: `preview-fallback-${Date.now()}`,
        content: `Dictated Note\n\n${text}`,
        type: 'sticky',
        color: colors[Math.floor(Math.random() * colors.length)],
        position: {
          x: (window.innerWidth / 2) - 150,
          y: (window.innerHeight / 2) - 100
        },
        tasks: []
      };
      
      setPreviewNotes([fallbackNote]);
      setShowPreview(true);
      setDictationStatus('previewing');
      setIsProcessing(false);
      
      console.log('Created fallback note due to processing error');
    }
  };

  // Fix the startRecording function to immediately show feedback
  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      
      // Clear any previous transcript and set recording state IMMEDIATELY
      // This is crucial - set all UI states before any async operations
      setIsRecording(true);
      setDictationStatus('listening');
      setVisibleTranscript('');
      setAudioChunks([]);
      
      // Force the dictation panel to be visible with a timeout
      document.body.classList.add('recording-active');
      
      // Provide immediate feedback that recording is starting
      setVisibleTranscript("Initializing dictation system...");
      
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted:', stream);
        mediaStreamRef.current = stream;
        
        // Setup media recorder for the final audio processing
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        console.log('MediaRecorder created:', recorder);
        
        const chunks: BlobPart[] = [];
        
        recorder.ondataavailable = (e) => {
          console.log('Audio data available:', e.data.size, 'bytes');
          if (e.data.size > 0) {
            chunks.push(e.data);
            setAudioChunks(prevChunks => [...prevChunks, e.data]);
          }
        };
        
        recorder.onstart = () => {
          console.log('MediaRecorder started');
          // Update UI to show we're actively recording
          setVisibleTranscript("Dictation active. Start speaking...");
        };
        
        recorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
        };
        
        recorder.onstop = async () => {
          console.log('MediaRecorder onstop event triggered');
          setIsProcessing(true);
          setDictationStatus('processing');
          setProcessingStatus('Transcribing audio...');
          
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          console.log('Audio blob created:', audioBlob.size, 'bytes');
          
          try {
            // Get all note content to extract key terms
            const allNoteContents = notes.map(note => typeof note.content === 'string' ? note.content : '');
            
            // Extract key terms from existing notes to improve transcription accuracy
            setProcessingStatus('Analyzing existing notes for key terms...');
            const keyTerms = await extractKeyTerms(allNoteContents);
            
            // Use enhanced transcription with key terms for better accuracy
            setProcessingStatus('Transcribing audio with enhanced accuracy...');
            const text = keyTerms.length > 0 
              ? await transcribeAudioWithKeyTerms(audioBlob, keyTerms)
              : await transcribeAudio(audioBlob);
            
            // Use OpenAI to enhance the text quality and make it more natural
            setProcessingStatus('Enhancing transcription to sound more natural...');
            const enhancedText = await enhanceTranscribedText(text);
            
            console.log('Transcription complete:', enhancedText.substring(0, 50) + '...');
            
            // Process the enhanced transcript for preview
            await processDictationTranscript(enhancedText);
          } catch (error) {
            console.error('Error processing recording:', error);
            setIsProcessing(false);
            setIsRecording(false);
            setDictationStatus('idle');
            console.log('Error processing your recording. Please try again.');
          }
        };
        
        console.log('Starting MediaRecorder...');
        recorder.start(1000); // Capture audio in 1-second chunks
        console.log('MediaRecorder started');
        
      } catch (micError: any) {
        console.error('Error accessing microphone:', micError);
        console.log(`Could not access microphone: ${micError.message || 'Unknown error'}`);
        setIsRecording(false);
        setDictationStatus('idle');
        document.body.classList.remove('recording-active');
      }
    } catch (error) {
      console.error('Error in startRecording:', error);
      setIsRecording(false);
      setDictationStatus('idle');
      document.body.classList.remove('recording-active');
      console.log('Could not start recording. Please check permissions and try again.');
    }
  };

  // Update the stopRecording function to ensure the recording state is properly cleaned up
  const stopRecording = () => {
    console.log('stopRecording called, current refs:', { 
      mediaRecorderRef: mediaRecorderRef.current, 
      mediaStreamRef: mediaStreamRef.current
    });
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        console.log('Stopping MediaRecorder...');
        mediaRecorderRef.current.stop();
        console.log('MediaRecorder stopped');
        
        // Stop all tracks in the stream
        if (mediaStreamRef.current) {
          console.log('Stopping media stream tracks...');
          mediaStreamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('Track stopped:', track.kind);
          });
        }
        
        // Don't reset recording state here as we want to show the preview
        // setIsRecording will happen after preview approval/rejection
      } catch (error) {
        console.error('Error stopping recorder:', error);
        setIsRecording(false);
        setDictationStatus('idle');
        document.body.classList.remove('recording-active');
      }
    } else {
      console.log('MediaRecorder not available or already inactive');
      setIsRecording(false);
      setDictationStatus('idle');
      document.body.classList.remove('recording-active');
    }
  };

  // Update the clearPreview function to properly clean up
  const clearPreview = () => {
    console.log('Clearing preview and resetting recording state');
    setPreviewNotes([]);
    setShowPreview(false);
    setIsRecording(false);
    setDictationStatus('idle');
    document.body.classList.remove('recording-active');
    
    // Clean up references
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Improved approveNotes for better logging 
  const approveNotes = () => {
    console.log('Approving notes:', previewNotes.length);
    previewNotes.forEach(note => {
      console.log('Adding note:', note.type, 'with tasks:', note.tasks?.length || 0);
      addNote(note);
    });
    clearPreview();
  };

  // Add function to toggle note visibility
  const toggleNoteVisibility = (id: string) => {
    setHiddenNotes(prev => {
      if (prev.includes(id)) {
        return prev.filter(noteId => noteId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Update the openNote function
  const openNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note && hiddenNotes.includes(id)) {
      // Unhide the note first if needed
      toggleNoteVisibility(id);
    }
    
    // Find the note element using the data attribute
    const noteElement = document.querySelector(`[data-note-id="note-${id}"]`);
    if (noteElement) {
      // Scroll to the note with a small animation
      noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Flash the note briefly to highlight it
      noteElement.classList.add('highlight-note');
      setTimeout(() => {
        noteElement.classList.remove('highlight-note');
      }, 2000);
    }
  };

  // Add delete note function
  const handleDeleteNote = (noteId: string) => {
    // Use the existing notes state and update it
    const updatedNotes = notes.filter(note => note.id !== noteId);
    setNotes(updatedNotes);
  };
  
  // Update the task update function to properly call the content change handler
  const handleTaskUpdate = (noteId: string, taskId: string, updates: Partial<Task>) => {
    // Find the note to update
    const noteToUpdate = notes.find(note => note.id === noteId);
    
    if (!noteToUpdate || !noteToUpdate.tasks) return;
    
    // Update the specific task within this note
    const updatedTasks = noteToUpdate.tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    
    // Create the updated note
    const updatedNote = {
      ...noteToUpdate,
      tasks: updatedTasks
    };
    
    // Update the note in state
    const updatedNotes = notes.map(note => 
      note.id === noteId ? updatedNote : note
    );
    
    // Update the state
    setNotes(updatedNotes);
  };

  // Check if notes is undefined or empty and provide a fallback
  useEffect(() => {
    // If notes are empty or undefined, we should create a default note
    if (!notes || notes.length === 0) {
      // Add a default note if none exist
      const defaultNote: NoteType = {
        id: crypto.randomUUID(),
        type: 'sticky',
        content: 'Welcome to Project Manager',
        position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
        color: 'blue',
        tasks: [],
        expanded: true
      };
      
      // Add the default note using the store function
      addNote(defaultNote);
    }
  }, [notes, addNote]);

  // Function to update mini map viewport position
  const updateMiniMapViewport = (transformState: any) => {
    if (!transformState) return;
    
    const { scale, positionX, positionY } = transformState;
    
    // Calculate the visible portion of the canvas based on current window size and scale
    const visibleWidthInCanvas = window.innerWidth / scale;
    const visibleHeightInCanvas = window.innerHeight / scale;
    
    // The visible area starts at (-positionX / scale, -positionY / scale) in canvas coordinates
    // and extends for (visibleWidth, visibleHeight)
    const visibleLeft = -positionX / scale;
    const visibleTop = -positionY / scale;
    
    // Calculate the percentage of the canvas that is visible
    const viewportX = (visibleLeft / canvasWidth) * 100;
    const viewportY = (visibleTop / canvasHeight) * 100;
    const viewportWidth = (visibleWidthInCanvas / canvasWidth) * 100;
    const viewportHeight = (visibleHeightInCanvas / canvasHeight) * 100;
    
    // Ensure viewport stays within bounds
    setMiniMapViewport({
      x: Math.max(0, Math.min(100 - viewportWidth, viewportX)),
      y: Math.max(0, Math.min(100 - viewportHeight, viewportY)),
      width: Math.min(100, viewportWidth),
      height: Math.min(100, viewportHeight)
    });
  };

  // Function to expand canvas in a specific direction
  const expandCanvas = (direction: 'right' | 'bottom' | 'left' | 'top') => {
    switch (direction) {
      case 'right':
        setCanvasWidth(prev => prev + CANVAS_EXPAND_SIZE);
        break;
      case 'bottom':
        setCanvasHeight(prev => prev + CANVAS_EXPAND_SIZE);
        break;
      case 'left':
        // For left expansion, we need to shift all notes to accommodate the new space
        setCanvasWidth(prev => prev + CANVAS_EXPAND_SIZE);
        notes.forEach(note => {
          moveNote(note.id, { 
            x: note.position.x + CANVAS_EXPAND_SIZE, 
            y: note.position.y 
          });
        });
        break;
      case 'top':
        // For top expansion, we need to shift all notes to accommodate the new space
        setCanvasHeight(prev => prev + CANVAS_EXPAND_SIZE);
        notes.forEach(note => {
          moveNote(note.id, { 
            x: note.position.x, 
            y: note.position.y + CANVAS_EXPAND_SIZE 
          });
        });
        break;
    }
  };
  
  // Check if any notes are near the canvas boundaries
  useEffect(() => {
    const BOUNDARY_THRESHOLD = 200; // pixels from edge to trigger warning
    
    const nearBoundary = notes.some(note => 
      note.position.x < BOUNDARY_THRESHOLD || 
      note.position.y < BOUNDARY_THRESHOLD ||
      note.position.x > canvasWidth - BOUNDARY_THRESHOLD ||
      note.position.y > canvasHeight - BOUNDARY_THRESHOLD
    );
    
    if (nearBoundary) {
      // Show visual indication that notes are near boundary
      setShowCanvasBoundaries(true);
    } else if (showCanvasBoundaries) {
      // Hide boundaries after a delay if no notes are near
      const timer = setTimeout(() => {
        setShowCanvasBoundaries(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notes, canvasWidth, canvasHeight, showCanvasBoundaries]);

  // Grid state
  const [gridLayout, setGridLayout] = useState<GridLayout>('none');
  const [gridVisible, setGridVisible] = useState(false);
  const [columns, setColumns] = useState(2);
  const [rows, setRows] = useState(2);
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  
  // Helper to get note dimensions based on canvas transform
  const getNoteCanvasPosition = (note: NoteType) => {
    return {
      x: note.position.x,
      y: note.position.y
    };
  };
  
  // Function to toggle grid visibility
  const toggleGridVisibility = () => {
    setGridVisible(!gridVisible);
  };
  
  // Function to handle creating a grid cell
  const handleCellCreate = (cell: GridCell) => {
    // Avoid duplicating cells when recreating layouts
    if (gridLayout !== 'custom') {
      setGridCells(prevCells => {
        // For predefined layouts, replace cells entirely
        return [...prevCells.filter(c => !cell.id.includes(c.id)), cell];
      });
    } else {
      setGridCells(prevCells => [...prevCells, cell]);
    }
  };
  
  // Function to handle updating a grid cell
  const handleCellUpdate = (id: string, updates: Partial<GridCell>) => {
    setGridCells(prevCells => 
      prevCells.map(cell => cell.id === id ? { ...cell, ...updates } : cell)
    );
  };
  
  // Function to handle deleting a grid cell
  const handleCellDelete = (id: string) => {
    setGridCells(prevCells => prevCells.filter(cell => cell.id !== id));
  };
  
  // Function to determine which cell a note belongs to
  const getNoteCell = (note: NoteType): string | null => {
    if (!gridVisible || gridLayout === 'none' || gridCells.length === 0) {
      return null;
    }
    
    const { x, y } = getNoteCanvasPosition(note);
    
    // Find the cell that contains this position
    for (const cell of gridCells) {
      if (
        x >= cell.x && 
        x <= cell.x + cell.width && 
        y >= cell.y && 
        y <= cell.y + cell.height
      ) {
        return cell.id;
      }
    }
    
    return null;
  };
  
  // Find cell that a note belongs to
  const organizeNotesByCell = () => {
    const cellMap: Record<string, NoteType[]> = {};
    
    // Initialize with empty arrays for all cells
    gridCells.forEach(cell => {
      cellMap[cell.id] = [];
    });
    
    // Group notes by their cells
    notes.forEach(note => {
      const cellId = getNoteCell(note);
      if (cellId) {
        if (!cellMap[cellId]) {
          cellMap[cellId] = [];
        }
        cellMap[cellId].push(note);
      }
    });
    
    return cellMap;
  };
  
  // Function to automatically arrange notes within cells
  const arrangeNotesInCells = () => {
    const cellMap = organizeNotesByCell();
    const newNotes = [...notes];
    
    // For each cell, arrange its notes in a grid pattern
    Object.entries(cellMap).forEach(([cellId, cellNotes]) => {
      if (cellNotes.length === 0) return;
      
      const cell = gridCells.find(c => c.id === cellId);
      if (!cell) return;
      
      // Arrange notes in the cell
      const padding = 20;
      const maxWidth = Math.max(...cellNotes.map(note => note.size?.width || 200));
      const maxHeight = Math.max(...cellNotes.map(note => note.size?.height || 200));
      
      const cols = Math.floor((cell.width - padding) / (maxWidth + padding));
      const rows = Math.ceil(cellNotes.length / Math.max(1, cols));
      
      cellNotes.forEach((note, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const noteIndex = newNotes.findIndex(n => n.id === note.id);
        if (noteIndex >= 0) {
          newNotes[noteIndex] = {
            ...newNotes[noteIndex],
            position: {
              ...newNotes[noteIndex].position,
              x: cell.x + padding + col * (maxWidth + padding),
              y: cell.y + padding + row * (maxHeight + padding)
            }
          };
        }
      });
    });
    
    setNotes(newNotes);
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

  return (
    <div className="canvas-container h-full relative">
      {/* Enhanced Header with Better UI */}
      <div className="canvas-header">
        <div className="header-left">
          <h1 className="app-title">Project Manager</h1>
          
          <div className="viewport-select">
            <button className="viewport-btn active">
              <Grid size={18} />
              <span>Notes</span>
            </button>
            <button className="viewport-btn">
              <Calendar size={18} />
              <span>ViewportSelect</span>
            </button>
          </div>
        </div>
        
        <div className="header-center">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search notes and tasks..."
              className="main-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="clear-search-button"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        
        <div className="header-right">
          <div className="header-actions">
            <button 
              className="header-button"
              onClick={onSwitchToNotes}
              title="Switch to Notes View"
            >
              <Layout size={18} />
              <span>Notes View</span>
            </button>
            
            <button 
              className="header-button"
              onClick={() => setIsMarkdownImporterOpen(true)}
              title="Import notes from Markdown"
            >
              <FileText size={18} />
              <span>Import</span>
            </button>
            
            <button
              className={`header-button ${isSelectMode ? 'active' : ''}`}
              onClick={() => setIsSelectMode(!isSelectMode)}
              title={isSelectMode ? "Exit selection mode" : "Enter selection mode"}
            >
              <ListTodo size={18} />
              <span>{isSelectMode ? 'Exit Select' : 'Select'}</span>
            </button>
            
            {isSelectMode && (
              <button
                className="header-button"
                onClick={openAlignmentTool}
                title="Align selected notes"
              >
                <Layout size={18} />
                <span>Align</span>
              </button>
            )}
            
            <button 
              className="header-button side-panel-toggle"
              onClick={() => setShowSidePanel(prev => !prev)}
              title={showSidePanel ? "Hide Notes Panel" : "Show Notes Panel"}
            >
              {showSidePanel ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              <span>Panel</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Floating Action Button - Enhanced for dictation */}
      <div className="floating-actions-wrapper">
        <button
          className={`floating-action primary floating-mic ${isRecording ? 'recording pulse-animation' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          aria-label={isRecording ? "Stop recording" : "Start recording with voice"}
          title={isRecording ? "Stop recording" : "Start recording with voice"}
        >
          {isRecording ? (
            <div className="relative">
              <Mic className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            </div>
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </button>

        <button
          className="floating-action secondary"
          onClick={() => handleAddNoteWithType('sticky')}
          aria-label="Add note"
          title="Add new note"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
      
      {/* Prominent Add Note Button - Bottom Right */}
      <div className="floating-action-container bottom">
        <div className="note-type-selector-wrapper" ref={noteSelectorRef}>
          <button
            onClick={toggleNoteTypeSelector}
            className="floating-action secondary"
            aria-label="Add new note"
            title="Add new note"
          >
            <Plus className="w-6 h-6" />
          </button>
          
          {showNoteTypeSelector && (
            <div className="note-type-selector">
              <div className="note-type-header">
                <h4>Select Note Type</h4>
              </div>
              <div className="note-type-options">
                <button 
                  className="note-type-option" 
                  onClick={() => handleAddNoteWithType('default')}
                  title="Basic note for general content"
                >
                  <FileText size={18} />
                  <span>Basic Note</span>
                </button>
                <button 
                  className="note-type-option" 
                  onClick={() => handleAddNoteWithType('tasks')}
                  title="Task list for tracking to-dos"
                >
                  <CheckSquare size={18} />
                  <span>Task List</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Microphone Button - Now in bottom right with pink styling */}
      <div className="floating-mic">
        <button
          className={`floating-mic-button ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? 'Stop Recording' : 'Start Voice Recording'}
        >
          <Mic size={24} />
        </button>
      </div>
      
      {/* Agent Assistant Indicator with improved tooltip */}
      {settings && settings.aiEnabled && (
        <div className="agent-assistant-indicator" title="AI Assistant is active">
          <div className="agent-assistant-tooltip">
            <h4>Agent Assistant Active</h4>
            <p>The AI assistant is enabled and can help with:</p>
            <ul>
              <li>Suggesting related tasks</li>
              <li>Organizing your notes</li>
              <li>Enhancing dictation quality</li>
              <li>Brainstorming ideas</li>
            </ul>
          </div>
          <BrainCircuit size={20} className="agent-assistant-icon" />
        </div>
      )}
      
      {/* Quick Alignment Widget - Always Available */}
      <div className="quick-alignment-widget">
        <button 
          className="quick-alignment-btn" 
          onClick={() => alignSelectedNotes('left')}
          title="Align left"
        >
          <AlignLeft size={18} />
        </button>
        <button 
          className="quick-alignment-btn" 
          onClick={() => alignSelectedNotes('center')}
          title="Align center"
        >
          <AlignCenter size={18} />
        </button>
        <button 
          className="quick-alignment-btn" 
          onClick={() => alignSelectedNotes('right')}
          title="Align right"
        >
          <AlignRight size={18} />
        </button>
        <button 
          className="quick-alignment-btn" 
          onClick={() => distributeSelectedNotes('vertical')}
          title="Distribute vertically"
        >
          <ArrowDown size={18} />
        </button>
        <button 
          className="quick-alignment-btn" 
          onClick={() => distributeSelectedNotes('horizontal')}
          title="Distribute horizontally"
        >
          <ArrowRight size={18} />
        </button>
      </div>
      
      {/* Improved Dictation Panel - Enhanced visibility */}
      {(isRecording || dictationStatus === 'listening') && (
        <div className="dictation-panel fixed top-16 left-0 right-0 bg-card-bg border-b-2 border-accent-pink p-4 z-10 shadow-lg">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium flex items-center">
                <Mic className="h-5 w-5 mr-2 text-accent-pink" />
                <span>Voice Recording</span>
                <span className="ml-2 text-xs px-2 py-0.5 bg-accent-pink text-white rounded-full animate-pulse">ACTIVE</span>
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  className="btn-icon text-text-secondary hover:text-text-primary"
                  onClick={stopRecording}
                  aria-label="Stop recording"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="transcript-area bg-node-bg p-4 rounded-md min-h-[120px] border border-border-light overflow-y-auto max-h-[300px]">
              {visibleTranscript ? (
                <p className="text-text-primary whitespace-pre-line">
                  {visibleTranscript}
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center h-[100px] text-text-secondary">
                  <Mic className="h-8 w-8 mb-2 animate-pulse text-accent-pink" />
                  <span className="italic">Listening... Speak now.</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-text-secondary">
                <span className="inline-flex items-center">
                  <span className="animate-pulse mr-2 w-2 h-2 rounded-full bg-accent-pink"></span>
                  Microphone is active - speak clearly
                </span>
              </div>
              
              <button 
                className="btn-secondary bg-accent-pink hover:bg-accent-pink/90 text-white px-4 py-2 rounded-md"
                onClick={stopRecording}
              >
                Stop Recording
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Recording Badge - Always visible when recording */}
      {isRecording && (
        <div className="dictation-badge fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-accent-pink text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50">
          <span className="animate-pulse w-3 h-3 rounded-full bg-white"></span>
          <span>Recording Active</span>
        </div>
      )}
      
      {/* Main Canvas Area */}
      <div className={`canvas ${showSidePanel ? 'canvas-with-side-panel' : ''}`}>
        <TransformWrapper
          initialScale={1}
          minScale={MIN_ZOOM}
          maxScale={MAX_ZOOM}
          wheel={{ step: ZOOM_STEP }}
          limitToBounds={false}
          doubleClick={{ disabled: true }}
          onTransformed={(ref) => updateMiniMapViewport(ref.state)}
        >
          {({ zoomIn, zoomOut, setTransform }) => (
            <>
              <TransformComponent 
                wrapperClass="!w-full !h-full" 
                contentClass="!bg-app-bg"
              >
                <div className="relative" style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>
                  {/* Grid Pattern */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
                  
                  {/* Canvas Boundaries */}
                  {showCanvasBoundaries && (
                    <>
                      {/* Boundary Indicators */}
                      <div className="absolute inset-0 border-2 border-dashed border-accent-blue/30 pointer-events-none"></div>
                        
                      {/* Expansion Buttons */}
                      <button 
                        className="canvas-expand-button right"
                        onClick={() => expandCanvas('right')}
                        title="Expand canvas right"
                      >
                        <ChevronRight />
                      </button>
                      <button 
                        className="canvas-expand-button bottom"
                        onClick={() => expandCanvas('bottom')}
                        title="Expand canvas down"
                      >
                        <ChevronRight className="rotate-90" />
                      </button>
                      <button 
                        className="canvas-expand-button left"
                        onClick={() => expandCanvas('left')}
                        title="Expand canvas left"
                      >
                        <ChevronRight className="rotate-180" />
                      </button>
                      <button 
                        className="canvas-expand-button top"
                        onClick={() => expandCanvas('top')}
                        title="Expand canvas up"
                      >
                        <ChevronRight className="-rotate-90" />
                      </button>
                    </>
                  )}
                  
                  {/* Grid organization overlay */}
                  <CanvasGrid
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    layout={gridLayout}
                    columns={columns}
                    rows={rows}
                    gridVisible={gridVisible}
                    cells={gridCells}
                    activeCell={activeCell}
                    onLayoutChange={setGridLayout}
                    onColumnsChange={setColumns}
                    onRowsChange={setRows}
                    onCellCreate={handleCellCreate}
                    onCellUpdate={handleCellUpdate}
                    onCellDelete={handleCellDelete}
                    onCellSelect={setActiveCell}
                  />
                    
                  {/* Notes - ensure they're rendered */}
                  {notes && notes.length > 0 ? 
                    notes
                      .filter(note => !hiddenNotes.includes(note.id))
                      .map(note => (
                        <Note
                          key={note.id}
                          note={note}
                          onMove={handleNoteMove}
                          onContentChange={handleContentChange}
                          data-note-id={`note-${note.id}`}
                          isSelectable={isSelectMode}
                          isSelected={selectedNotes.includes(note.id)}
                          onSelect={toggleNoteSelection}
                        />
                      ))
                    : 
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-text-secondary">
                      No notes yet. Click the + button to add one.
                    </div>
                  }
                </div>
              </TransformComponent>
              
              {/* Zoom Controls - Bottom Left */}
              <div className="zoom-controls-container">
                <div className="zoom-controls">
                  <button
                    onClick={() => zoomOut()}
                    className="zoom-button"
                    aria-label="Zoom out"
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    onClick={() => zoomIn()}
                    className="zoom-button"
                    aria-label="Zoom in"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              {/* Mini Map - Bottom Right Corner */}
              <div className="mini-map-container">
                <div className="mini-map">
                  <div 
                    className="mini-map-viewport"
                    style={{
                      left: `${miniMapViewport.x}%`,
                      top: `${miniMapViewport.y}%`,
                      width: `${miniMapViewport.width}%`,
                      height: `${miniMapViewport.height}%`
                    }}
                  ></div>
                  {/* Canvas Boundary Indicator in Mini Map */}
                  <div className="mini-map-boundary" style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}></div>
                  {notes && notes.length > 0 && 
                    notes
                      .filter(note => !hiddenNotes.includes(note.id))
                      .map(note => (
                        <div 
                          key={`minimap-${note.id}`}
                          className="mini-map-note"
                          style={{
                            left: `${(note.position.x / canvasWidth) * 100}%`,
                            top: `${(note.position.y / canvasHeight) * 100}%`,
                            backgroundColor: 
                              note.color === 'blue' ? 'var(--accent-blue)' :
                              note.color === 'green' ? 'var(--accent-green)' :
                              note.color === 'pink' ? 'var(--accent-pink)' :
                              note.color === 'yellow' ? 'var(--accent-yellow)' :
                              note.color === 'purple' ? 'var(--accent-purple)' :
                              'var(--accent-blue)'
                          }}
                          onClick={() => {
                            // Center on this note when clicked in mini map
                            setTransform(
                              -note.position.x + (window.innerWidth / 2) - 150,
                              -note.position.y + (window.innerHeight / 2) - 100,
                              1
                            );
                          }}
                        ></div>
                      ))
                  }
                </div>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>
      
      {/* Tools & Modals */}
      <AlignmentTool 
        isOpen={isAlignmentOpen} 
        onClose={closeAlignmentTool}
      />
      
      <MarkdownImporter 
        isOpen={isMarkdownImporterOpen} 
        onClose={() => setIsMarkdownImporterOpen(false)} 
      />
      
      {/* Side Panel */}
      {showSidePanel && (
        <SidePanel
          notes={notes}
          toggleNoteVisibility={toggleNoteVisibility}
          hiddenNotes={hiddenNotes}
          openNote={openNote}
          updateNoteContent={handleContentChange}
          updateTask={handleTaskUpdate}
          deleteNote={handleDeleteNote}
        />
      )}

      {/* Preview Notes Panel for approving dictation results */}
      {showPreview && previewNotes.length > 0 && (
        <div className="dictation-preview-panel">
          <div className="dictation-preview-header">
            <h3>
              <span className="dictation-preview-title">Dictation Results</span>
              <span className="dictation-preview-count">{previewNotes.length} {previewNotes.length === 1 ? 'note' : 'notes'} created</span>
            </h3>
            <p className="dictation-preview-explanation">
              AI has organized your dictation into {previewNotes.length} {previewNotes.length === 1 ? 'note' : 'notes'}.
              Review the categorization below or use brainstorming to refine.
            </p>
            <div className="dictation-preview-actions">
              <button 
                className="dictation-preview-action approve"
                onClick={approveNotes}
              >
                Add to Canvas
              </button>
              <button 
                className="dictation-preview-action cancel"
                onClick={clearPreview}
              >
                Cancel
              </button>
            </div>
          </div>
          
          <div className="dictation-preview-content">
            {previewNotes.map((note, index) => (
              <div key={note.id} className="dictation-preview-note">
                <div className={`dictation-preview-note-color ${note.color}`}></div>
                <div className="dictation-preview-note-content">
                  <div className="dictation-preview-note-text">
                    {typeof note.content === 'string' 
                      ? note.content.split('\n\n')[0] 
                      : 'Untitled'}
                  </div>
                  <div className="dictation-preview-note-meta">
                    <div className="dictation-preview-note-type">
                      {note.type === 'task' ? 'Task List' : 'Note'}
                      {note.tasks && note.tasks.length > 0 && 
                        <span className="dictation-preview-task-count">
                          {note.tasks.length} {note.tasks.length === 1 ? 'task' : 'tasks'}
                        </span>
                      }
                    </div>
                    {note.aiSuggestions && note.aiSuggestions.category && (
                      <div className="dictation-preview-category">
                        <span className="category-label">Category:</span> {note.aiSuggestions.category}
                      </div>
                    )}
                  </div>
                  
                  {/* Show tasks if available */}
                  {note.tasks && note.tasks.length > 0 && (
                    <div className="dictation-preview-tasks">
                      <div className="dictation-preview-tasks-list">
                        {note.tasks.slice(0, 3).map((task, taskIndex) => (
                          <div key={task.id} className="dictation-preview-task-item">
                            <span className="dictation-preview-task-bullet">•</span>
                            <span className="dictation-preview-task-text">{task.text}</span>
                          </div>
                        ))}
                        {note.tasks.length > 3 && (
                          <div className="dictation-preview-task-more">
                            +{note.tasks.length - 3} more tasks
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Reasoning */}
                  {note.aiSuggestions && note.aiSuggestions.reasoning && index === 0 && (
                    <div className="dictation-preview-ai-reasoning">
                      <div className="dictation-preview-ai-reasoning-toggle" onClick={() => toggleAIReasoning()}>
                        <BrainCircuit size={16} />
                        <span>AI Categorization Logic</span>
                      </div>
                      {showAIReasoning && (
                        <div className="dictation-preview-ai-reasoning-content">
                          {note.aiSuggestions.reasoning}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Brainstorm button for this note */}
                <button 
                  className="dictation-preview-brainstorm-button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Brainstorm button clicked for note:', note);
                    // Make a deep copy of the note to avoid reference issues
                    const noteCopy = JSON.parse(JSON.stringify(note));
                    handleBrainstorm(note.id);
                  }}
                  title="Get AI suggestions to enhance this note"
                >
                  <BrainCircuit size={16} />
                  <span>Brainstorm</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Brainstorming Modal */}
      {brainstormNote && (
        <div className="brainstorm-modal">
          <div className="brainstorm-modal-content">
            <div className="brainstorm-modal-header">
              <h3>Brainstorm: {typeof brainstormNote.content === 'string' ? brainstormNote.content.split('\n\n')[0] : 'Untitled'}</h3>
              <button 
                className="brainstorm-modal-close"
                onClick={() => setBrainstormNote(null)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="brainstorm-modal-body">
              {isLoadingBrainstorm ? (
                <div className="brainstorm-loading">
                  <Loader2 className="animate-spin h-6 w-6 text-accent-blue" />
                  <span>Generating ideas...</span>
                </div>
              ) : (
                <>
                  <div className="brainstorm-section">
                    <h4>Current Note Content</h4>
                    <div className="current-note-content">
                      {typeof brainstormNote.content === 'string' ? brainstormNote.content : 'Untitled'}
                    </div>
                    
                    {brainstormNote.tasks && brainstormNote.tasks.length > 0 && (
                      <div className="brainstorm-current-tasks">
                        <h5>Tasks</h5>
                        <ul>
                          {brainstormNote.tasks.map(task => (
                            <li key={task.id}>{task.text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="brainstorm-section">
                    <h4>AI Suggestions {selectedSuggestions.length > 0 && <span className="brainstorm-selection-count">({selectedSuggestions.length} selected)</span>}</h4>
                    {brainstormSuggestions.length > 0 ? (
                      <div className="brainstorm-suggestions">
                        {brainstormSuggestions.map((suggestion) => (
                          <div 
                            key={suggestion.id} 
                            className={`brainstorm-suggestion ${selectedSuggestions.some(s => s.id === suggestion.id) ? 'selected' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              applySuggestion(suggestion);
                            }}
                          >
                            <div className="brainstorm-suggestion-type">
                              {suggestion.type === 'task' && <CheckSquare size={16} className="suggestion-type-icon" />}
                              {suggestion.type === 'content' && <AlignLeft size={16} className="suggestion-type-icon" />}
                              {suggestion.type === 'organization' && <Layout size={16} className="suggestion-type-icon" />}
                              <span>{suggestion.type}</span>
                            </div>
                            <div className="brainstorm-suggestion-content">
                              {suggestion.text}
                            </div>
                            <button 
                              className={`brainstorm-apply-button ${selectedSuggestions.some(s => s.id === suggestion.id) ? 'selected' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSuggestionSelection(suggestion);
                              }}
                            >
                              {selectedSuggestions.some(s => s.id === suggestion.id) ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="brainstorm-suggestion-prompt">
                        <p>AI can analyze your note and suggest improvements or related tasks.</p>
                        <button 
                          className="brainstorm-generate-button"
                          onClick={() => generateBrainstormSuggestions()}
                        >
                          Generate Suggestions
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="brainstorm-modal-footer">
              <button 
                className="brainstorm-modal-button secondary"
                onClick={() => setBrainstormNote(null)}
              >
                Cancel
              </button>
              <button 
                className="brainstorm-modal-button primary"
                onClick={() => finalizeBrainstormChanges()}
                disabled={brainstormSuggestions.length === 0 || selectedSuggestions.length === 0}
              >
                Apply {selectedSuggestions.length} {selectedSuggestions.length === 1 ? 'Change' : 'Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Processing Indicator Panel */}
      {isProcessing && (
        <div className="processing-panel">
          <div className="processing-content">
            <div className="processing-spinner">
              <Loader2 className="animate-spin h-8 w-8 text-accent-pink" />
            </div>
            <div className="processing-status">
              <h3>Processing Your Dictation</h3>
              <p>{processingStatus || 'Please wait...'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Canvas controls toolbar */}
      <div className="canvas-controls absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-card-bg border border-border-light rounded-lg p-2 shadow-lg z-10">
        {/* Add grid toggle button */}
        <button
          className={`p-2 rounded-md transition-colors ${gridVisible ? 'bg-accent-blue text-white' : 'hover:bg-node-bg/60'}`}
          onClick={toggleGridVisibility}
          title="Toggle grid organization"
        >
          <Grid size={18} />
        </button>
        
        {gridVisible && (
          <button
            className="p-2 rounded-md hover:bg-node-bg/60 transition-colors"
            onClick={arrangeNotesInCells}
            title="Auto-arrange notes in cells"
          >
            <Move size={18} />
          </button>
        )}
      </div>
    </div>
  );
}