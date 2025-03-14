import React, { useState, useEffect, useRef } from 'react';
import { Note, Label } from '../types';
import { Search, X, Filter, Calendar, Tag, Star, CheckSquare } from 'lucide-react';

interface EnhancedSearchProps {
  notes: Note[];
  onSearchResult: (filteredNotes: Note[]) => void;
  onNoteSelect: (noteId: string) => void;
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  notes,
  onSearchResult,
  onNoteSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [completionFilter, setCompletionFilter] = useState<string | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Filter notes based on search term and filters
  const filterNotes = () => {
    let filtered = [...notes];
    
    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(note => {
        const contentMatch = note.content?.toLowerCase().includes(term);
        const labelMatch = note.labels?.some(label => 
          label.name.toLowerCase().includes(term)
        );
        
        return contentMatch || labelMatch;
      });
    }
    
    // Date filter
    if (dateFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateFilter === 'today') {
        filtered = filtered.filter(note => {
          if (!note.dueDate) return false;
          const dueDate = new Date(note.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === today.getTime();
        });
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        filtered = filtered.filter(note => {
          if (!note.dueDate) return false;
          const dueDate = new Date(note.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === tomorrow.getTime();
        });
      } else if (dateFilter === 'week') {
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);
        
        filtered = filtered.filter(note => {
          if (!note.dueDate) return false;
          const dueDate = new Date(note.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate >= today && dueDate <= weekLater;
        });
      } else if (dateFilter === 'overdue') {
        filtered = filtered.filter(note => {
          if (!note.dueDate) return false;
          const dueDate = new Date(note.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < today && !note.completed;
        });
      }
    }
    
    // Tag filter
    if (tagFilter) {
      filtered = filtered.filter(note => 
        note.labels?.some(label => label.name === tagFilter)
      );
    }
    
    // Priority filter
    if (priorityFilter) {
      filtered = filtered.filter(note => note.priority === priorityFilter);
    }
    
    // Completion filter
    if (completionFilter) {
      if (completionFilter === 'completed') {
        filtered = filtered.filter(note => note.completed);
      } else if (completionFilter === 'not_completed') {
        filtered = filtered.filter(note => !note.completed);
      }
    }
    
    return filtered;
  };
  
  // Handle search
  const handleSearch = () => {
    const filtered = filterNotes();
    onSearchResult(filtered);
    setShowResults(true);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setDateFilter(null);
    setTagFilter(null);
    setPriorityFilter(null);
    setCompletionFilter(null);
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value === '') {
      onSearchResult(notes);
    } else {
      handleSearch();
    }
  };
  
  // Get all unique tags from notes
  const getAllTags = (): Label[] => {
    const tags: { [key: string]: Label } = {};
    
    notes.forEach(note => {
      note.labels?.forEach(label => {
        if (!tags[label.id]) {
          tags[label.id] = label;
        }
      });
    });
    
    return Object.values(tags);
  };
  
  // Render search results
  const renderSearchResults = () => {
    if (!showResults) return null;
    
    const filtered = filterNotes();
    
    return (
      <div className="search-results">
        <div className="search-results-header">
          <span>{filtered.length} results</span>
          <button 
            className="close-results-button"
            onClick={() => setShowResults(false)}
          >
            <X size={14} />
          </button>
        </div>
        
        <div className="search-results-list">
          {filtered.length === 0 ? (
            <div className="no-results">No results found</div>
          ) : (
            filtered.map(note => (
              <div 
                key={note.id} 
                className="search-result-item"
                onClick={() => {
                  onNoteSelect(note.id);
                  setShowResults(false);
                }}
              >
                <div 
                  className="search-result-color" 
                  style={{ backgroundColor: note.color }}
                ></div>
                <div className="search-result-content">
                  <div className="search-result-title">
                    {note.content && typeof note.content === 'string' 
                      ? note.content.split('\n')[0] 
                      : 'Untitled'}
                  </div>
                  <div className="search-result-excerpt">
                    {note.content && typeof note.content === 'string' 
                      ? highlightSearchTerm(note.content.substring(0, 100), searchTerm) 
                      : 'No content'
                    }
                  </div>
                  
                  {note.labels && note.labels.length > 0 && (
                    <div className="search-result-tags">
                      {note.labels.slice(0, 3).map(label => (
                        <span 
                          key={label.id} 
                          className="search-result-tag"
                          style={{ backgroundColor: label.color + '20', color: label.color }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {note.labels.length > 3 && (
                        <span className="search-result-tag-more">
                          +{note.labels.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };
  
  // Function to highlight search term in text
  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;
    
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() ? 
            <span key={i} className="highlight">{part}</span> : 
            part
        )}
      </>
    );
  };
  
  // Render filter controls
  const renderFilters = () => {
    if (!showFilters) return null;
    
    const tags = getAllTags();
    
    return (
      <div className="search-filters">
        <div className="filter-section">
          <h4 className="filter-heading">Date</h4>
          <div className="filter-options">
            <button 
              className={`filter-option ${dateFilter === 'today' ? 'selected' : ''}`}
              onClick={() => setDateFilter(dateFilter === 'today' ? null : 'today')}
            >
              Today
            </button>
            <button 
              className={`filter-option ${dateFilter === 'tomorrow' ? 'selected' : ''}`}
              onClick={() => setDateFilter(dateFilter === 'tomorrow' ? null : 'tomorrow')}
            >
              Tomorrow
            </button>
            <button 
              className={`filter-option ${dateFilter === 'week' ? 'selected' : ''}`}
              onClick={() => setDateFilter(dateFilter === 'week' ? null : 'week')}
            >
              This Week
            </button>
            <button 
              className={`filter-option ${dateFilter === 'overdue' ? 'selected' : ''}`}
              onClick={() => setDateFilter(dateFilter === 'overdue' ? null : 'overdue')}
            >
              Overdue
            </button>
          </div>
        </div>
        
        <div className="filter-section">
          <h4 className="filter-heading">Tags</h4>
          <div className="filter-options tags-filter">
            {tags.length === 0 ? (
              <span className="no-tags">No tags available</span>
            ) : (
              tags.map(tag => (
                <button 
                  key={tag.id}
                  className={`filter-option tag-option ${tagFilter === tag.name ? 'selected' : ''}`}
                  style={{ 
                    backgroundColor: tagFilter === tag.name ? tag.color : 'transparent',
                    color: tagFilter === tag.name ? '#fff' : tag.color,
                    borderColor: tag.color
                  }}
                  onClick={() => setTagFilter(tagFilter === tag.name ? null : tag.name)}
                >
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </div>
        
        <div className="filter-section">
          <h4 className="filter-heading">Priority</h4>
          <div className="filter-options">
            <button 
              className={`filter-option ${priorityFilter === 'high' ? 'selected' : ''}`}
              onClick={() => setPriorityFilter(priorityFilter === 'high' ? null : 'high')}
            >
              High
            </button>
            <button 
              className={`filter-option ${priorityFilter === 'medium' ? 'selected' : ''}`}
              onClick={() => setPriorityFilter(priorityFilter === 'medium' ? null : 'medium')}
            >
              Medium
            </button>
            <button 
              className={`filter-option ${priorityFilter === 'low' ? 'selected' : ''}`}
              onClick={() => setPriorityFilter(priorityFilter === 'low' ? null : 'low')}
            >
              Low
            </button>
          </div>
        </div>
        
        <div className="filter-section">
          <h4 className="filter-heading">Status</h4>
          <div className="filter-options">
            <button 
              className={`filter-option ${completionFilter === 'completed' ? 'selected' : ''}`}
              onClick={() => setCompletionFilter(completionFilter === 'completed' ? null : 'completed')}
            >
              Completed
            </button>
            <button 
              className={`filter-option ${completionFilter === 'not_completed' ? 'selected' : ''}`}
              onClick={() => setCompletionFilter(completionFilter === 'not_completed' ? null : 'not_completed')}
            >
              Not Completed
            </button>
          </div>
        </div>
        
        <div className="filter-actions">
          <button className="clear-filters" onClick={clearFilters}>
            Clear All
          </button>
          <button className="apply-filters" onClick={handleSearch}>
            Apply Filters
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="enhanced-search-container" ref={searchRef}>
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => {
              if (searchTerm) {
                setShowResults(true);
              }
            }}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchTerm('');
                onSearchResult(notes);
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        <button 
          className={`filter-button ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} />
        </button>
      </div>
      
      {renderFilters()}
      {renderSearchResults()}
    </div>
  );
};

export default EnhancedSearch; 