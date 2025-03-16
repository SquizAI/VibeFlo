import React, { useState, useEffect } from 'react';
import { useNoteStore } from '../store/noteStore';
import { 
  ChevronDown, ChevronRight, Folder, FileText, 
  Plus, FolderPlus, Star, CheckSquare, Lock, Calendar,
  MessageSquare, Mic, Tag, Clock, FileImage, AlertTriangle,
  Edit, Trash, Search, Square, CheckSquare as CheckedSquare
} from 'lucide-react';
import { Note } from '../types';

interface Folder {
  id: string;
  name: string;
  icon?: React.ReactNode;
  count?: number;
  children?: Folder[];
  isSmartFolder?: boolean;
  isEditable?: boolean; // Allow editing for custom folders
}

interface NotesFolderProps {
  onSelectFolder: (folderId: string) => void;
  selectedFolderId: string;
  onSearch: (query: string) => void;
  onSort: (sortBy: 'updated' | 'created' | 'title' | 'category') => void;
}

const NotesFolder: React.FC<NotesFolderProps> = ({ 
  onSelectFolder, 
  selectedFolderId,
  onSearch,
  onSort
}) => {
  const { notes, deleteNote, completeNote } = useNoteStore();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'system': true, // System folders are expanded by default
    'smart': true,  // Smart folders are expanded by default
  });
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title' | 'category'>('updated');
  const [showNotes, setShowNotes] = useState(true);
  
  // Get last 7 days date for recently updated
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  // Get today's date for today's notes
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Build folder structure
  const folders: Folder[] = [
    {
      id: 'system',
      name: 'System',
      children: [
        { id: 'all', name: 'All Notes', icon: <FileText size={16} />, count: notes.length },
        { 
          id: 'recent', 
          name: 'Recent', 
          icon: <Clock size={16} />, 
          count: notes.filter(n => new Date(n.updatedAt || Date.now()).getTime() > lastWeek.getTime()).length 
        },
        { id: 'starred', name: 'Starred', icon: <Star size={16} />, count: notes.filter(n => n.pinned).length },
        { id: 'tasks', name: 'Tasks', icon: <CheckSquare size={16} />, count: notes.filter(n => n.type === 'task' || (n.tasks && n.tasks.length > 0)).length },
        { id: 'secure', name: 'Secure Notes', icon: <Lock size={16} />, count: notes.filter(n => n.content && typeof n.content === 'string' && n.content.startsWith('encrypted:')).length }
      ]
    },
    {
      id: 'smart',
      name: 'Smart Folders',
      children: [
        { 
          id: 'today', 
          name: 'Today\'s Notes', 
          icon: <Calendar size={16} />,
          count: notes.filter(n => {
            const createdDate = new Date(n.createdAt || Date.now());
            createdDate.setHours(0, 0, 0, 0);
            return createdDate.getTime() === today.getTime();
          }).length
        },
        { 
          id: 'voice', 
          name: 'Voice Recordings', 
          icon: <Mic size={16} />,
          count: notes.filter(n => n.isVoiceNote === true).length
        },
        { 
          id: 'with_images', 
          name: 'With Images', 
          icon: <FileImage size={16} />,
          count: notes.filter(n => n.attachments?.some(a => a.type?.startsWith('image/'))).length
        },
        {
          id: 'with_tasks',
          name: 'With Tasks',
          icon: <CheckSquare size={16} />,
          count: notes.filter(n => n.tasks && n.tasks.length > 0).length
        },
        {
          id: 'incomplete',
          name: 'Incomplete Tasks',
          icon: <AlertTriangle size={16} />,
          count: notes.filter(n => n.tasks && n.tasks.some(t => !t.done)).length
        }
      ]
    },
    {
      id: 'categories',
      name: 'Categories',
      children: [
        { id: 'work', name: 'Work', icon: <Folder size={16} />, count: notes.filter(n => n.category === 'work').length, isEditable: true },
        { id: 'personal', name: 'Personal', icon: <Folder size={16} />, count: notes.filter(n => n.category === 'personal').length, isEditable: true },
        { id: 'ideas', name: 'Ideas', icon: <Folder size={16} />, count: notes.filter(n => n.category === 'ideas').length, isEditable: true }
      ]
    }
  ];
  
  // Helper function to extract title from note content
  const getNoteTitle = (note: Note): string => {
    if (!note.content) return 'Untitled Note';
    
    const content = note.content.toString();
    // Try to extract first line and remove markdown heading symbols
    const firstLine = content.split('\n')[0].replace(/^#+\s+/, '');
    return firstLine || 'Untitled Note';
  };
  
  // Helper function to get task completion status
  const getTaskCompletionStatus = (note: Note): { total: number, completed: number } => {
    if (!note.tasks || note.tasks.length === 0) {
      return { total: 0, completed: 0 };
    }
    
    const total = note.tasks.length;
    const completed = note.tasks.filter(task => task.done).length;
    return { total, completed };
  };

  // Handle note completion toggle
  const handleToggleComplete = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    completeNote(noteId);
  };
  
  // Handle note deletion
  const handleDeleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNote(noteId);
    }
  };

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  // Handle sort dropdown change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sortType = e.target.value as 'updated' | 'created' | 'title' | 'category';
    setSortBy(sortType);
    onSort(sortType);
  };

  // Handle adding a new folder
  const handleAddFolder = () => {
    setIsAddingFolder(true);
    setNewFolderName('');
  };

  // Handle saving a new folder
  const handleSaveNewFolder = () => {
    if (newFolderName.trim()) {
      // Add folder logic here
      console.log('New folder:', newFolderName);
      setIsAddingFolder(false);
      setNewFolderName('');
    }
  };

  // Handle editing a folder name
  const handleEditFolder = (folderId: string) => {
    setEditingFolderId(folderId);
  };

  // Render a note item
  const renderNoteItem = (note: Note) => {
    const title = getNoteTitle(note);
    const taskStatus = getTaskCompletionStatus(note);
    const hasCompletedTasks = taskStatus.completed > 0;
    const allTasksCompleted = taskStatus.total > 0 && taskStatus.completed === taskStatus.total;
    
    return (
      <div 
        key={note.id}
        className={`
          flex items-center py-1.5 px-2 rounded-md cursor-pointer ml-4
          ${note.id === selectedFolderId ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[#242424]'}
        `}
        onClick={() => onSelectFolder(note.id)}
      >
        <button 
          className="mr-2 text-gray-400 hover:text-white"
          onClick={(e) => handleToggleComplete(note.id, e)}
          title={allTasksCompleted ? "Mark as incomplete" : "Mark as complete"}
        >
          {allTasksCompleted ? 
            <CheckedSquare size={16} className="text-green-500" /> : 
            <Square size={16} />
          }
        </button>
        
        <div className="flex-1 truncate">
          <span className="truncate">{title}</span>
          {taskStatus.total > 0 && (
            <span className="ml-2 text-xs text-gray-500">
              {taskStatus.completed}/{taskStatus.total}
            </span>
          )}
        </div>
        
        <button 
          className="ml-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100"
          onClick={(e) => handleDeleteNote(note.id, e)}
          title="Delete note"
        >
          <Trash size={14} />
        </button>
      </div>
    );
  };
  
  const renderFolderItem = (folder: Folder, level = 0) => {
    const isExpanded = expandedFolders[folder.id];
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const isEditing = editingFolderId === folder.id;
    
    // Get notes for this folder
    const folderNotes = notes.filter(note => {
      if (folder.id === 'all') return true;
      if (folder.id === 'recent') {
        const updatedAt = note.updatedAt ? new Date(note.updatedAt) : new Date();
        return updatedAt >= lastWeek;
      }
      if (folder.id === 'starred') return note.pinned === true;
      if (folder.id === 'tasks') return note.tasks && note.tasks.length > 0;
      if (folder.id === 'secure') return false; // No secure property, can be implemented later
      if (folder.id === 'today') {
        const createdAt = note.createdAt ? new Date(note.createdAt) : new Date();
        return createdAt >= today;
      }
      if (folder.id === 'voice') return note.isVoiceNote === true;
      if (folder.id === 'images') return note.attachments && note.attachments.some(a => a.type.startsWith('image/'));
      if (folder.id === 'with-tasks') return note.tasks && note.tasks.length > 0;
      if (folder.id === 'incomplete-tasks') {
        return note.tasks && note.tasks.some(task => !task.done);
      }
      
      // For category folders
      return note.category === folder.id;
    });
    
    return (
      <div key={folder.id} className="group">
        <div 
          className={`
            flex items-center py-1.5 px-2 rounded-md cursor-pointer 
            ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[#242424]'} 
            ${level > 0 ? 'ml-4' : ''}
          `}
        >
          {hasChildren || folderNotes.length > 0 ? (
            <div 
              className="mr-1 text-gray-400" 
              onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          ) : (
            <div className="mr-1 w-4"></div>
          )}
          
          <div 
            className="flex-1 flex items-center"
            onClick={() => onSelectFolder(folder.id)}
          >
            <div className="mr-2 text-gray-400">
              {folder.icon || <Folder size={16} />}
            </div>
            
            {isEditing ? (
              <input
                type="text"
                className="flex-1 bg-[#1a1a1a] border border-blue-500/30 rounded px-1 py-0.5 text-sm"
                defaultValue={folder.name}
                autoFocus
                onBlur={() => setEditingFolderId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingFolderId(null);
                  if (e.key === 'Escape') setEditingFolderId(null);
                }}
              />
            ) : (
              <span className="flex-1">{folder.name}</span>
            )}
            
            {folder.count !== undefined && (
              <span className="ml-2 text-xs text-gray-500">{folder.count}</span>
            )}
            
            {/* Show actual note count instead of predefined count */}
            {folder.count === undefined && folderNotes.length > 0 && (
              <span className="ml-2 text-xs text-gray-500">{folderNotes.length}</span>
            )}
          </div>
          
          {folder.isEditable && !isEditing && (
            <div className="opacity-0 group-hover:opacity-100 flex">
              <button 
                className="p-1 text-gray-400 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditFolder(folder.id);
                }}
              >
                <Edit size={12} />
              </button>
            </div>
          )}
        </div>
        
        {isExpanded && (
          <div className="mt-1">
            {/* Render child folders */}
            {hasChildren && folder.children!.map(child => renderFolderItem(child, level + 1))}
            
            {/* Render notes in this folder */}
            {folderNotes.length > 0 && showNotes && folderNotes.map(note => renderNoteItem(note))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <div className="px-2 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            className="w-full py-2 pl-8 pr-4 bg-white/5 rounded-lg border border-border-light text-sm"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-text-secondary" />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center justify-between">
          <label className="text-xs text-text-secondary">Sort by:</label>
          <select
            className="text-xs bg-white/5 rounded border border-border-light py-1 px-2"
            value={sortBy}
            onChange={handleSortChange}
          >
            <option value="updated">Last Updated</option>
            <option value="created">Date Created</option>
            <option value="title">Title</option>
            <option value="category">Category</option>
          </select>
        </div>

        {/* Folders Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Folders</h3>
          <button 
            className="p-1 rounded-md hover:bg-[#333] text-gray-400 hover:text-white"
            title="Add New Folder"
            onClick={handleAddFolder}
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>
      
      {isAddingFolder && (
        <div className="px-2 mb-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              className="flex-1 bg-[#242424] border border-[#333] rounded py-1 px-2 text-sm"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNewFolder();
                if (e.key === 'Escape') setIsAddingFolder(false);
              }}
            />
            <button
              className="p-1 rounded bg-blue-500 text-white"
              onClick={handleSaveNewFolder}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-1">
        {folders.map(folder => renderFolderItem(folder))}
      </div>
      
      <div className="pt-2 border-t border-[#333] mt-4">
        <button 
          className="w-full flex items-center justify-center py-1.5 text-sm rounded-md bg-[#242424] hover:bg-[#333] transition-colors"
        >
          <Plus size={14} className="mr-1" />
          <span>New Note</span>
        </button>
      </div>
    </div>
  );
};

export default NotesFolder; 