import React, { useState, useEffect, useRef } from 'react';
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
import { transcribeAudio, enhanceTranscribedText, extractKeyTerms } from './lib/ai';

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
  
  // Real dictation processing function
  const processDictationTranscript = async (text: string) => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Analyzing dictation...');
      
      // Process text into categories - task lists and general notes
      const processedNotes = [];
      
      // Create a basic note from the dictation
      if (text.includes("- ") || text.includes("• ")) {
        // Looks like a list, create a task note
        
        // Extract potential tasks (lines starting with - or •)
        const lines = text.split("\n");
        const tasks = lines
          .filter(line => line.trim().startsWith("- ") || line.trim().startsWith("• "))
          .map((line, index) => {
            const taskText = line.replace(/^[-•]\s+/, "").trim();
            return {
              id: `t${index}`,
              text: taskText,
              completed: false,
              isExpanded: false,
              depth: 0,
              subtasks: []
            };
          });
        
        // Find potential title from first non-list line
        let title = "Action Items";
        const titleLine = lines.find(line => !line.trim().startsWith("- ") && !line.trim().startsWith("• ") && line.trim().length > 0);
        if (titleLine) {
          title = titleLine.trim();
        }
        
        if (tasks.length > 0) {
          processedNotes.push({
            id: `dict-task-${Date.now()}`,
            type: 'tasks',
            color: 'green',
            title: title,
            tasks: tasks,
            position: { x: 100, y: 100 }
          });
        }
      }
      
      // Also create a regular note with the full text
      processedNotes.push({
        id: `dict-note-${Date.now()}`,
        type: 'sticky',
        color: 'blue',
        content: text,
        position: { x: 400, y: 100 }
      });
      
      // Set the dictation notes for preview
      setDictationNotes(processedNotes);
      setShowDictationPreview(true);
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Error processing dictation:', error);
      // Create a single fallback note with the raw transcript
      const fallbackNote = {
        id: `dict-fallback-${Date.now()}`,
        type: 'sticky',
        color: 'blue',
        content: text,
        position: { x: 100, y: 100 }
      };
      
      setDictationNotes([fallbackNote]);
      setShowDictationPreview(true);
      setIsProcessing(false);
    }
  };
  
  // Real toggle recording function
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      // Stop the MediaRecorder if it exists
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Stop any active speech recognition
      if (window.speechRecognitionInstance) {
        window.speechRecognitionInstance.stop();
        window.speechRecognitionInstance = null;
      }
      
      // Stop the media stream if it exists
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
      setShowDictationPopup(false);
      
      // Show processing state
      setIsProcessing(true);
      simulateAgentActivity("processing", "Processing voice input...", 2000);
      
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingTime(0);
      setAudioChunks([]);
      setVisibleTranscript('Listening to your voice...');
      setShowDictationPopup(true);
      simulateAgentActivity("listening", "Listening to your voice...");
      
      // Start time counter
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1000);
      }, 1000);
      setRecordingInterval(interval);
      
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        
        // Setup media recorder for DeepGram processing later
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        
        const chunks: BlobPart[] = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
            setAudioChunks(prev => [...prev, e.data]);
          }
        };
        
        recorder.onstop = async () => {
          setIsProcessing(true);
          
          try {
            // First, use the transcript we already have from Web Speech API
            const initialTranscript = visibleTranscript.replace(/\[.*?\]$/, '').trim();
            
            // If we have a good transcript from Web Speech API, use it immediately
            if (initialTranscript && initialTranscript.length > 5) { // Lower the threshold to 5 chars
              // Process the transcript immediately for better UX
              await processDictationTranscript(initialTranscript);
              
              // Then in background, process with DeepGram for more accuracy
              const audioBlob = new Blob(chunks, { type: 'audio/webm' });
              transcribeAudio(audioBlob).then(async (deepgramText) => {
                // Only update if DeepGram returned a valid response
                if (deepgramText && deepgramText.length > initialTranscript.length) {
                  try {
                    const enhancedText = await enhanceTranscribedText(deepgramText);
                    // Update the dictation notes with better transcript
                    processDictationTranscript(enhancedText);
                  } catch (enhanceError) {
                    console.error('Error enhancing text:', enhanceError);
                    // Just use the raw deepgram text if enhancement fails
                    if (deepgramText.length > initialTranscript.length) {
                      processDictationTranscript(deepgramText);
                    }
                  }
                }
              }).catch(error => {
                console.error('DeepGram processing error:', error);
                // We already processed the Web Speech API transcript, so just continue
              });
            } else {
              // Fallback to DeepGram if Web Speech API didn't capture enough
              const audioBlob = new Blob(chunks, { type: 'audio/webm' });
              
              // Transcribe the audio with DeepGram
              const text = await transcribeAudio(audioBlob);
              
              // If Deepgram returned an empty string (failed), use what we have from Web Speech API
              if (!text && initialTranscript) {
                await processDictationTranscript(initialTranscript);
              } else if (text) {
                // Enhance the transcription with AI if we got text from Deepgram
                try {
                  const enhancedText = await enhanceTranscribedText(text);
                  await processDictationTranscript(enhancedText);
                } catch (enhanceError) {
                  console.error('Error enhancing text:', enhanceError);
                  // Just use the raw text if enhancement fails
                  await processDictationTranscript(text);
                }
              } else {
                // Both methods failed, but we might still have partial text
                // Check if we have ANYTHING from the visible transcript
                const anyText = visibleTranscript.replace(/\[.*?\]$/, '').trim();
                if (anyText && anyText !== 'Listening to your voice...') {
                  // Use whatever we have, even if it's very short
                  await processDictationTranscript(anyText);
                  simulateAgentActivity("warning", "Used partial transcription.", 2000);
                } else {
                  // Truly nothing available - show error
                  throw new Error('Could not transcribe audio. Please try again.');
                }
              }
            }
            
          } catch (error) {
            console.error('Error processing recording:', error);
            setIsProcessing(false);
            
            // Final fallback: check if we have ANYTHING in the visible transcript
            const partialTranscript = visibleTranscript.replace(/\[.*?\]$/, '').trim();
            if (partialTranscript && partialTranscript !== 'Listening to your voice...') {
              // Use whatever we got from browser speech recognition
              await processDictationTranscript(partialTranscript);
              simulateAgentActivity("warning", "Used partial transcription from browser.", 2000);
            } else {
              simulateAgentActivity("error", "Error processing recording. Please try again.", 2000);
            }
          }
        };
        
        // Start recording for later DeepGram processing
        recorder.start(1000); // Capture in 1-second chunks
        
        // Set up Web Speech API for immediate real-time transcription feedback
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.maxAlternatives = 1;
          
          // Try to improve stability with these settings
          // Lower max duration to prevent browser from automatically cutting off long dictations
          recognition.interimResults = true; // Enable interim results for immediate feedback
          
          // Store the recognition instance to stop it later
          window.speechRecognitionInstance = recognition;
          
          // Add an onend handler to restart if needed
          recognition.onend = () => {
            // If we're still recording but recognition ended unexpectedly, restart it
            if (isRecording && mediaRecorderRef.current?.state === 'recording') {
              console.log('Speech recognition ended unexpectedly, restarting...');
              try {
                // Only restart if we haven't manually stopped
                if (window.speechRecognitionInstance === recognition) {
                  recognition.start();
                }
              } catch (error) {
                console.error('Error restarting speech recognition:', error);
              }
            }
          };
          
          recognition.onresult = (event: SpeechRecognitionEvent) => {
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
            
            // Update visible transcript with both final and interim results
            setVisibleTranscript(prev => {
              // Keep only the final part of previous transcript
              const base = prev === 'Listening to your voice...' ? '' : 
                            prev.replace(/\[.*?\]$/, '').trim();
              
              // Add new final text if available
              const newBase = finalTranscript ? 
                (base ? base + ' ' + finalTranscript : finalTranscript) : base;
                
              // Add interim results in brackets
              return newBase + (interimTranscript ? ` [${interimTranscript}]` : '');
            });
          };
          
          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error', event.error);
            
            // Don't treat 'aborted' as a fatal error - this happens normally when stopping
            if (event.error !== 'aborted') {
              // For non-abort errors, show a notification
              simulateAgentActivity("warning", `Speech recognition issue: ${event.error}`, 2000);
            }
            
            // Don't let the speech recognition abort stop the recording process
            // The MediaRecorder will continue to work
          };
          
          // Start the recognition
          recognition.start();
        }
        
      } catch (micError) {
        console.error('Error accessing microphone:', micError);
        setIsRecording(false);
        setShowDictationPopup(false);
        simulateAgentActivity("error", "Could not access microphone. Please check permissions.", 2000);
        
        if (recordingInterval) {
          clearInterval(recordingInterval);
          setRecordingInterval(null);
        }
      }
    }
  };
  
  // Approve dictation and add notes to canvas
  const approveDictation = () => {
    const newNotes = dictationNotes.map(note => ({
      ...note,
      id: String(Date.now()) + Math.random().toString(36).substr(2, 5),
      position: {
        x: -canvasOffset.x + window.innerWidth / 2 - 150 + (Math.random() * 100 - 50),
        y: -canvasOffset.y + window.innerHeight / 2 - 150 + (Math.random() * 100 - 50)
      }
    }));
    
    setNotes(prev => [...prev, ...newNotes]);
    setShowDictationPreview(false);
    setDictationNotes([]);
    
    // Simulate agent activity for confirmation
    simulateAgentActivity("success", "Notes created successfully!", 1500);
  };
  
  // Cancel dictation
  const cancelDictation = () => {
    setShowDictationPreview(false);
    setDictationNotes([]);
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
    if (e.key === ' ' || e.code === 'Space') {
      setIsSpacePressed(true);
      document.body.style.cursor = 'grab';
    }
    
    // Command palette shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.code === 'Space') {
      setIsSpacePressed(false);
      document.body.style.cursor = 'default';
    }
  };

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSpacePressed) {
      setIsDragging(true);
      setStartPoint({ x: e.clientX, y: e.clientY });
      document.body.style.cursor = 'grabbing';
    }
  };

  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
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
      document.body.style.cursor = isSpacePressed ? 'grab' : 'default';
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(scale * scaleFactor, 0.1), 5);
      
      // Adjust canvas offset to zoom toward cursor position
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const newOffsetX = mouseX - (mouseX - canvasOffset.x) * (newScale / scale);
        const newOffsetY = mouseY - (mouseY - canvasOffset.y) * (newScale / scale);
        
        setCanvasOffset({ x: newOffsetX, y: newOffsetY });
      }
      
      setScale(newScale);
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
              className={`app-nav-button ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
            >
              <Mic className="w-5 h-5" />
              <span className="text-sm">
                {isRecording ? 'Recording...' : 'Voice Input'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BrowserRouter>
      <DndProvider backend={HTML5Backend}>
        <div className="app">
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
                      height: canvasSize.height
                    }}
                  >
                    {notes.map(note => (
                      <NoteComponent
                        key={note.id}
                        note={note}
                        onMove={handleMove}
                        onContentChange={(id, content) => updateNote(id, { content })}
                        onUpdateNote={updateNote}
                        onDeleteNote={removeNote}
                        isSelected={selectedNoteId === note.id}
                        onSelect={() => setSelectedNoteId(note.id)}
                        isHighlighted={focusedNoteId === note.id}
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
                    Stop Recording
                  </button>
                </div>
              </div>

              <div className="dictation-preview-content">
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
                
                <div style={{ marginTop: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                  {!isProcessing && 'Speak clearly into your microphone. Click Stop when finished.'}
                </div>
              </div>
            </div>
          )}

          {/* Dictation Preview Panel (after processing) */}
          {showDictationPreview && (
            <DictationPreview
              isVisible={showDictationPreview}
              notes={dictationNotes}
              onApprove={approveDictation}
              onCancel={cancelDictation}
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

// Add type definitions for the Web Speech API
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

export default App;