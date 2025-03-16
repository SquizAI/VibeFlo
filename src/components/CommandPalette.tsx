import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, Zap, Clock, Star } from 'lucide-react';
import '../styles/commandPalette.css';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string) => void;
}

interface CommandItem {
  id: string;
  text: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExecuteCommand
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandListRef = useRef<HTMLDivElement>(null);
  
  // Sample commands
  const commands: CommandItem[] = [
    { 
      id: 'new-note', 
      text: 'Create a new note', 
      category: 'Notes',
      icon: <Command size={16} />,
      shortcut: 'N',
      keywords: ['add', 'create', 'note', 'new']
    },
    { 
      id: 'new-task', 
      text: 'Create a new task', 
      category: 'Tasks',
      icon: <Command size={16} />,
      shortcut: 'T',
      keywords: ['add', 'create', 'task', 'new', 'todo']
    },
    { 
      id: 'search-web', 
      text: 'Search the web for information', 
      category: 'Web',
      icon: <Search size={16} />,
      keywords: ['google', 'internet', 'find', 'lookup']
    },
    { 
      id: 'summarize-notes', 
      text: 'Summarize all my notes', 
      category: 'AI',
      icon: <Zap size={16} />,
      keywords: ['ai', 'summary', 'analyze']
    },
    { 
      id: 'generate-tasks', 
      text: 'Generate tasks from selected note', 
      category: 'AI',
      icon: <Zap size={16} />,
      keywords: ['ai', 'extract', 'create', 'tasks']
    },
    { 
      id: 'create-template', 
      text: 'Create a new task template', 
      category: 'Templates',
      icon: <Command size={16} />,
      shortcut: 'Shift+T',
      keywords: ['template', 'create', 'new']
    }
  ];
  
  // Recent commands (would be stored in localStorage or state in a real app)
  const recentCommands: CommandItem[] = [
    { 
      id: 'recent-search', 
      text: 'Search the web for React hooks', 
      category: 'Recent',
      icon: <Clock size={16} />,
      keywords: ['search', 'web', 'react']
    },
    { 
      id: 'recent-summary', 
      text: 'Summarize meeting notes from yesterday', 
      category: 'Recent',
      icon: <Clock size={16} />,
      keywords: ['summarize', 'meeting', 'notes']
    }
  ];
  
  // Favorite commands (would be stored in localStorage or state in a real app)
  const favoriteCommands: CommandItem[] = [
    { 
      id: 'favorite-task', 
      text: 'Create a new high priority task', 
      category: 'Favorites',
      icon: <Star size={16} />,
      keywords: ['task', 'priority', 'high']
    }
  ];

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      setSearchQuery('');
    }
  }, [isOpen]);
  
  // Filter commands based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show recents and favorites when no search query
      setFilteredCommands([...favoriteCommands, ...recentCommands]);
      return;
    }
    
    // Natural language processing simulation
    // In a real app, this would use an LLM or more sophisticated NLP
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/);
    
    // Find commands that match the query
    const matched = commands.filter(command => {
      // Check if command text contains the query
      if (command.text.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Check if any keywords match
      if (command.keywords && command.keywords.some(keyword => 
        queryWords.some(word => keyword.includes(word) || word.includes(keyword))
      )) {
        return true;
      }
      
      return false;
    });
    
    setFilteredCommands(matched);
    setSelectedIndex(0);
  }, [searchQuery]);
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        if (filteredCommands.length > 0) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
      default:
        break;
    }
  };
  
  // Keep selected item in view
  useEffect(() => {
    const selectedElement = document.getElementById(`command-${selectedIndex}`);
    if (selectedElement && commandListRef.current) {
      const container = commandListRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = selectedElement.getBoundingClientRect();
      
      if (elementRect.bottom > containerRect.bottom) {
        container.scrollTop += elementRect.bottom - containerRect.bottom;
      } else if (elementRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - elementRect.top;
      }
    }
  }, [selectedIndex]);
  
  const executeCommand = (command: CommandItem) => {
    onExecuteCommand(command.text);
    onClose();
  };

  // Using a portal would be better for accessibility in a real app
  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div 
        className="command-palette" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="command-palette-header">
          <Search size={16} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="command-input"
            autoComplete="off"
            spellCheck="false"
          />
          <div className="command-shortcut-hint">
            <kbd>↑</kbd><kbd>↓</kbd> to navigate • <kbd>Enter</kbd> to select • <kbd>Esc</kbd> to close
          </div>
        </div>
        
        <div className="command-palette-results" ref={commandListRef}>
          {filteredCommands.length === 0 ? (
            <div className="no-commands-found">
              {searchQuery ? 
                <>
                  <p>No commands found for "<strong>{searchQuery}</strong>"</p>
                  <p className="try-help">Try typing "help" or "create" to see available commands</p>
                </> :
                <p>Type to search for commands</p>
              }
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                id={`command-${index}`}
                key={command.id}
                className={`command-item ${selectedIndex === index ? 'selected' : ''}`}
                onClick={() => executeCommand(command)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="command-item-icon">
                  {command.icon || <ArrowRight size={16} />}
                </div>
                <div className="command-item-content">
                  <div className="command-item-text">{command.text}</div>
                  <div className="command-item-category">{command.category}</div>
                </div>
                {command.shortcut && (
                  <div className="command-item-shortcut">
                    <kbd>{command.shortcut}</kbd>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="command-palette-footer">
          <span>AI-powered command palette • Try typing natural language</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette; 