import React, { useState, useEffect } from 'react';

// Common categories for auto-labeling with associated colors
const AUTO_LABEL_CATEGORIES = [
  { name: 'Work', keywords: ['work', 'job', 'project', 'meeting', 'deadline', 'client', 'report'], color: '#3b82f6' },
  { name: 'Personal', keywords: ['family', 'home', 'personal', 'life', 'birthday', 'anniversary'], color: '#ec4899' },
  { name: 'Health', keywords: ['health', 'doctor', 'workout', 'exercise', 'gym', 'medicine', 'appointment'], color: '#10b981' },
  { name: 'Finance', keywords: ['money', 'finance', 'budget', 'payment', 'bill', 'expense', 'tax', 'income'], color: '#f59e0b' },
  { name: 'Learning', keywords: ['learn', 'study', 'book', 'course', 'education', 'class', 'lecture', 'read'], color: '#8b5cf6' },
  { name: 'Travel', keywords: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'booking', 'visit'], color: '#14b8a6' },
  { name: 'Shopping', keywords: ['buy', 'purchase', 'shop', 'order', 'store', 'online', 'delivery'], color: '#fb923c' },
  { name: 'Home', keywords: ['house', 'apartment', 'clean', 'repair', 'maintenance', 'decoration'], color: '#78350f' },
  { name: 'Urgent', keywords: ['urgent', 'important', 'critical', 'asap', 'immediately', 'emergency'], color: '#ef4444' },
];

// Function to analyze note content and suggest labels
export const suggestLabelsFromContent = (content: string): {name: string, color: string}[] => {
  if (!content || content.trim().length < 5) return [];
  
  const contentLower = content.toLowerCase();
  const suggestedCategories: {name: string, color: string}[] = [];
  
  AUTO_LABEL_CATEGORIES.forEach(category => {
    // Check if any keyword appears in the content
    const foundKeyword = category.keywords.some(keyword => contentLower.includes(keyword));
    if (foundKeyword) {
      suggestedCategories.push({ name: category.name, color: category.color });
    }
  });
  
  return suggestedCategories.slice(0, 3); // Limit to 3 suggestions
};

// Component for Auto Label suggestions
interface AutoLabelSuggestionProps {
  noteId: string;
  content: string;
  onAddLabel: (noteId: string, label: {id: string, name: string, color: string}) => void;
}

const AutoLabelSuggestion: React.FC<AutoLabelSuggestionProps> = ({ 
  noteId, 
  content, 
  onAddLabel 
}) => {
  const [suggestions, setSuggestions] = useState<{name: string, color: string}[]>([]);
  
  useEffect(() => {
    if (content) {
      // Only suggest labels if there's meaningful content
      const newSuggestions = suggestLabelsFromContent(content);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [content]);
  
  if (suggestions.length === 0) return null;
  
  return (
    <div className="mt-2">
      <p className="text-xs text-white/60 mb-1">Suggested labels:</p>
      <div className="flex flex-wrap gap-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={`label-suggestion-${index}`}
            onClick={() => {
              onAddLabel(noteId, {
                id: crypto.randomUUID(),
                name: suggestion.name,
                color: suggestion.color
              });
              // Remove this suggestion
              setSuggestions(prev => prev.filter((_, i) => i !== index));
            }}
            className="flex items-center text-xs px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            style={{ color: suggestion.color }}
          >
            + {suggestion.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AutoLabelSuggestion; 