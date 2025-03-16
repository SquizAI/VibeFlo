import React, { useEffect, useRef, TextareaHTMLAttributes } from 'react';

interface AutosizeTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

export const AutosizeTextarea: React.FC<AutosizeTextareaProps> = ({
  minRows = 1,
  maxRows = 10,
  value,
  onChange,
  className,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adjust height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const minHeight = minRows * lineHeight;
    const maxHeight = maxRows * lineHeight;
    
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    
    textarea.style.height = `${newHeight}px`;
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className={`resize-none overflow-auto ${className || ''}`}
      {...props}
    />
  );
};

export default AutosizeTextarea;
