import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowRight, Sparkles } from 'lucide-react';

interface CommandSuggestion {
  id: string;
  text: string;
}

const AICommandBar: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Example command suggestions
  const suggestions: CommandSuggestion[] = [
    { id: 'dictate', text: 'Transcribe my voice note' },
    { id: 'tasks', text: 'Extract tasks from my last note' },
    { id: 'recipe', text: 'Process recipe and create shopping list' },
    { id: 'summarize', text: 'Summarize my selected notes' },
    { id: 'organize', text: 'Organize my notes by topic' }
  ];

  // Filter suggestions based on input
  const filteredSuggestions = inputValue 
    ? suggestions.filter(s => s.text.toLowerCase().includes(inputValue.toLowerCase()))
    : suggestions;

  // Handle command submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      console.log('Processing command:', inputValue);
      // Here you would call the appropriate AI function based on the command
      // For example, parse the input and determine if it's about dictation, task extraction, etc.
      
      // Reset input after processing
      setInputValue('');
    }
  };

  // Focus input with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+Space to focus command bar
      if (e.altKey && e.code === 'Space') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className={`relative rounded-lg border ${isFocused ? 'border-blue-500' : 'border-[#333]'} transition-colors duration-200`}>
          <div className="absolute left-3 top-2.5 text-gray-400">
            <Sparkles size={16} className="text-blue-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-9 pr-8 py-2 bg-[#242424] rounded-lg text-sm focus:outline-none"
            placeholder="Ask AI to do something..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {inputValue && (
            <button 
              type="submit"
              className="absolute right-2 top-2 text-blue-400 hover:text-blue-300"
            >
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Command suggestions */}
      {isFocused && filteredSuggestions.length > 0 && (
        <div className="mt-2 bg-[#242424] border border-[#333] rounded-lg overflow-hidden z-[1001] absolute w-full shadow-lg">
          <div className="py-1">
            {filteredSuggestions.map(suggestion => (
              <button
                key={suggestion.id}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#2a2a2a] flex items-center"
                onClick={() => {
                  setInputValue(suggestion.text);
                  inputRef.current?.focus();
                }}
              >
                <Search size={12} className="mr-2 text-gray-400" />
                {suggestion.text}
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 text-xs border-t border-[#333] text-gray-400">
            Press Enter to execute command
          </div>
        </div>
      )}
      
      {/* Keyboard shortcut hint */}
      {!isFocused && (
        <div className="mt-1 text-xs text-gray-400 flex justify-end">
          Press Alt+Space to focus
        </div>
      )}
    </div>
  );
};

export default AICommandBar; 