import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ 
  checked, 
  onChange, 
  label, 
  disabled = false,
  className = ''
}: SwitchProps) {
  return (
    <label className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <div 
        className={`w-11 h-6 bg-gray-700 rounded-full peer relative 
          after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
          after:bg-white after:border-gray-300 after:border after:rounded-full 
          after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full 
          peer-checked:after:border-white peer-checked:bg-blue-600`}>
      </div>
      {label && <span className="ml-3 text-sm font-medium text-gray-300">{label}</span>}
    </label>
  );
}

export default Switch; 