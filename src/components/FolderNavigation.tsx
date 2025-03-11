import React, { useState } from 'react';
import { 
  Folder, 
  FolderPlus, 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Edit2, 
  Hash,
  Check,
  Calendar,
  Star,
  Lock,
  Tag
} from 'lucide-react';
import { Note as NoteType } from '../types';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  isSmartFolder?: boolean;
  filter?: FolderFilter;
}

export interface FolderFilter {
  type: 'tag' | 'date' | 'priority' | 'secure' | 'favorite';
  value?: string;
}

interface FolderNavigationProps {
  folders: Folder[];
  notes: NoteType[];
  selectedFolder: string | null;
  onFolderSelect: (folderId: string) => void;
  onFolderCreate: (folder: Folder) => void;
  onFolderUpdate: (folderId: string, updates: Partial<Folder>) => void;
  onFolderDelete: (folderId: string) => void;
}

export const FolderNavigation: React.FC<FolderNavigationProps> = ({
  folders,
  notes,
  selectedFolder,
  onFolderSelect,
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete
}) => {
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [newFolderFilter, setNewFolderFilter] = useState<FolderFilter | null>(null);

  // Get root folders
  const rootFolders = folders.filter(folder => folder.parentId === null);
  
  // Get child folders
  const getChildFolders = (parentId: string) => {
    return folders.filter(folder => folder.parentId === parentId);
  };
  
  // Toggle folder expansion
  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId) 
        : [...prev, folderId]
    );
  };
  
  // Create a new folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: newFolderName,
      parentId: null,
      isSmartFolder: newFolderFilter !== null,
      filter: newFolderFilter || undefined
    };
    
    onFolderCreate(newFolder);
    setNewFolderName('');
    setIsCreatingFolder(false);
    setNewFolderFilter(null);
  };
  
  // Update an existing folder
  const handleUpdateFolder = (folderId: string) => {
    if (!editFolderName.trim()) return;
    
    onFolderUpdate(folderId, { name: editFolderName });
    setEditingFolder(null);
    setEditFolderName('');
  };
  
  // Count notes in a folder
  const countNotesInFolder = (folderId: string) => {
    // Get the folder
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return 0;
    
    // If it's a smart folder, apply filters
    if (folder.isSmartFolder && folder.filter) {
      return applyFilter(notes, folder.filter).length;
    }
    
    // Regular folder - check tags
    return notes.filter(note => {
      // Assuming notes have a folderId property - you might need to adjust this
      return note.labels?.some(label => label.name === folder.name);
    }).length;
  };
  
  // Apply smart folder filters
  const applyFilter = (notes: NoteType[], filter: FolderFilter) => {
    switch (filter.type) {
      case 'tag':
        return notes.filter(note => note.labels?.some(label => label.name === filter.value));
      case 'date':
        // Filter by due date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return notes.filter(note => {
          if (!note.dueDate) return false;
          const dueDate = new Date(note.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === today.getTime();
        });
      case 'priority':
        return notes.filter(note => note.priority === filter.value);
      case 'secure':
        return notes.filter(note => note.content?.startsWith('encrypted:'));
      case 'favorite':
        // Assuming notes have a favorite property
        return notes.filter(note => note.labels?.some(label => label.name === 'Favorite'));
      default:
        return notes;
    }
  };
  
  // Render a folder icon based on its type
  const renderFolderIcon = (folder: Folder) => {
    if (!folder.isSmartFolder) return <Folder size={16} />;
    
    switch (folder.filter?.type) {
      case 'tag': return <Hash size={16} />;
      case 'date': return <Calendar size={16} />;
      case 'priority': return <Star size={16} />;
      case 'secure': return <Lock size={16} />;
      case 'favorite': return <Star size={16} fill="yellow" />;
      default: return <Folder size={16} />;
    }
  };
  
  // Render each folder
  const renderFolder = (folder: Folder) => {
    const hasChildren = getChildFolders(folder.id).length > 0;
    const isExpanded = expandedFolders.includes(folder.id);
    const isSelected = selectedFolder === folder.id;
    const noteCount = countNotesInFolder(folder.id);
    
    return (
      <div key={folder.id} className="folder-item">
        <div 
          className={`folder-row ${isSelected ? 'selected' : ''}`}
          onClick={() => onFolderSelect(folder.id)}
        >
          {hasChildren ? (
            <button 
              className="expand-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpansion(folder.id);
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : <div className="expand-placeholder"></div>}
          
          {renderFolderIcon(folder)}
          
          {editingFolder === folder.id ? (
            <input
              type="text"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateFolder(folder.id);
                if (e.key === 'Escape') setEditingFolder(null);
              }}
              onBlur={() => handleUpdateFolder(folder.id)}
              autoFocus
              className="folder-edit-input"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="folder-name">{folder.name}</span>
          )}
          
          <span className="note-count">{noteCount}</span>
          
          {!folder.isSmartFolder && (
            <div className="folder-actions">
              <button 
                className="edit-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingFolder(folder.id);
                  setEditFolderName(folder.name);
                }}
              >
                <Edit2 size={14} />
              </button>
              <button 
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFolderDelete(folder.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="child-folders">
            {getChildFolders(folder.id).map(childFolder => renderFolder(childFolder))}
          </div>
        )}
      </div>
    );
  };
  
  // Render filter options for smart folders
  const renderFilterOptions = () => {
    if (!showFilterOptions) return null;
    
    return (
      <div className="filter-options">
        <div className="filter-option-group">
          <h4>Filter Type</h4>
          <div className="filter-options-buttons">
            <button 
              className={`filter-option ${newFolderFilter?.type === 'tag' ? 'selected' : ''}`}
              onClick={() => setNewFolderFilter({ type: 'tag' })}
            >
              <Tag size={14} /> Tags
            </button>
            <button 
              className={`filter-option ${newFolderFilter?.type === 'date' ? 'selected' : ''}`}
              onClick={() => setNewFolderFilter({ type: 'date' })}
            >
              <Calendar size={14} /> Today
            </button>
            <button 
              className={`filter-option ${newFolderFilter?.type === 'priority' ? 'selected' : ''}`}
              onClick={() => setNewFolderFilter({ type: 'priority', value: 'high' })}
            >
              <Star size={14} /> High Priority
            </button>
            <button 
              className={`filter-option ${newFolderFilter?.type === 'secure' ? 'selected' : ''}`}
              onClick={() => setNewFolderFilter({ type: 'secure' })}
            >
              <Lock size={14} /> Secure Notes
            </button>
            <button 
              className={`filter-option ${newFolderFilter?.type === 'favorite' ? 'selected' : ''}`}
              onClick={() => setNewFolderFilter({ type: 'favorite' })}
            >
              <Star size={14} fill="yellow" /> Favorites
            </button>
          </div>
        </div>
        
        {newFolderFilter?.type === 'tag' && (
          <div className="tag-value-input">
            <input
              type="text"
              placeholder="Enter tag name"
              value={newFolderFilter.value || ''}
              onChange={(e) => setNewFolderFilter({ ...newFolderFilter, value: e.target.value })}
              className="tag-input"
            />
          </div>
        )}
        
        <div className="filter-actions">
          <button 
            className="cancel-button"
            onClick={() => {
              setShowFilterOptions(false);
              setNewFolderFilter(null);
            }}
          >
            Cancel
          </button>
          <button 
            className="apply-button"
            onClick={() => setShowFilterOptions(false)}
            disabled={newFolderFilter?.type === 'tag' && !newFolderFilter.value}
          >
            <Check size={14} /> Apply
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="folder-navigation">
      <div className="folder-header">
        <h3>Folders</h3>
        <button 
          className="new-folder-button"
          onClick={() => {
            setIsCreatingFolder(true);
            setShowFilterOptions(false);
          }}
        >
          <FolderPlus size={16} />
        </button>
      </div>
      
      {isCreatingFolder && (
        <div className="new-folder-form">
          <div className="folder-type-selector">
            <button 
              className={`folder-type-button ${!newFolderFilter ? 'selected' : ''}`}
              onClick={() => setNewFolderFilter(null)}
            >
              Regular
            </button>
            <button 
              className={`folder-type-button ${newFolderFilter ? 'selected' : ''}`}
              onClick={() => setShowFilterOptions(true)}
            >
              Smart
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="new-folder-input"
          />
          
          {renderFilterOptions()}
          
          <div className="new-folder-actions">
            <button 
              className="cancel-button"
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
                setNewFolderFilter(null);
              }}
            >
              Cancel
            </button>
            <button 
              className="create-button"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
            >
              Create
            </button>
          </div>
        </div>
      )}
      
      <div className="folders-list">
        {rootFolders.map(renderFolder)}
      </div>
    </div>
  );
};

export default FolderNavigation; 