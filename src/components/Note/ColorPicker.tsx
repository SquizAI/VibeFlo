import React, { useEffect, useRef, useState } from 'react';
import { ColorPickerProps } from './types';
import { ChevronRight, Palette, Sliders } from 'lucide-react';

// Define color options with an expanded set of colors
const colorOptions = [
  { id: 'blue', name: 'Blue', value: 'blue' },
  { id: 'green', name: 'Green', value: 'green' },
  { id: 'pink', name: 'Pink', value: 'pink' },
  { id: 'yellow', name: 'Yellow', value: 'yellow' },
  { id: 'purple', name: 'Purple', value: 'purple' },
  { id: 'orange', name: 'Orange', value: 'orange' },
  { id: 'teal', name: 'Teal', value: 'teal' },
  { id: 'red', name: 'Red', value: 'red' },
  { id: 'indigo', name: 'Indigo', value: 'indigo' },
  { id: 'amber', name: 'Amber', value: 'amber' },
  { id: 'emerald', name: 'Emerald', value: 'emerald' },
  { id: 'rose', name: 'Rose', value: 'rose' },
  { id: 'sky', name: 'Sky', value: 'sky' },
  { id: 'lime', name: 'Lime', value: 'lime' },
  { id: 'fuchsia', name: 'Fuchsia', value: 'fuchsia' },
  { id: 'cyan', name: 'Cyan', value: 'cyan' },
  { id: 'slate', name: 'Slate', value: 'slate' },
  { id: 'gray', name: 'Gray', value: 'gray' }
];

// Define category to color map for smart suggestions
const categoryColorMap: Record<string, string> = {
  'work': 'blue',
  'personal': 'green',
  'health': 'pink',
  'finance': 'yellow',
  'learning': 'purple',
  'travel': 'sky',
  'projects': 'lime',
  'ideas': 'fuchsia',
  'meeting': 'cyan',
  'general': 'slate',
  'important': 'red',
  'urgent': 'rose',
  'meal': 'amber',
  'fitness': 'emerald'
};

const ColorPicker: React.FC<ColorPickerProps> = ({ currentColor, onColorSelect, onClose }) => {
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#3B82F6'); // Default blue
  const [customColorName, setCustomColorName] = useState('');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  
  useEffect(() => {
    // Add event listener for clicks outside the color picker
    const handleOutsideClick = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    
    // Load recent colors from localStorage
    try {
      const savedColors = localStorage.getItem('recentColors');
      if (savedColors) {
        setRecentColors(JSON.parse(savedColors));
      }
    } catch (error) {
      console.error('Error loading recent colors:', error);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onClose]);
  
  // Initialize custom color from current if it's a hex value
  useEffect(() => {
    if (currentColor && currentColor.startsWith('#')) {
      setCustomColor(currentColor);
    }
  }, [currentColor]);
  
  // Prevent click inside from closing
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Handle applying custom color
  const handleApplyCustomColor = () => {
    if (customColor) {
      // Add custom color to recent colors
      const updatedRecent = [customColor, ...recentColors.filter(c => c !== customColor)].slice(0, 5);
      setRecentColors(updatedRecent);
      
      // Save to localStorage
      try {
        localStorage.setItem('recentColors', JSON.stringify(updatedRecent));
      } catch (error) {
        console.error('Error saving recent colors:', error);
      }
      
      onColorSelect(customColor);
    }
  };

  // Handle selecting a preset color
  const handleSelectColor = (color: string) => {
    // Add to recent colors if it's not already there
    if (!recentColors.includes(color) && !color.startsWith('#')) {
      const updatedRecent = [color, ...recentColors].slice(0, 5);
      setRecentColors(updatedRecent);
      
      // Save to localStorage
      try {
        localStorage.setItem('recentColors', JSON.stringify(updatedRecent));
      } catch (error) {
        console.error('Error saving recent colors:', error);
      }
    }
    
    onColorSelect(color);
  };

  return (
    <div 
      ref={colorPickerRef}
      className="fixed z-50 bg-card-bg border border-border-light rounded-lg shadow-lg overflow-hidden"
      style={{
        top: '30px',
        right: '0',
        transform: 'translateX(-20px)',
        width: showCustomPicker ? '280px' : '240px',
      }}
      onClick={handleContainerClick}
    >
      <div className="p-2 border-b border-border-light">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Palette size={14} />
          Color Selection
        </h3>
      </div>

      {!showCustomPicker ? (
        <>
          {/* Standard color grid */}
          <div className="grid grid-cols-4 gap-2 p-3">
            {colorOptions.map(color => (
              <div
                key={color.id}
                className="relative group"
              >
                <button
                  className={`p-1 rounded-md w-full flex flex-col items-center ${
                    currentColor === color.value ? 'ring-2 ring-white/40' : 'hover:bg-white/10'
                  }`}
                  onClick={() => handleSelectColor(color.value)}
                  aria-label={`Select ${color.name} color`}
                >
                  <div 
                    className={`w-6 h-6 rounded-md mb-1 ${getColorClass(color.value)}`}
                  ></div>
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {color.name}
                </div>
              </div>
            ))}
          </div>
          
          {/* Recent colors */}
          {recentColors.length > 0 && (
            <div className="px-3 pb-2">
              <h4 className="text-xs text-text-secondary mb-2">Recent Colors</h4>
              <div className="flex gap-2">
                {recentColors.map((color, index) => (
                  <button
                    key={`recent-${index}`}
                    className={`w-6 h-6 rounded-md ${
                      color.startsWith('#') ? '' : getColorClass(color)
                    } hover:ring-1 hover:ring-white/40 ${
                      currentColor === color ? 'ring-2 ring-white/40' : ''
                    }`}
                    style={color.startsWith('#') ? { backgroundColor: color } : {}}
                    onClick={() => handleSelectColor(color)}
                    aria-label={`Select recent color`}
                  />
                ))}
              </div>
            </div>
          )}
          
          <div className="p-2 border-t border-border-light flex justify-center">
            <button 
              onClick={() => setShowCustomPicker(true)}
              className="text-xs text-accent-blue flex items-center gap-1 hover:underline py-1"
            >
              Custom Color <ChevronRight size={12} />
            </button>
          </div>
        </>
      ) : (
        <div className="p-3">
          <div className="flex flex-col gap-3 mb-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Select Custom Color</label>
              <input 
                type="color" 
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-full h-8 rounded border border-border-light cursor-pointer"
              />
            </div>
            
            <div>
              <label className="text-xs text-text-secondary block mb-1">Hex Value</label>
              <input 
                type="text" 
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-full p-1 bg-card-bg/80 border border-border-light rounded text-sm"
                placeholder="#RRGGBB"
              />
            </div>
            
            <div>
              <label className="text-xs text-text-secondary block mb-1">Name (Optional)</label>
              <input 
                type="text" 
                value={customColorName}
                onChange={(e) => setCustomColorName(e.target.value)}
                className="w-full p-1 bg-card-bg/80 border border-border-light rounded text-sm"
                placeholder="Custom color name"
              />
            </div>
            
            <div className="mt-2">
              <p className="text-xs text-text-secondary">Preview:</p>
              <div 
                className="w-full h-10 rounded mt-1 border border-border-light"
                style={{ backgroundColor: customColor }}
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-between">
            <button 
              onClick={() => setShowCustomPicker(false)}
              className="px-3 py-1 text-xs bg-card-hover hover:bg-card-hover/80 rounded"
            >
              Back
            </button>
            <button 
              onClick={handleApplyCustomColor}
              className="px-3 py-1 text-xs bg-accent-blue hover:bg-accent-blue/80 rounded"
            >
              Apply Color
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get the appropriate color class
function getColorClass(color: string): string {
  const colorClasses: Record<string, string> = {
    'blue': 'bg-blue-500',
    'green': 'bg-green-500',
    'pink': 'bg-pink-500',
    'yellow': 'bg-yellow-500',
    'purple': 'bg-purple-500',
    'orange': 'bg-orange-500',
    'teal': 'bg-teal-500',
    'red': 'bg-red-500',
    'indigo': 'bg-indigo-500',
    'amber': 'bg-amber-500',
    'emerald': 'bg-emerald-500',
    'rose': 'bg-rose-500',
    'sky': 'bg-sky-500',
    'lime': 'bg-lime-500',
    'fuchsia': 'bg-fuchsia-500',
    'cyan': 'bg-cyan-500',
    'slate': 'bg-slate-500',
    'gray': 'bg-gray-500'
  };
  
  return colorClasses[color] || 'bg-blue-500';
}

export default ColorPicker; 