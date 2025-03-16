import React, { useState, useEffect, useRef } from 'react';
import { Note as NoteType, Label, Task } from '../types';
import { useNoteStore } from '../store/noteStore';
import NotesFolder from './NotesFolder';
import FolderNavigation, { Folder } from './FolderNavigation';
import EnhancedSearch from './EnhancedSearch';
import SecureNote from './SecureNote';
import { 
  Calendar, Star, Flag, User, Bell, CheckSquare, Tag, 
  Edit, Trash2, Lock, Pin, Heart, Plus, ChevronDown, ChevronRight, X,
  Mic as MicrophoneIcon,
  Search
} from 'lucide-react';
import { PlusIcon, XIcon } from 'lucide-react';
import { extractTasksFromText, processDictationTranscript } from '../lib/ai';

interface NoteViewProps {
  onSwitchToCanvas: () => void;
  selectedFolder?: string;
  searchTerm?: string;
}

interface NoteCardProps {
  note: NoteType;
  onClick: () => void;
  isSelected: boolean;
  onDelete: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, isSelected, onDelete }) => {
  return (
    <div 
      className={`p-3 border rounded-md cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/10 border-primary' : 'bg-secondary border-border-light hover:bg-secondary-hover'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium truncate">
          {note.content && typeof note.content === 'string' 
            ? note.content.split('\n')[0].substring(0, 40) || 'Untitled' 
            : 'Untitled'}
        </h3>
        
        <button 
          className="p-1 text-muted hover:text-error rounded-full hover:bg-error/10 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-2 mt-2 text-xs text-muted">
        <span>{new Date(note.dueDate || Date.now()).toLocaleDateString()}</span>
        
        {note.category && (
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
            {note.category}
          </span>
        )}
      </div>
    </div>
  );
};

interface NoteEditorProps {
  note: NoteType;
  onClose: () => void;
  onUpdate: (note: NoteType) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onClose, onUpdate }) => {
  const [content, setContent] = useState(note.content || '');
  
  const handleSave = () => {
    onUpdate({
      ...note,
      content
    });
  };
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-lg shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border-light">
          <h2 className="text-lg font-semibold">Edit Note</h2>
          <button 
            className="p-1 rounded-full hover:bg-secondary"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <textarea
            className="w-full h-64 p-3 bg-secondary border border-border-light rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your note here..."
          />
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-border-light">
          <button 
            className="px-4 py-2 border border-border-light rounded-md hover:bg-secondary transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const NoteView: React.FC<NoteViewProps> = ({ onSwitchToCanvas, selectedFolder = 'all', searchTerm = '' }) => {
  const { notes, addNote, deleteNote, updateNote, completeNote, setDueDate, setPriority, setAssignee } = useNoteStore();
  
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'all', name: 'All Notes', parentId: null },
    { id: 'recent', name: 'Recent', parentId: null },
    { id: 'favorites', name: 'Favorites', parentId: null, isSmartFolder: true, filter: { type: 'favorite' } },
    { id: 'secure', name: 'Secure Notes', parentId: null, isSmartFolder: true, filter: { type: 'secure' } },
    { id: 'tasks', name: 'Tasks', parentId: null }
  ]);
  
  const [selectedFolderState, setSelectedFolderState] = useState<string>(selectedFolder);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [notesInView, setNotesInView] = useState<NoteType[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(searchTerm);
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title' | 'category'>('updated');
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Update selected folder when prop changes
  useEffect(() => {
    if (selectedFolder) {
      setSelectedFolderState(selectedFolder);
    }
  }, [selectedFolder]);
  
  // Handle search from NotesFolder
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handle sort from NotesFolder
  const handleSort = (sortType: 'updated' | 'created' | 'title' | 'category') => {
    setSortBy(sortType);
  };

  // Filter and sort notes based on current state
  useEffect(() => {
    let filtered = [...notes];

    // Apply folder filter
    if (selectedFolderState !== 'all') {
      filtered = filtered.filter(note => note.category === selectedFolderState);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.content?.toLowerCase().includes(query) ||
        note.category?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        case 'created':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'title':
          return (a.content || '').localeCompare(b.content || '');
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        default:
          return 0;
      }
    });

    setNotesInView(filtered);
  }, [notes, selectedFolderState, searchQuery, sortBy]);
  
  // Handle folder creation
  const handleFolderCreate = (folder: Folder) => {
    setFolders([...folders, folder]);
  };
  
  // Handle folder update
  const handleFolderUpdate = (folderId: string, updates: Partial<Folder>) => {
    setFolders(folders.map(folder => 
      folder.id === folderId ? { ...folder, ...updates } : folder
    ));
  };
  
  // Handle folder deletion
  const handleFolderDelete = (folderId: string) => {
    setFolders(folders.filter(folder => folder.id !== folderId));
    
    // If the deleted folder was selected, select 'All Notes'
    if (selectedFolder === folderId) {
      setSelectedFolderState('all');
    }
  };
  
  // Handle note selection
  const handleNoteSelect = (noteId: string) => {
    setSelectedNote(noteId);
  };
  
  // Handle new note creation
  const handleCreateNote = () => {
    const newNote: NoteType = {
      id: crypto.randomUUID(),
      type: 'sticky',
      content: '',
      position: { x: 0, y: 0 },
      color: 'blue',
      labels: []
    };
    
    // Add folder as label if not 'all', 'recent', 'favorites', 'secure', or 'tasks'
    if (!['all', 'recent', 'favorites', 'secure', 'tasks'].includes(selectedFolder)) {
      const folder = folders.find(f => f.id === selectedFolder);
      if (folder) {
        newNote.labels = [
          {
            id: crypto.randomUUID(),
            name: folder.name,
            color: '#3b82f6' // Default blue color
          }
        ];
      }
    }
    
    addNote(newNote);
    setSelectedNote(newNote.id);
  };
  
  // Handle note deletion
  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    setSelectedNote(null);
  };
  
  // Handle note content update
  const handleContentChange = (id: string, content: string, isEncrypted?: boolean) => {
    updateNote(id, { content });
    
    // If it's a secure note, add it to the secure notes folder via a label
    if (isEncrypted) {
      const note = notes.find(n => n.id === id);
      if (note) {
        const secureLabel = note.labels?.find(l => l.name === 'Secure');
        if (!secureLabel) {
          const updatedLabels = [
            ...(note.labels || []),
            {
              id: crypto.randomUUID(),
              name: 'Secure',
              color: '#ef4444' // Red color for secure notes
            }
          ];
          updateNote(id, { labels: updatedLabels });
        }
      }
    }
  };
  
  // Handle adding a task to a note
  const handleAddTask = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: 'New task',
      done: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedTasks = [...(note.tasks || []), newTask];
    updateNote(noteId, { tasks: updatedTasks, type: 'task' });
  };
  
  // Handle toggling task completion
  const handleToggleTask = (noteId: string, taskId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.tasks) return;
    
    const updatedTasks = note.tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, done: !task.done };
      }
      return task;
    });
    
    updateNote(noteId, { tasks: updatedTasks });
  };
  
  // Handle adding a label/tag to a note
  const handleAddLabel = (noteId: string, labelName: string, color: string = '#3b82f6') => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Check if label already exists
    if (note.labels?.some(l => l.name === labelName)) return;
    
    const newLabel: Label = {
      id: crypto.randomUUID(),
      name: labelName,
      color
    };
    
    const updatedLabels = [...(note.labels || []), newLabel];
    updateNote(noteId, { labels: updatedLabels });
  };
  
  // Handle removing a label from a note
  const handleRemoveLabel = (noteId: string, labelId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.labels) return;
    
    const updatedLabels = note.labels.filter(label => label.id !== labelId);
    updateNote(noteId, { labels: updatedLabels });
  };
  
  // Toggle favorite status of a note
  const handleToggleFavorite = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const favoriteLabel = note.labels?.find(l => l.name === 'Favorite');
    
    if (favoriteLabel) {
      // Remove favorite label
      handleRemoveLabel(noteId, favoriteLabel.id);
    } else {
      // Add favorite label
      handleAddLabel(noteId, 'Favorite', '#eab308'); // Yellow color for favorites
    }
  };
  
  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleRealTimeTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please ensure you have granted microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRealTimeTranscription = async (audioBlob: Blob) => {
    try {
      // Create form data for the audio
      const formData = new FormData();
      formData.append('audio', audioBlob);

      // Send to Deepgram API
      const response = await fetch('https://api.deepgram.com/v1/listen', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${import.meta.env.VITE_DEEPGRAM_API_KEY}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      const transcribedText = data.results?.channels[0]?.alternatives[0]?.transcript || '';
      
      if (transcribedText) {
        setTranscript(transcribedText);
        await processDictationTranscript(transcribedText);
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      alert('Error transcribing audio. Please try again.');
    }
  };

  const handleMicButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  // Render component logic
  return (
    <div className="note-view h-full">
      <div className="flex h-full">
        <div className="w-64 border-r border-border-light p-4">
          <NotesFolder
            onSelectFolder={setSelectedFolderState}
            selectedFolderId={selectedFolderState}
            onSearch={handleSearch}
            onSort={handleSort}
          />
        </div>
        <div className="flex-1">
          <div className="note-view-container h-full">
            <div className="p-4">
              <div className="note-list space-y-2">
                {notesInView.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onClick={() => setSelectedNote(note.id)}
                    isSelected={selectedNote === note.id}
                    onDelete={() => handleDeleteNote(note.id)}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleMicButtonClick}
              className="mic-button"
              aria-label={isRecording ? "Stop recording" : "Start voice recording"}
              title={isRecording ? "Stop recording" : "Start voice recording"}
            >
              <MicrophoneIcon size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteView; 