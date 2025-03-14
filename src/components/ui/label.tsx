import React from 'react';

interface LabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function Label({ htmlFor, children, className = '' }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium text-gray-200 ${className}`}
    >
      {children}
    </label>
  );
}

export default Label; 