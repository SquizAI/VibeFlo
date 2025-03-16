import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Filter,
  CheckSquare,
  Tag,
  ArrowUpDown,
  Circle,
  X,
  Flag,
  Search,
  SlidersHorizontal
} from 'lucide-react';
import { PriorityLevel } from '../types';

interface FilteringPanelProps {
  onFilterChange: (filters: FilterOptions) => void;
  onSortChange: (sort: SortOption) => void;
  initialFilters?: Partial<FilterOptions>;
  initialSort?: SortOption;
  categories: string[];
  priorities: PriorityLevel[];
}

export interface FilterOptions {
  searchTerm: string;
  categories: string[];
  priorities: PriorityLevel[];
  hasTasks: boolean | null;
  dueDateStatus: 'all' | 'overdue' | 'today' | 'thisWeek' | 'future' | 'none';
}

export type SortOption = {
  field: 'title' | 'priority' | 'dueDate' | 'created' | 'updated' | 'category' | 'completion';
  direction: 'asc' | 'desc';
};

const FilteringPanel: React.FC<FilteringPanelProps> = ({ 
  onFilterChange, 
  onSortChange,
  initialFilters,
  initialSort,
  categories,
  priorities
}) => {
  // Initialize filters with defaults or provided values
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: initialFilters?.searchTerm || '',
    categories: initialFilters?.categories || [],
    priorities: initialFilters?.priorities || [],
    hasTasks: initialFilters?.hasTasks || null,
    dueDateStatus: initialFilters?.dueDateStatus || 'all'
  });

  // Initialize sorting
  const [sort, setSort] = useState<SortOption>(initialSort || {
    field: 'updated',
    direction: 'desc'
  });

  // Track if the panel is expanded
  const [isExpanded, setIsExpanded] = useState(false);

  // Update parent when filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  // Update parent when sort changes
  useEffect(() => {
    onSortChange(sort);
  }, [sort, onSortChange]);

  // Toggle category filter
  const toggleCategory = (category: string) => {
    setFilters(prev => {
      // If already in filters, remove it
      if (prev.categories.includes(category)) {
        return {
          ...prev,
          categories: prev.categories.filter(c => c !== category)
        };
      } 
      // Otherwise add it
      else {
        return {
          ...prev,
          categories: [...prev.categories, category]
        };
      }
    });
  };

  // Toggle priority filter
  const togglePriority = (priority: PriorityLevel) => {
    setFilters(prev => {
      // If already in filters, remove it
      if (prev.priorities.includes(priority)) {
        return {
          ...prev,
          priorities: prev.priorities.filter(p => p !== priority)
        };
      } 
      // Otherwise add it
      else {
        return {
          ...prev,
          priorities: [...prev.priorities, priority]
        };
      }
    });
  };

  // Set has tasks filter
  const setHasTasksFilter = (value: boolean | null) => {
    setFilters(prev => ({
      ...prev,
      hasTasks: value
    }));
  };

  // Set due date status filter
  const setDueDateFilter = (status: FilterOptions['dueDateStatus']) => {
    setFilters(prev => ({
      ...prev,
      dueDateStatus: status
    }));
  };

  // Update sort
  const updateSort = (field: SortOption['field']) => {
    setSort(prev => {
      // If already sorting by this field, toggle direction
      if (prev.field === field) {
        return {
          ...prev,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      // Otherwise, set this field with default desc direction
      else {
        return {
          field,
          direction: 'desc'
        };
      }
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      categories: [],
      priorities: [],
      hasTasks: null,
      dueDateStatus: 'all'
    });
  };

  // Get the count of active filters
  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.categories.length > 0) count++;
    if (filters.priorities.length > 0) count++;
    if (filters.hasTasks !== null) count++;
    if (filters.dueDateStatus !== 'all') count++;
    return count;
  };

  // Get the sort icon
  const getSortIcon = (field: SortOption['field']) => {
    if (sort.field !== field) {
      return null;
    }

    return sort.direction === 'asc' ? (
      <ArrowUpDown size={14} className="rotate-180" />
    ) : (
      <ArrowUpDown size={14} />
    );
  };

  // Render priority color indicator
  const getPriorityColor = (priority: PriorityLevel): string => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Get color for date status
  const getDateStatusColor = (status: FilterOptions['dueDateStatus']): string => {
    switch (status) {
      case 'overdue': return 'text-red-500';
      case 'today': return 'text-yellow-500';
      case 'thisWeek': return 'text-blue-500';
      case 'future': return 'text-green-500';
      case 'none': return 'text-gray-500';
      default: return 'text-white';
    }
  };

  return (
    <div className="filtering-panel bg-card-bg border border-border-light rounded-lg shadow-md">
      {/* Toggle header */}
      <div 
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Filter size={16} />
          <h3 className="text-sm font-medium">Filters & Sorting</h3>
          {getActiveFilterCount() > 0 && (
            <span className="text-xs bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded">
              {getActiveFilterCount()}
            </span>
          )}
        </div>
        <button className="p-1 rounded hover:bg-white/10">
          {isExpanded ? (
            <SlidersHorizontal size={16} className="rotate-90" />
          ) : (
            <SlidersHorizontal size={16} />
          )}
        </button>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="p-3 border-t border-border-light">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                className="w-full bg-white/5 pl-8 pr-3 py-1.5 rounded text-sm outline-none focus:ring-1 focus:ring-accent-blue"
                placeholder="Search in notes..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
              {filters.searchTerm && (
                <button 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-secondary p-0.5 hover:text-text-primary rounded-full hover:bg-white/10"
                  onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs text-text-secondary mb-2 flex items-center gap-1">
                <Tag size={12} />
                Categories
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`text-xs px-2 py-1 rounded-full ${
                      filters.categories.includes(category)
                        ? 'bg-accent-blue/20 text-accent-blue'
                        : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }`}
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Priorities */}
          <div className="mb-4">
            <h4 className="text-xs text-text-secondary mb-2 flex items-center gap-1">
              <Flag size={12} />
              Priority
            </h4>
            <div className="flex gap-1.5">
              {priorities.map(priority => (
                <button
                  key={priority}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                    filters.priorities.includes(priority)
                      ? 'bg-accent-blue/20 text-accent-blue'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                  onClick={() => togglePriority(priority)}
                >
                  <Circle size={8} className={getPriorityColor(priority)} />
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="mb-4">
            <h4 className="text-xs text-text-secondary mb-2 flex items-center gap-1">
              <CheckSquare size={12} />
              Tasks
            </h4>
            <div className="flex gap-1.5">
              <button
                className={`text-xs px-2 py-1 rounded ${
                  filters.hasTasks === true
                    ? 'bg-accent-blue/20 text-accent-blue'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
                onClick={() => setHasTasksFilter(filters.hasTasks === true ? null : true)}
              >
                With Tasks
              </button>
              <button
                className={`text-xs px-2 py-1 rounded ${
                  filters.hasTasks === false
                    ? 'bg-accent-blue/20 text-accent-blue'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
                onClick={() => setHasTasksFilter(filters.hasTasks === false ? null : false)}
              >
                Without Tasks
              </button>
            </div>
          </div>

          {/* Due Date */}
          <div className="mb-4">
            <h4 className="text-xs text-text-secondary mb-2 flex items-center gap-1">
              <Calendar size={12} />
              Due Date
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'overdue', 'today', 'thisWeek', 'future', 'none'] as const).map(status => (
                <button
                  key={status}
                  className={`text-xs px-2 py-1 rounded ${
                    filters.dueDateStatus === status
                      ? 'bg-accent-blue/20 text-accent-blue'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                  onClick={() => setDueDateFilter(status)}
                >
                  <span className={status !== 'all' ? getDateStatusColor(status) : ''}>
                    {status === 'all' ? 'All' : 
                     status === 'overdue' ? 'Overdue' :
                     status === 'today' ? 'Today' :
                     status === 'thisWeek' ? 'This Week' :
                     status === 'future' ? 'Future' : 'No Date'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sorting */}
          <div className="mb-4">
            <h4 className="text-xs text-text-secondary mb-2 flex items-center gap-1">
              <ArrowUpDown size={12} />
              Sort By
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                  sort.field === 'title' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
                onClick={() => updateSort('title')}
              >
                <span>Title</span>
                {getSortIcon('title')}
              </button>
              
              <button
                className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                  sort.field === 'priority' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
                onClick={() => updateSort('priority')}
              >
                <span>Priority</span>
                {getSortIcon('priority')}
              </button>
              
              <button
                className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                  sort.field === 'dueDate' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
                onClick={() => updateSort('dueDate')}
              >
                <span>Due Date</span>
                {getSortIcon('dueDate')}
              </button>
              
              <button
                className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                  sort.field === 'updated' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
                onClick={() => updateSort('updated')}
              >
                <span>Last Updated</span>
                {getSortIcon('updated')}
              </button>
              
              <button
                className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                  sort.field === 'created' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
                onClick={() => updateSort('created')}
              >
                <span>Date Created</span>
                {getSortIcon('created')}
              </button>
              
              <button
                className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                  sort.field === 'completion' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
                onClick={() => updateSort('completion')}
              >
                <span>Completion</span>
                {getSortIcon('completion')}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <button
              className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded flex items-center gap-1"
              onClick={resetFilters}
            >
              <X size={12} />
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilteringPanel; 