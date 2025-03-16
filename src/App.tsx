import React, { useState, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import NoteView from './components/NoteView';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './styles.css';
import { analyzeNoteFile, compareNoteImplementations } from './utils/debugNoteComponent';
import AIAssistantDashboard from './components/AIAssistantDashboard/AIAssistantDashboard';
import NotesFolder from './components/NotesFolder';
import { 
  BrainCircuit, Layers, Menu, X, Filter, 
  PanelLeft, PanelRight, Sliders, Plus, 
  LayoutDashboard, FileText, List, Settings,
  Search, ChevronLeft, Mic, Edit
} from 'lucide-react';
import { useNoteStore } from './store/noteStore';

function App() {
  const { notes, addNote } = useNoteStore();
  const [viewMode, setViewMode] = useState<'canvas' | 'notes'>('canvas');
  const [debugInitialized, setDebugInitialized] = useState(false);
  const [isAIDashboardOpen, setIsAIDashboardOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState('all');
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks' | 'collections'>('notes');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const switchToCanvas = () => setViewMode('canvas');
  const switchToNotes = () => setViewMode('notes');
  
  const toggleAIDashboard = () => {
    console.log('Toggling AI Dashboard:', !isAIDashboardOpen);
    setIsAIDashboardOpen(!isAIDashboardOpen);
  };

  // Initialize debug tools when the app loads
  useEffect(() => {
    // Only run in development mode and if not already initialized
    if (import.meta.env.DEV && !debugInitialized) {
      console.info('🔍 Debug Tools: Analyzing Note component issues...');
      
      // Run component analysis with a safety timeout
      const debugTimeout = setTimeout(() => {
        try {
          // Analyze the Note.tsx file for issues
          analyzeNoteFile().catch(error => {
            console.error('Failed to analyze Note file, but continuing app execution:', error);
          });
          
          // Compare implementations for debugging help
          compareNoteImplementations();
          
          setDebugInitialized(true);
        } catch (error) {
          console.error('Debug tools encountered an error, but the app will continue to function:', error);
        }
      }, 1500); // Slightly longer delay to ensure app and MCP are loaded
      
      // Clean up the timeout if component unmounts
      return () => clearTimeout(debugTimeout);
    }
  }, [debugInitialized]);

  // Handle keyboard shortcut for AI dashboard
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle AI dashboard with Cmd+/ or Ctrl+/
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        toggleAIDashboard();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle creating a new note
  const handleCreateNewNote = () => {
    const newNote = {
      id: crypto.randomUUID(),
      type: 'sticky' as const,
      content: '',
      position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
      color: 'blue',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: selectedFolderId !== 'all' && selectedFolderId !== 'recent' ? selectedFolderId : undefined
    };
    
    addNote(newNote);
    
    // If we're in notes view, we'll stay there, otherwise switch to canvas
    if (viewMode === 'canvas') {
      // Just add the note to the canvas
    } else {
      // Stay in notes view but select the new note
      // This would require passing the selected note ID to NoteView
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen flex flex-col bg-[#121212] text-white">
        {/* Main Header */}
        <header className="h-12 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between px-4">
          <div className="flex items-center">
            <span className="font-semibold text-lg mr-8">Smart Notes</span>
            <div className="flex space-x-6">
              <button 
                className={`px-2 py-1 ${viewMode === 'canvas' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
                onClick={switchToCanvas}
              >
                Canvas View
              </button>
              <button 
                className={`px-2 py-1 ${viewMode === 'notes' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
                onClick={switchToNotes}
              >
                Notes View
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative w-56">
              <input
                type="text"
                placeholder="Search notes..."
                className="w-full bg-[#242424] border border-[#333] rounded-full py-1 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            </div>
            
            <button className="p-2 hover:bg-[#333] rounded">
              <Filter size={16} />
            </button>
            <button className="p-2 hover:bg-[#333] rounded">
              <Settings size={16} />
            </button>
          </div>
        </header>
        
        {/* Sub Header/Navigation */}
        <div className="h-10 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <button className="p-1 hover:bg-[#333] rounded">
              <ChevronLeft size={18} />
            </button>
            <span className="font-medium">{viewMode === 'canvas' ? 'Canvas' : 'Notes'}</span>
            
            {viewMode === 'canvas' && (
              <button className="ml-2 p-1 hover:bg-[#333] rounded flex items-center">
                <LayoutDashboard size={16} className="mr-1" />
                <span className="text-sm">Organize</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {viewMode === 'notes' && (
              <>
                <button className="p-1 hover:bg-[#333] rounded flex items-center">
                  <Edit size={16} className="mr-1" />
                  <span className="text-sm">Edit</span>
                </button>
                <button className="p-1 hover:bg-[#333] rounded flex items-center">
                  <Mic size={16} className="mr-1" />
                  <span className="text-sm">Voice</span>
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-64 bg-[#1a1a1a] border-r border-[#333] flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-[#333]">
              <button 
                className={`flex-1 p-2 text-sm font-medium ${activeTab === 'notes' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('notes')}
              >
                Notes
              </button>
              <button 
                className={`flex-1 p-2 text-sm font-medium ${activeTab === 'tasks' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('tasks')}
              >
                Tasks
              </button>
              <button 
                className={`flex-1 p-2 text-sm font-medium ${activeTab === 'collections' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('collections')}
              >
                Collections
              </button>
            </div>
            
            {/* Folders Section - Pass selected folder and handler */}
            <div className="flex-1 overflow-y-auto p-3">
              <NotesFolder 
                onSelectFolder={setSelectedFolderId}
                selectedFolderId={selectedFolderId}
                onSearch={(query: string) => setSearchTerm(query)}
                onSort={(sortType: any) => console.log('Sort by:', sortType)}
              />
            </div>
          </aside>
          
          {/* Main Content */}
          <main className="flex-1 relative bg-[#121212] overflow-hidden">
            {viewMode === 'canvas' ? (
              <Canvas onSwitchToNotes={switchToNotes} />
            ) : (
              <NoteView 
                onSwitchToCanvas={switchToCanvas} 
                selectedFolder={selectedFolderId}
                searchTerm={searchTerm}
              />
            )}
            
            {/* Only show Add Note button in Notes view, not in Canvas view */}
            {viewMode === 'notes' && (
              <button
                onClick={handleCreateNewNote}
                className="absolute bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-lg transition-colors duration-200 z-[900]"
                aria-label="Add new note"
              >
                <Plus size={20} />
              </button>
            )}
          </main>
        </div>
        
        {/* AI Assistant Dashboard */}
        <AIAssistantDashboard 
          isOpen={isAIDashboardOpen} 
          onClose={toggleAIDashboard} 
        />
        
        {/* AI Dashboard Toggle Button */}
        <button
          className="fixed z-[1000] bottom-6 right-42 p-3 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-colors"
          onClick={toggleAIDashboard}
          aria-label="Toggle AI Assistant"
          title="Toggle AI Assistant (⌘/)"
        >
          <BrainCircuit size={20} />
        </button>
      </div>
    </DndProvider>
  );
}

export default App;
