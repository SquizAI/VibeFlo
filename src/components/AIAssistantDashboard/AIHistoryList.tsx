import React from 'react';
import { Mic, ListTodo, FileText, ShoppingCart, MessageSquare, Check, X, Clock } from 'lucide-react';

// Define the types for history entries
interface AIHistoryEntry {
  id: string;
  type: 'dictation' | 'task-extraction' | 'recipe-processor' | 'grocery' | 'chat';
  status: 'success' | 'error' | 'processing';
  timestamp: Date;
  description: string;
  result?: string;
}

// Mock data for demonstration
const mockHistoryData: AIHistoryEntry[] = [
  {
    id: '1',
    type: 'dictation',
    status: 'success',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    description: 'Voice dictation completed',
    result: 'Created note with 120 words'
  },
  {
    id: '2',
    type: 'task-extraction',
    status: 'success',
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    description: 'Extracted tasks from note',
    result: 'Found 5 tasks'
  },
  {
    id: '3',
    type: 'recipe-processor',
    status: 'error',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    description: 'Failed to process recipe',
    result: 'No recipe structure detected'
  },
  {
    id: '4',
    type: 'grocery',
    status: 'success',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    description: 'Categorized grocery items',
    result: 'Organized 12 items into 4 categories'
  }
];

const AIHistoryList: React.FC = () => {
  // Function to get the icon for each history entry type
  const getIcon = (type: AIHistoryEntry['type']) => {
    switch (type) {
      case 'dictation':
        return <Mic size={16} />;
      case 'task-extraction':
        return <ListTodo size={16} />;
      case 'recipe-processor':
        return <FileText size={16} />;
      case 'grocery':
        return <ShoppingCart size={16} />;
      case 'chat':
        return <MessageSquare size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  // Function to get status icon
  const getStatusIcon = (status: AIHistoryEntry['status']) => {
    switch (status) {
      case 'success':
        return <Check size={14} className="text-green-500" />;
      case 'error':
        return <X size={14} className="text-red-500" />;
      case 'processing':
        return <Clock size={14} className="text-blue-500 animate-pulse" />;
      default:
        return null;
    }
  };

  // Function to format timestamp
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-2">
      {mockHistoryData.length === 0 ? (
        <div className="text-center py-4 text-text-secondary text-sm">
          No recent AI activity
        </div>
      ) : (
        mockHistoryData.map(entry => (
          <div 
            key={entry.id} 
            className="bg-white/5 p-3 rounded-lg border border-border-light"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <div className="p-1.5 bg-accent-blue/10 rounded-md text-accent-blue mr-2">
                  {getIcon(entry.type)}
                </div>
                <span className="text-sm font-medium">{entry.description}</span>
              </div>
              <div className="flex items-center">
                {getStatusIcon(entry.status)}
                <span className="text-xs text-text-secondary ml-1">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
            </div>
            {entry.result && (
              <div className="text-xs text-text-secondary ml-8">
                {entry.result}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default AIHistoryList; 