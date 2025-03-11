import React, { useState } from 'react';
import { X, Plus, Check, Settings as SettingsIcon } from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { availableColors, defaultCategoryColors } from '../store/noteStore';
import { NoteColor } from '../types';

// Color circles for the color picker
const ColorCircle = ({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-8 h-8 rounded-full transition-all ${
      selected ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-gray-900' : 'hover:scale-105'
    }`}
    style={{ 
      backgroundColor: `var(--accent-${color})`,
      boxShadow: selected ? `0 0 10px var(--accent-${color})` : 'none'
    }}
    aria-label={`Select ${color} color`}
  />
);

export function Settings() {
  const { 
    settings, 
    updateCategoryColor, 
    toggleShowCompletedNotes, 
    setDefaultNoteColor,
    toggleSettingsOpen,
    addCustomCategory 
  } = useNoteStore();
  
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<NoteColor>('blue');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  
  // Get all unique categories from the settings
  const categories = Object.keys(settings.categoryColors);
  
  // Handle adding a new category
  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.toLowerCase().trim())) {
      addCustomCategory(newCategory.toLowerCase().trim(), newCategoryColor);
      setNewCategory('');
    }
  };
  
  // Reset to default colors
  const resetToDefaults = () => {
    Object.entries(defaultCategoryColors).forEach(([category, color]) => {
      updateCategoryColor(category, color as NoteColor);
    });
  };
  
  return (
    <div className={`fixed inset-0 z-50 bg-app-bg/95 backdrop-blur-md flex items-center justify-center transition-all duration-300 ${
      settings.isSettingsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      <div className="bg-card-bg rounded-xl shadow-xl border border-border-light w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Settings
          </h2>
          <button 
            onClick={toggleSettingsOpen}
            className="p-2 hover:bg-card-hover rounded-full transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Category Colors */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary mb-4">Task Categories & Colors</h3>
            
            <div className="space-y-2">
              {categories.map(category => (
                <div key={category} className="flex items-center justify-between p-3 bg-node-bg rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-5 h-5 rounded-full" 
                      style={{ backgroundColor: `var(--accent-${settings.categoryColors[category]})` }}
                    />
                    <span className="text-text-primary capitalize">{category}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {availableColors.map(color => (
                      <ColorCircle
                        key={color}
                        color={color}
                        selected={settings.categoryColors[category] === color}
                        onClick={() => updateCategoryColor(category, color as NoteColor)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add New Category */}
            <div className="flex items-center gap-3 mt-4 p-3 bg-node-bg rounded-lg">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name..."
                className="bg-card-bg text-text-primary rounded-lg px-3 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-accent-blue placeholder-text-secondary/50 border border-border-light"
              />
              
              <div className="flex gap-2">
                {availableColors.slice(0, 4).map(color => (
                  <ColorCircle
                    key={color}
                    color={color}
                    selected={newCategoryColor === color}
                    onClick={() => setNewCategoryColor(color as NoteColor)}
                  />
                ))}
              </div>
              
              <button
                onClick={handleAddCategory}
                disabled={!newCategory.trim()}
                className={`p-2 rounded-lg ${
                  newCategory.trim() ? 'bg-accent-green text-white hover:bg-accent-green/90' : 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                }`}
                aria-label="Add category"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Default Note Color */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Default Note Color</h3>
            
            <div className="flex flex-wrap gap-3">
              {availableColors.map(color => (
                <ColorCircle
                  key={color}
                  color={color}
                  selected={settings.defaultNoteColor === color}
                  onClick={() => setDefaultNoteColor(color as NoteColor)}
                />
              ))}
            </div>
          </div>
          
          {/* Other Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">Display Options</h3>
            
            <label className="flex items-center gap-3 p-3 bg-node-bg rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showCompletedNotes}
                onChange={toggleShowCompletedNotes}
                className="w-5 h-5 rounded accent-accent-blue"
              />
              <span className="text-text-primary">Show completed notes</span>
            </label>
          </div>
          
          {/* Reset Button */}
          <div className="flex justify-end pt-4 border-t border-border-light">
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 bg-card-hover hover:bg-node-bg text-text-secondary rounded-lg transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Button to open settings
export function SettingsButton() {
  const { toggleSettingsOpen } = useNoteStore();
  
  return (
    <button
      onClick={toggleSettingsOpen}
      className="p-3 rounded-full bg-card-bg border border-border-light shadow-card hover:bg-card-hover transition-colors text-text-primary"
      aria-label="Open settings"
    >
      <SettingsIcon className="w-5 h-5" />
    </button>
  );
} 