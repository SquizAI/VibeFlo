import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note as NoteComponent } from './components/Note';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Routes, Route, BrowserRouter, Link, useNavigate } from 'react-router-dom';
import { Note, Task, Position } from './types';
import { Mic, Home, Grid, Move, Minimize, Zap, Search, Command, HelpCircle, FileStack, ZoomIn, Settings, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import './styles.css';
import './styles/taskListStyles.css';
import './styles/dictationPreview.css';
import AgentSidebar from './components/AgentSidebar';
import CommandPalette from './components/CommandPalette';
import AgentFeedback, { AgentActivityType } from './components/AgentFeedback';
import NoteSidebar from './components/NoteSidebar';
import DictationPreview from './components/DictationPreview';
import { transcribeAudio, enhanceTranscribedText, extractKeyTerms, createFallbackNoteFromDictation } from './lib/ai';
import { openai, validateApiKey } from './lib/openai';

// Type definitions for the Web Speech API - move to top level
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    speechRecognitionInstance: any;
  }
  
  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: {
      [index: number]: {
        [index: number]: {
          transcript: string;
        };
        isFinal: boolean;
        length: number;
      };
      length: number;
    };
  }
  
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }
}

// Mock nutrition database for common grocery items
const NUTRITION_DATABASE: { [key: string]: { calories: number, protein: number, carbs: number, fat: number } } = {
  "apple": { calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  "banana": { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  "orange": { calories: 62, protein: 1.2, carbs: 15, fat: 0.2 },
  "milk": { calories: 103, protein: 8, carbs: 12, fat: 2.4 },
  "bread": { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  "chicken": { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  "beef": { calories: 250, protein: 26, carbs: 0, fat: 17 },
  "rice": { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  "pasta": { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  "cheese": { calories: 113, protein: 7, carbs: 0.4, fat: 9 },
  "eggs": { calories: 78, protein: 6, carbs: 0.6, fat: 5 },
  "salmon": { calories: 208, protein: 20, carbs: 0, fat: 13 },
  "tomato": { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  "potato": { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  "onion": { calories: 44, protein: 1.2, carbs: 10, fat: 0.1 },
  "carrot": { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  "broccoli": { calories: 55, protein: 3.7, carbs: 11, fat: 0.6 },
  "spinach": { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  "avocado": { calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  "olive oil": { calories: 119, protein: 0, carbs: 0, fat: 13.5 },
  "almonds": { calories: 164, protein: 6, carbs: 6, fat: 14 },
  "oats": { calories: 68, protein: 2.4, carbs: 12, fat: 1.4 },
  "yogurt": { calories: 59, protein: 3.5, carbs: 5, fat: 3.1 },
  "sugar": { calories: 16, protein: 0, carbs: 4, fat: 0 },
  "flour": { calories: 364, protein: 10, carbs: 76, fat: 1 },
  "butter": { calories: 102, protein: 0.1, carbs: 0, fat: 11.5 },
  "chocolate": { calories: 155, protein: 2.1, carbs: 14, fat: 10 }
};

// Define an extended NoteInsights type
interface ExtendedNoteInsights {
  key_topics?: string[];
  timeframe?: string;
  action_required?: boolean;
  summary?: string;
  nutrition_summary?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Define interfaces for the task and item extensions
interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ExtendedTask {
  id: string;
  text: string;
  done: boolean;
  subtasks: any[];
  isExpanded: boolean;
  depth: number;
  category: string;
  quantity?: string;
  nutrition?: NutritionData;
}

function App() {
  // State for notes with empty initial state (no demo notes)
  const [notes, setNotes] = useState<Note[]>([]);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 5000, height: 5000 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);
  const [processingStatus, setProcessingStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Agent Sidebar state
  const [showAgentSidebar, setShowAgentSidebar] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  
  // Voice dictation preview state
  const [showDictationPreview, setShowDictationPreview] = useState(false);
  const [dictationNotes, setDictationNotes] = useState<any[]>([]);
  
  // Agent Feedback component state
  const [showAgentFeedback, setShowAgentFeedback] = useState(false);
  const [agentActivity, setAgentActivity] = useState<AgentActivityType>("idle");
  const [agentMessage, setAgentMessage] = useState("");
  const [agentProgress, setAgentProgress] = useState(0);
  const [agentConfidence, setAgentConfidence] = useState(0);
  
  // Notes Sidebar state
  const [showNoteSidebar, setShowNoteSidebar] = useState(false);
  const [showMovementTooltip, setShowMovementTooltip] = useState(true);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  
  // Voice dictation state
  const [visibleTranscript, setVisibleTranscript] = useState('');
  const [showDictationPopup, setShowDictationPopup] = useState(false);

  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [clickedOnNote, setClickedOnNote] = useState(false);

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  // Toggle mini-map visibility
  const toggleMiniMap = () => {
    setShowMiniMap(!showMiniMap);
  };

  function handleMove(id: string, newPosition: Position) {
    // When moving notes, we need to account for current canvas offset
    updateNote(id, { position: newPosition });
  }

  function addNote() {
    const newNote: Note = {
      id: String(Date.now()),
      type: 'sticky',
      content: 'New note',
      color: 'yellow',
      position: {
        x: -canvasOffset.x + window.innerWidth / 2 - 150,
        y: -canvasOffset.y + window.innerHeight / 2 - 150
      }
    };

    setNotes(prev => [...prev, newNote]);
  }

  function updateNote(id: string, updates: Partial<Note>) {
    setNotes(prev => prev.map(note => {
      if (note.id === id) {
        return { ...note, ...updates };
      }
      return note;
    }));
  }

  function removeNote(id: string) {
    setNotes(prev => prev.filter(note => note.id !== id));
  }

  function formatRecordingTime(milliseconds: number) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  // Toggle Agent Sidebar
  const toggleAgentSidebar = () => {
    setShowAgentSidebar(!showAgentSidebar);
  };
  
  // Command Palette functions
  const openCommandPalette = () => {
    setShowCommandPalette(true);
  };
  
  const closeCommandPalette = () => {
    setShowCommandPalette(false);
  };
  
  // Add function to toggle notes sidebar
  const toggleNoteSidebar = () => {
    setShowNoteSidebar(!showNoteSidebar);
  };
  
  // Function to focus on a specific note (center it in viewport)
  const focusOnNote = (noteId: string) => {
    const noteToFocus = notes.find(n => n.id === noteId);
    if (noteToFocus && viewportRef.current) {
      // Center the note in the viewport
      const viewportWidth = viewportRef.current.clientWidth;
      const viewportHeight = viewportRef.current.clientHeight;
      
      const newOffset = {
        x: -(noteToFocus.position.x - viewportWidth / 2 + 150), // 150 is approx half of note width
        y: -(noteToFocus.position.y - viewportHeight / 2 + 150) // 150 is approx half of note height
      };
      
      setCanvasOffset(newOffset);
      
      // Temporarily highlight the note
      setFocusedNoteId(noteId);
      setTimeout(() => {
        setFocusedNoteId(null);
      }, 2000);
    }
  };
  
  // Function to simulate agent activity
  const simulateAgentActivity = (activity: AgentActivityType, message: string, duration: number = 3000) => {
    setShowAgentFeedback(true);
    setAgentActivity(activity);
    setAgentMessage(message);
    setAgentConfidence(0);
    setAgentProgress(0);
    
    // Simulate progress
    const interval = 100;
    const steps = duration / interval;
    let currentStep = 0;
    
    const progressInterval = setInterval(() => {
      currentStep++;
      setAgentProgress(Math.min(100, (currentStep / steps) * 100));
      
      if (currentStep >= steps) {
        clearInterval(progressInterval);
        
        // Set confidence based on activity type
        if (activity === "searching" || activity === "generating") {
          setAgentConfidence(Math.random() * 30 + 70); // 70-100% confidence
        }
        
        // Auto hide after completion for certain activities
        if (activity !== "error" && activity !== "waiting") {
          setTimeout(() => {
            setShowAgentFeedback(false);
          }, 2000);
        }
      }
    }, interval);
  };
  
  // Function to handle the dictation process
  const toggleRecording = async () => {
    if (recording) {
      // Stop recording
      setRecording(false);
      
      // Process the final transcript
      if (transcript) {
        await processDictationTranscript(transcript);
      }
    } else {
      // Start new recording
      setRecording(true);
      setTranscript('');
      setInterimTranscript('');
      setDictationNotes([]);
      setShowDictationPreview(true);
      
      try {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        let finalTranscript = '';
        
        recognition.onresult = (event: any) => {
          let interimTranscriptValue = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscriptValue += transcript;
            }
          }
          
          setTranscript(finalTranscript);
          setInterimTranscript(interimTranscriptValue);
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setRecording(false);
        };
        
        recognition.onend = () => {
          if (recording) {
            setRecording(false);
          }
        };
        
        recognition.start();
        
        // Save the recognition object to potentially stop it later
        (window as any).currentRecognition = recognition;
      } catch (error) {
        console.error('Speech recognition failed:', error);
        setRecording(false);
      }
    }
  };
  
  // Process the dictation transcript by calling OpenAI API
  const processDictationTranscript = async (finalTranscript: string) => {
    try {
      console.log("Processing dictation transcript...");
      setProcessingStatus("Creating notes from dictation...");

      // Validate the API key first
      const keyValidation = validateApiKey();
      if (!keyValidation.valid) {
        console.error(`OpenAI API key validation failed: ${keyValidation.message}`);
        
        // Special handling for project API keys - they need a different approach
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        const isProjectKey = apiKey && typeof apiKey === 'string' && apiKey.startsWith('sk-proj-');
        
        if (isProjectKey) {
          console.log("Detected project API key - using OpenAI client library instead of fetch");
          
          try {
            // Use the client library which handles project API keys correctly
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: `You are an AI that analyzes dictated text to create multiple detailed notes.

ALWAYS create SEPARATE notes by categorizing content aggressively:
1. ANY mention of food items, ingredients, recipes → Create a dedicated GROCERY_LIST note
2. ANY mention of tasks, todos, deadlines → Create a dedicated TASK_LIST note
3. ANY other information → Create a GENERAL_NOTE

CRITICAL RULES:
- CREATE MULTIPLE NOTES - don't combine different types of content 
- For grocery lists, extract ALL food items mentioned and categorize them
- For recipe notes, create a dedicated note for EACH recipe mentioned
- Be extremely aggressive in separating content - when in doubt, create more notes
- NEVER combine grocery items with tasks - they MUST be separate notes
- Return detailed JSON that can create multiple notes from one dictation

Return a JSON array of notes where each note has:
- "type": "grocery_list", "task_list", "recipe", or "general_note"
- "title": descriptive title
- "content": main content text
- "items": array of structured items with text, category, and completed fields`
                },
                { role: 'user', content: finalTranscript }
              ],
              temperature: 0.2,
              response_format: { type: "json_object" }
            });
            
            // Extract the content - this will be a string containing JSON
            const jsonContent = completion.choices[0].message.content || "";
            console.log("OpenAI client lib response content:", jsonContent);
            
            // Parse the JSON from the content
            try {
              // Clean any markdown code block formatting that GPT-4o might add
              // even with response_format, sometimes it still includes formatting
              const cleanJsonContent = jsonContent
                .replace(/^```json\s*/g, '')  // Remove opening ```json
                .replace(/\s*```$/g, '')      // Remove closing ```
                .trim();
                
              let parsedResult;
              try {
                parsedResult = JSON.parse(cleanJsonContent);
              } catch (jsonError) {
                console.log("Error parsing cleaned content, trying original content");
                parsedResult = JSON.parse(jsonContent);
              }
              
              const result = parsedResult;
              console.log("Parsed result:", result);
              
              // Create notes based on the response
              const notes: Note[] = [];
              
              // Check if result is an array of notes or a single note
              if (Array.isArray(result.notes)) {
                console.log("Processing array of notes:", result.notes.length);
                
                // Process each note in the array
                result.notes.forEach((noteData: any, index: number) => {
                  const note = createNoteFromData(noteData, index * 50);
                  if (note) notes.push(note);
                });
              } else {
                // Fallback to previous behavior for backward compatibility
                const note = createNoteFromData(result, 0);
                if (note) notes.push(note);
              }
              
              console.log(`Created ${notes.length} notes from dictation`);
              setDictationNotes(notes);
              setShowDictationPreview(true);
              
              // Add debug message to track visibility
              console.log(`🔔 DICTATION PREVIEW SHOULD NOW BE VISIBLE - Notes count: ${notes.length}`);
              
              // Add a small delay to ensure state is updated before continuing
              setTimeout(() => {
                document.body.style.overflow = 'hidden'; // Force body to not scroll
                const previewDiv = document.querySelector('.dictation-preview-panel');
                if (previewDiv) {
                  (previewDiv as HTMLElement).style.display = 'block';
                  (previewDiv as HTMLElement).style.opacity = '1';
                  console.log('🔍 Found and forced dictation preview to be visible');
                } else {
                  console.warn('⚠️ Could not find dictation preview element');
                }
              }, 100);
              
              return;
            } catch (jsonError) {
              console.error("Error parsing JSON from completion:", jsonError);
              createFallbackNote(finalTranscript, "Error parsing AI response");
              return;
            }
          } catch (openaiError) {
            console.error("OpenAI client library error:", openaiError);
            createFallbackNote(finalTranscript, "OpenAI API error");
            return;
          }
        } else {
          // Create a fallback note for non-project API key errors
          createFallbackNote(transcript, `API key error: ${keyValidation.message}`);
          return;
        }
      }

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-2024-08-06',
            messages: [
              {
                role: 'system',
                content: `Analyze this dictation and categorize it. Be VERY aggressive in identifying structure, even if not explicitly formatted.
                
IF IT CONTAINS ANY food items, ingredients, household products → ALWAYS classify as grocery_list
IF IT CONTAINS ANY actions, tasks, todos, deadlines → ALWAYS classify as task_list
OTHERWISE → classify as general_note

IMPORTANT RULES:
- Default to structured lists (task_list or grocery_list) whenever possible
- For grocery_list, extract ALL food items and categorize them (produce, dairy, meat, etc.)
- For task_list, identify ALL actions and mark with appropriate priorities
- ALWAYS extract items as structured data, even from general notes
- ALWAYS include a descriptive title`
              },
              { role: 'user', content: transcript }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'dictation_analysis',
                schema: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['grocery_list', 'task_list', 'general_note']
                    },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          text: { type: 'string' },
                          category: { type: 'string' },
                          completed: { type: 'boolean' },
                          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                          due_date: { type: 'string' },
                          quantity: { type: 'string' }
                        },
                        required: ['text', 'category', 'completed'],
                        additionalProperties: false
                      }
                    },
                    insights: {
                      type: 'object',
                      properties: {
                        key_topics: { 
                          type: 'array', 
                          items: { type: 'string' } 
                        },
                        timeframe: { type: 'string' },
                        action_required: { type: 'boolean' },
                        summary: { type: 'string' }
                      }
                    }
                  },
                  required: ['type', 'title', 'content', 'items'],
                  additionalProperties: false
                },
                strict: true
              }
            }
          })
        });

        console.log("OpenAI response:", response);

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Parsed result:", result);

        // Create notes based on the response
        const notes: Note[] = [];
        
        // Create the appropriate note type based on the analysis
        if (result.type === 'grocery_list') {
          const groceryNote: Note = {
            id: `note-${Date.now()}`,
            type: 'task',
            color: 'green',
            content: `📝 ${result.title}\n\n🛒 Grocery List:`,
            position: { x: 100, y: 100 },
            size: { width: 250, height: 300 },
            tasks: result.items.map((item: any) => ({
              id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              text: item.text + (item.quantity ? ` (${item.quantity})` : ''),
              done: item.completed,
              subtasks: [],
              isExpanded: false,
              depth: 0,
              category: item.category || 'grocery'
            })),
            insights: result.insights || {
              key_topics: ['groceries', 'shopping'],
              action_required: true,
              timeframe: 'soon'
            }
          };
          notes.push(groceryNote);
        } 
        else if (result.type === 'task_list') {
          const taskNote: Note = {
            id: `note-${Date.now()}`,
            type: 'task',
            color: 'blue',
            content: `📝 ${result.title}\n\n✅ Task List:`,
            position: { x: 100, y: 100 },
            size: { width: 250, height: 300 },
            tasks: result.items.map((item: any) => ({
              id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              text: `${item.priority === 'high' ? '⚠️ ' : ''}${item.text}${item.due_date ? ` (Due: ${item.due_date})` : ''}`,
              done: item.completed,
              subtasks: [],
              isExpanded: false,
              depth: 0,
              category: item.category || 'task'
            })),
            insights: result.insights || {
              key_topics: ['tasks', 'todos'],
              action_required: true,
              timeframe: 'upcoming'
            }
          };
          notes.push(taskNote);
        }
        else {
          // Default to general note
          const regularNote: Note = {
            id: `note-${Date.now()}`,
            type: 'sticky',
            color: 'yellow',
            content: result.content,
            position: { x: 100, y: 100 },
            size: { width: 200, height: 200 },
            insights: result.insights
          };
          notes.push(regularNote);
          
          // If there are items in a general note, also create a task list
          if (result.items && result.items.length > 0) {
            const extractedTaskNote: Note = {
              id: `note-extract-${Date.now()}`,
              type: 'task',
              color: 'purple',
              content: `📝 Extracted Points from: ${result.title}`,
              position: { x: 100, y: 350 },
              size: { width: 250, height: 300 },
              tasks: result.items.map((item: any) => ({
                id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                text: item.text,
                done: item.completed,
                subtasks: [],
                isExpanded: false,
                depth: 0,
                category: item.category || 'extracted'
              })),
              insights: {
                key_topics: result.insights?.key_topics || ['extracted items'],
                action_required: result.insights?.action_required || false,
                timeframe: result.insights?.timeframe || 'undetermined',
                summary: 'Points extracted from your note'
              }
            };
            notes.push(extractedTaskNote);
          }
        }
        
        console.log(`Created ${notes.length} notes from dictation`);
        setDictationNotes(notes);
        setShowDictationPreview(true);
        
        // Add debug message to track visibility
        console.log(`🔔 DICTATION PREVIEW SHOULD NOW BE VISIBLE - Notes count: ${notes.length}`);
        
        // Add a small delay to ensure state is updated before continuing
        setTimeout(() => {
          document.body.style.overflow = 'hidden'; // Force body to not scroll
          const previewDiv = document.querySelector('.dictation-preview-panel');
          if (previewDiv) {
            (previewDiv as HTMLElement).style.display = 'block';
            (previewDiv as HTMLElement).style.opacity = '1';
            console.log('🔍 Found and forced dictation preview to be visible');
          } else {
            console.warn('⚠️ Could not find dictation preview element');
          }
        }, 100);
        
        setIsProcessing(false);
      } catch (error) {
        console.error('Error processing dictation with AI:', error);
        
        // Create a fallback note with error message and transcript
        createFallbackNote(transcript, "AI processing error");
      }
    } catch (error) {
      console.error("Error processing dictation with AI:", error);
      
      // Create a fallback note with error message and transcript
      createFallbackNote(transcript, "AI processing error");
    } finally {
      // Always show the dictation preview, even if there was an error
      console.log(`🎯 Transcript processing complete - dictation preview should now be visible`);
      setIsProcessing(false);
    }
  }
  
  // Helper function to create a fallback note when AI processing fails
  const createFallbackNote = (transcript: string, errorType: string) => {
    console.log(`Creating fallback note due to ${errorType}`);
    
    const notes: Note[] = [];
    
    // Create a note with the transcript
    const fallbackNote: Note = {
      id: `note-fallback-${Date.now()}`,
      type: 'sticky',
      color: 'yellow',
      content: `${transcript}\n\n(Created without AI processing due to ${errorType})`,
      position: { x: 100, y: 100 },
      size: { width: 250, height: 250 },
      insights: {
        key_topics: ['dictation', 'fallback'],
        action_required: false,
        timeframe: 'now',
        summary: 'Note created from dictation without AI processing'
      }
    };
    
    notes.push(fallbackNote);
    
    // Extract simple tasks if present (look for list markers)
    const lines = transcript.split('\n');
    const taskLines = lines.filter(line => 
      line.trim().startsWith('- ') || 
      line.trim().startsWith('• ') || 
      line.trim().startsWith('* ')
    );
    
    if (taskLines.length > 0) {
      const taskNote: Note = {
        id: `note-tasks-${Date.now()}`,
        type: 'task',
        color: 'blue',
        content: '📝 Tasks extracted from dictation',
        position: { x: 350, y: 100 },
        size: { width: 250, height: 300 },
        tasks: taskLines.map((line, index) => ({
          id: `task-${Date.now()}-${index}`,
          text: line.replace(/^[-•*]\s+/, '').trim(),
          done: false,
          subtasks: [],
          isExpanded: false,
          depth: 0,
          category: 'extracted'
        })),
        insights: {
          key_topics: ['tasks', 'extracted'],
          action_required: true,
          timeframe: 'soon',
          summary: 'Tasks extracted from dictation text'
        }
      };
      
      notes.push(taskNote);
    }
    
    console.log(`Created ${notes.length} fallback notes from dictation`);
    setDictationNotes(notes);
    setShowDictationPreview(true);
    
    // Add a small delay to ensure state is updated before continuing
    setTimeout(() => {
      document.body.style.overflow = 'hidden'; // Force body to not scroll
      const previewDiv = document.querySelector('.dictation-preview-panel');
      if (previewDiv) {
        (previewDiv as HTMLElement).style.display = 'block';
        (previewDiv as HTMLElement).style.opacity = '1';
        console.log('🔍 Found and forced dictation preview to be visible');
      } else {
        console.warn('⚠️ Could not find dictation preview element');
      }
    }, 100);
  };
  
  // Approve an individual note and add it to canvas
  const approveIndividualNote = (noteId: string) => {
    console.log(`Approving individual note: ${noteId}`);
    
    // Find the note in the dictation notes
    const noteToApprove = dictationNotes.find(note => note.id === noteId);
    if (!noteToApprove) {
      console.warn(`Note with ID ${noteId} not found in dictation notes`);
      return;
    }
    
    // Position this note in center of canvas
    const centerX = (window.innerWidth / 2) - 150;
    const centerY = (window.innerHeight / 2) - 100;
    
    // Create new note with proper ID and position
    const newNote = {
      ...noteToApprove,
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      position: {
        x: centerX,
        y: centerY
      }
    };
    
    // Add to notes collection
    setNotes(prevNotes => [...prevNotes, newNote]);
    
    // Remove this note from dictation notes
    setDictationNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    
    // If no more notes left, close the preview
    if (dictationNotes.length <= 1) {
      setShowDictationPreview(false);
    }
    
    // Simulate agent activity
    simulateAgentActivity("success", `Added "${noteToApprove.title}" to your canvas.`);
  };

  // Update a note in the dictation preview
  const editDictationNote = (noteId: string, updates: Partial<any>) => {
    console.log(`Editing dictation note: ${noteId}`, updates);
    
    setDictationNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === noteId 
          ? { ...note, ...updates } 
          : note
      )
    );
  };

  // Delete a note from the dictation preview
  const deleteDictationNote = (noteId: string) => {
    console.log(`Deleting dictation note: ${noteId}`);
    
    setDictationNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    
    // If no more notes left, close the preview
    if (dictationNotes.length <= 1) {
      setShowDictationPreview(false);
      simulateAgentActivity("info", "Dictation notes removed.");
    }
  };

  // Update the approveDictation function to handle selected notes
  const approveDictation = (selectedNoteIds?: string[]) => {
    console.log(`Approving dictation notes: ${selectedNoteIds?.length || 'all'}`);
    
    if (!dictationNotes || dictationNotes.length === 0) {
      console.warn('No dictation notes to approve');
      setShowDictationPreview(false);
      return;
    }
    
    // Filter notes by selected IDs if provided
    const notesToApprove = selectedNoteIds
      ? dictationNotes.filter(note => selectedNoteIds.includes(note.id))
      : dictationNotes;
    
    // Position notes in center of canvas
    const centerX = (window.innerWidth / 2) - 150;
    const centerY = (window.innerHeight / 2) - 100;
    
    // Add each note with a slight offset
    const newNotes = notesToApprove.map((note, index) => {
      const newNote = {
        ...note,
        id: `note-${Date.now()}-${index}`,
        position: {
          x: centerX + (index * 50),
          y: centerY + (index * 50)
        }
      };
      return newNote;
    });
    
    // Update notes state
    setNotes(prevNotes => [...prevNotes, ...newNotes]);
    console.log(`Added ${newNotes.length} new notes from dictation`);
    
    // Clear dictation preview
    setDictationNotes([]);
    setShowDictationPreview(false);
    
    // Simulate agent activity
    simulateAgentActivity("success", `Created ${newNotes.length} new note${newNotes.length > 1 ? 's' : ''} from your dictation.`);
  };

  // Cancel dictation and discard notes
  const cancelDictation = () => {
    console.log('Canceling dictation');
    setDictationNotes([]);
    setShowDictationPreview(false);
    
    // Simulate agent activity
    simulateAgentActivity("info", "Dictation notes discarded.");
  };
  
  // Command execution handler
  const handleExecuteCommand = (command: string) => {
    closeCommandPalette();
    
    if (command === 'add-note') {
      addNote();
    } else if (command === 'clear-all') {
      setNotes([]);
    } else if (command === 'toggle-mini-map') {
      toggleMiniMap();
    } else if (command === 'reset-view') {
      setCanvasOffset({ x: 0, y: 0 });
      setScale(1);
    } else if (command === 'create-notes-from-text') {
      simulateAgentActivity("generating", "Creating notes from text...", 3000);
    } else if (command === 'web-search') {
      simulateAgentActivity("searching", "Searching the web for information...", 4000);
    } else if (command === 'summarize') {
      simulateAgentActivity("processing", "Summarizing content...", 5000);
    } else if (command === 'generate-tasks') {
      simulateAgentActivity("generating", "Generating tasks from your notes...", 3500);
    }
  };
  
  useEffect(() => {
    // Hide movement tooltip after 10 seconds
    const timer = setTimeout(() => {
      setShowMovementTooltip(false);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    // Command palette shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    // No need to handle space key up anymore
  };

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only start canvas drag if we click directly on the canvas background (not on a note)
    if (!clickedOnNote) {
      setIsDraggingCanvas(true);
      setIsDragging(true);
      setStartPoint({ x: e.clientX, y: e.clientY });
      document.body.style.cursor = 'grabbing';
      e.preventDefault(); // Prevent other events
    }
  };

  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && isDraggingCanvas) {
      const dx = e.clientX - startPoint.x;
      const dy = e.clientY - startPoint.y;
      setCanvasOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      setStartPoint({ x: e.clientX, y: e.clientY });
    }
    
    // Update last mouse position for the mini-map viewport indicator
    setLastMousePosition({ x: e.clientX, y: e.clientY });
  };

  const endDrag = () => {
    if (isDragging) {
      setIsDragging(false);
      setIsDraggingCanvas(false);
      document.body.style.cursor = 'default';
      // Reset clicked on note state
      setClickedOnNote(false);
    }
  };

  // Track when user clicks on a note to prevent canvas dragging
  const handleNoteMouseDown = (id: string) => {
    setClickedOnNote(true);
    setSelectedNoteId(id);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Check if the Ctrl key (or Command key on Mac) is pressed for zoom
    const isZoomEvent = e.ctrlKey || e.metaKey;
    
    if (isZoomEvent) {
      e.preventDefault(); // Prevent default scrolling behavior
      
      // Determine zoom direction
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out (0.9) or in (1.1)
      
      // Calculate new scale with limits
      const newScale = Math.max(0.2, Math.min(5, scale * zoomFactor));
      
      // Get the mouse position relative to the canvas
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate mouse position in canvas coordinates
      const mouseXInCanvas = mouseX / scale - canvasOffset.x;
      const mouseYInCanvas = mouseY / scale - canvasOffset.y;
      
      // Calculate new offsets to zoom toward/from the mouse position
      const newOffsetX = mouseX / newScale - mouseXInCanvas;
      const newOffsetY = mouseY / newScale - mouseYInCanvas;
      
      // Update state
      setScale(newScale);
      setCanvasOffset({ x: newOffsetX, y: newOffsetY });
    } else {
      // For regular scrolling (panning the canvas)
      setCanvasOffset({
        x: canvasOffset.x - e.deltaX / scale,
        y: canvasOffset.y - e.deltaY / scale
      });
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    const handleResize = () => {
      if (viewportRef.current) {
        setViewportSize({
          width: viewportRef.current.clientWidth,
          height: viewportRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    // Initial size
    handleResize();
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const AppNavigation = () => {
    const navigate = useNavigate();
    
    return (
      <div className="app-navbar bg-gray-900 border-b border-gray-800">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            <h1>VibeFlo</h1>
          </Link>
        </div>
        
        <div className="nav-actions">
          {/* Add Notes toggle button */}
          <button onClick={toggleNoteSidebar} title="Notes Explorer" className={`nav-notes-button ${showNoteSidebar ? 'active' : ''}`}>
            <FileStack size={18} />
            <span>Notes</span>
          </button>
          
          <button onClick={() => navigate('/')} title="Home - Freeform Canvas">
            <Home size={18} />
            <span>Canvas</span>
          </button>
          <button onClick={addNote} title="Add Note">
            <Grid size={18} />
            <span>Add Note</span>
          </button>
          
          {/* Add Agent Sidebar toggle button */}
          <button 
            onClick={toggleAgentSidebar} 
            title="AI Agent Capabilities"
            className={`nav-agent-button ${showAgentSidebar ? 'active' : ''}`}
          >
            <Zap size={18} />
            <span>Agent</span>
          </button>
          
          {/* Add Command Palette button */}
          <button 
            onClick={openCommandPalette} 
            title="Command Palette (Ctrl+K)"
            className="nav-command-button"
          >
            <Search size={18} />
            <span>Commands</span>
          </button>
          
          <div className="ml-auto flex items-center">
            <button
              className={`app-nav-button voice-button ${recording ? 'recording' : ''}`}
              onClick={toggleRecording}
              title={recording ? "Stop Recording" : "Start Voice Dictation"}
            >
              <Mic className="w-5 h-5" />
              <span className="text-sm">
                {recording ? 'Recording...' : 'Voice Input'}
              </span>
              {recording && (
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Fix the calculateTotalNutrition function with proper type annotations
  const calculateTotalNutrition = (tasks: Array<any>): NutritionData => {
    return tasks.reduce((totals: NutritionData, task: any) => {
      if (task.nutrition) {
        return {
          calories: totals.calories + (task.nutrition.calories || 0),
          protein: totals.protein + (task.nutrition.protein || 0),
          carbs: totals.carbs + (task.nutrition.carbs || 0),
          fat: totals.fat + (task.nutrition.fat || 0),
        };
      }
      return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // Since there are too many type conflicts, we'll use any for the return type
  const createNoteFromData = (data: any, yOffset: number): any => {
    if (!data) return null;
    
    const basePosition = { x: 100, y: 100 + yOffset };
    
    if (data.type === 'grocery_list') {
      // Process grocery items and add nutrition info
      const tasks = Array.isArray(data.items) ? data.items.map((item: any) => {
        // Look for nutrition data for this item
        const itemText = item.text.toLowerCase();
        let nutrition = null;
        
        // Search for known food items in the text
        for (const [food, values] of Object.entries(NUTRITION_DATABASE)) {
          if (itemText.includes(food)) {
            nutrition = values;
            break;
          }
        }
        
        return {
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          text: item.text,
          done: item.completed || false,
          subtasks: [],
          isExpanded: false,
          depth: 0,
          category: item.category || 'grocery',
          quantity: item.quantity || '',
          nutrition: nutrition
        };
      }) : [];
      
      // Calculate total nutrition
      const totalNutrition = calculateTotalNutrition(tasks);
      
      // Create grocery note with nutrition data
      return {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'task',
        color: 'green',
        content: `🛒 ${data.title}\n\nGrocery List:`,
        position: basePosition,
        size: { width: 280, height: 350 },
        tasks: tasks,
        insights: {
          key_topics: ['groceries', 'shopping', 'food'],
          action_required: true,
          timeframe: 'soon',
          nutrition_summary: totalNutrition
        }
      };
    } else if (data.type === 'task_list') {
      return {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'task',
        color: 'blue',
        content: `📝 ${data.title}\n\n✅ Task List:`,
        position: basePosition,
        size: { width: 280, height: 350 },
        tasks: Array.isArray(data.items) ? data.items.map((item: any) => ({
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          text: item.text,
          done: item.completed || false,
          subtasks: [],
          isExpanded: false,
          depth: 0,
          category: item.category || 'task'
        })) : [],
        insights: data.insights || {
          key_topics: ['tasks', 'todos', 'productivity'],
          action_required: true,
          timeframe: 'upcoming'
        }
      };
    } else if (data.type === 'recipe') {
      return {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'sticky',
        color: 'pink',
        content: `🍽️ ${data.title}\n\n${data.content || ''}`,
        position: basePosition,
        size: { width: 280, height: 350 },
        items: Array.isArray(data.items) ? data.items.map((item: any) => ({
          id: `ingredient-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          text: item.text,
          completed: false,
          category: 'ingredient',
          quantity: item.quantity || ''
        })) : [],
        insights: data.insights || {
          key_topics: ['recipe', 'cooking', 'food'],
          action_required: false,
          timeframe: 'anytime',
          summary: `A recipe for ${data.title} with ${Array.isArray(data.items) ? data.items.length : 0} ingredients.`
        }
      };
    } else {
      // Default to general note
      return {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'sticky',
        color: 'yellow',
        content: `${data.title}\n\n${data.content || ''}`,
        position: basePosition,
        size: { width: 280, height: 300 },
        insights: data.insights || {
          key_topics: data.key_topics || ['note', 'information'],
          summary: `General note: ${data.title}`
        }
      };
    }
  };

  return (
    <BrowserRouter>
      <DndProvider backend={HTML5Backend}>
        <div className="app">
          {/* Centered Recording Tooltip - only shown when dictation popup is not active */}
          {!showDictationPopup && (
            <div className={`recording-tooltip ${recording ? 'recording-active' : ''}`}>
              <button 
                className="recording-tooltip-close" 
                onClick={() => recording ? toggleRecording() : null}
              >
                <X size={20} />
              </button>
              <div className="recording-tooltip-content">
                {recording ? 
                  <>
                    <div className="recording-status">
                      <div className="recording-pulse"></div>
                      <span>Recording... {recordingTime > 0 ? new Date(recordingTime * 1000).toISOString().substr(14, 5) : ''}</span>
                    </div>
                    <button 
                      className="recording-stop-button"
                      onClick={toggleRecording}
                    >
                      Stop Recording
                    </button>
                  </>
                  : 
                  <div className="recording-instructions">
                    Press to start recording
                  </div>
                }
              </div>
            </div>
          )}

          <AppNavigation />
          <div className="app-content">
            <Routes>
              <Route path="/" element={
                <div 
                  ref={viewportRef}
                  className="canvas-viewport" 
                  onMouseDown={startDrag}
                  onMouseMove={onDrag}
                  onMouseUp={endDrag}
                  onMouseLeave={endDrag}
                  onWheel={handleWheel}
                >
                  {/* Canvas Movement Tooltip */}
                  {showMovementTooltip && (
                    <div className="canvas-movement-tooltip">
                      <div className="tooltip-header">
                        <HelpCircle size={18} />
                        <span>Canvas Movement Controls</span>
                        <button 
                          className="dismiss-tooltip"
                          onClick={() => setShowMovementTooltip(false)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="tooltip-content">
                        <p><strong>Hold SPACE + Drag</strong> to move the canvas</p>
                        <p><strong>CTRL + Scroll</strong> to zoom in/out</p>
                        <p>Use the zoom controls in the bottom right corner</p>
                      </div>
                    </div>
                  )}
                  
                  <div
                    ref={canvasRef}
                    className={`canvas ${isDragging ? 'dragging' : ''}`}
                    style={{
                      transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`,
                      width: canvasSize.width,
                      height: canvasSize.height,
                      cursor: isDraggingCanvas ? 'grabbing' : 'default'
                    }}
                  >
                    {notes.map(note => (
                      <NoteComponent
                        key={note.id}
                        note={note}
                        onMove={(id, newPosition) => handleMove(id, newPosition)}
                        onContentChange={(id, content) => updateNote(id, { content })}
                        isSelected={selectedNoteId === note.id}
                        onSelect={(id) => setSelectedNoteId(id === selectedNoteId ? null : id)}
                        onStartDrag={(id) => {
                          setClickedOnNote(true);
                          setSelectedNoteId(id);
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Zoom controls */}
                  <div className="zoom-controls">
                    <button 
                      onClick={() => setScale(prev => Math.max(prev - 0.1, 0.1))}
                      className="zoom-button"
                      title="Zoom Out"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="zoom-display">
                      {Math.round(scale * 100)}%
                    </div>
                    <button 
                      onClick={() => setScale(prev => Math.min(prev + 0.1, 5))}
                      className="zoom-button"
                      title="Zoom In"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  
                  {/* Mini-map */}
                  {showMiniMap && (
                    <div className="mini-map-container">
                      <div className="mini-map-header">
                        <span>Canvas Overview</span>
                        <button onClick={toggleMiniMap} className="mini-map-close">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="mini-map">
                        {notes.map(note => (
                          <div 
                            key={`map-${note.id}`}
                            className={`mini-map-note ${note.color}`}
                            style={{
                              left: `${(note.position.x / canvasSize.width) * 100}%`,
                              top: `${(note.position.y / canvasSize.height) * 100}%`
                            }}
                            title={note.content.substring(0, 20)}
                          />
                        ))}
                        
                        {/* Viewport indicator */}
                        <div 
                          className="mini-map-viewport"
                          style={{
                            width: `${(viewportSize.width / canvasSize.width) * 100}%`,
                            height: `${(viewportSize.height / canvasSize.height) * 100}%`,
                            left: `${(-canvasOffset.x / canvasSize.width) * 100}%`,
                            top: `${(-canvasOffset.y / canvasSize.height) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              } />
            </Routes>
          </div>
          
          {/* Floating microphone button for mobile/tablet */}
          <div className={`floating-mic ${isRecording ? 'recording' : ''}`}>
            <button 
              className="floating-mic-button" 
              onClick={toggleRecording}
              aria-label={isRecording ? "Stop recording" : "Start voice recording"}
            >
              <Mic size={24} />
            </button>
            {isRecording && (
              <div className="recording-duration">
                {formatRecordingTime(recordingTime)}
              </div>
            )}
          </div>

          {/* Real-time Dictation Popup */}
          {showDictationPopup && (
            <div className="dictation-preview-panel recording-panel">
              <div className="dictation-preview-header">
                <h3>Voice Recording</h3>
                <div className="dictation-preview-actions">
                  <button 
                    className="dictation-preview-action cancel" 
                    onClick={toggleRecording}
                  >
                    <X size={16} />
                    Close
                  </button>
                </div>
              </div>
              
              <div className="dictation-preview-content">
                {/* Large, prominent stop recording button at the top */}
                <div className="recording-stop-container">
                  <button 
                    className="recording-stop-button-large"
                    onClick={toggleRecording}
                  >
                    <Mic size={20} />
                    Stop Recording
                  </button>
                  <p className="recording-hint">Click to stop recording and process your speech</p>
                </div>
                
                <div className={`recording-indicator ${isProcessing ? 'warning' : ''}`}>
                  <div className="recording-pulse"></div>
                  <span>
                    {isProcessing ? 'Processing...' : `Recording ${formatRecordingTime(recordingTime)}`}
                    {visibleTranscript && visibleTranscript !== 'Listening to your voice...' && 
                     !isProcessing && ` • Speech detected`}
                  </span>
                </div>
                
                <div className="dictation-transcript">
                  {visibleTranscript && visibleTranscript !== 'Listening to your voice...' ? (
                    <p>
                      {visibleTranscript.replace(/\[(.*?)\]$/, '<span>$1</span>').split('<span>').map((part, index, array) => {
                        // If this is the last part and we have more than one part, it's the interim text
                        if (index === array.length - 1 && array.length > 1 && part) {
                          return <span key={index} className="interim-text">[{part}</span>;
                        }
                        return part;
                      })}
                    </p>
                  ) : (
                    <p className="transcript-placeholder">
                      {isProcessing ? 'Processing your speech...' : 'Speak now...'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dictation Preview Panel (after processing) */}
          {showDictationPreview && (
            <DictationPreview
              isVisible={showDictationPreview}
              transcript={transcript}
              interimTranscript={interimTranscript}
              notes={dictationNotes}
              onApprove={approveDictation}
              onCancel={cancelDictation}
              isRecording={recording}
              onApproveIndividual={approveIndividualNote}
              onEdit={editDictationNote}
              onDelete={deleteDictationNote}
            />
          )}

          <AgentSidebar isOpen={showAgentSidebar} onClose={toggleAgentSidebar} />
          <CommandPalette 
            isOpen={showCommandPalette} 
            onClose={closeCommandPalette} 
            onExecuteCommand={handleExecuteCommand} 
          />
          <AgentFeedback 
            isVisible={showAgentFeedback}
            activity={agentActivity}
            message={agentMessage}
            progress={agentProgress}
            confidence={agentConfidence}
            onClose={() => setShowAgentFeedback(false)}
          />

          {/* Note Sidebar */}
          <NoteSidebar 
            notes={notes}
            isOpen={showNoteSidebar}
            onClose={toggleNoteSidebar}
            onUpdateNote={updateNote}
            onSelectNote={(id) => setSelectedNoteId(id)}
            onFocusNote={focusOnNote}
          />
        </div>
      </DndProvider>
    </BrowserRouter>
  );
}

export default App;