import React, { useRef, useEffect } from 'react';
import { NoteContentProps } from './types';

// Function to extract title and content
const extractTitleAndContent = (fullContent: string) => {
  if (!fullContent) return { title: '', content: '' };
  
  const lines = fullContent.split('\n');
  let title = lines[0];
  
  // Clean up markdown formatting for title
  if (title.startsWith('# ')) {
    title = title.substring(2);
  }
  
  const content = lines.length > 1 ? lines.slice(1).join('\n') : '';
  
  return { title, content };
};

// Simple markdown-like link formatting
const formatContentWithLinks = (content: string): React.ReactNode => {
  if (!content) return null;
  
  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  // Split content by links and create array of text and link elements
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    
    // Add the link
    const [fullMatch, text, url] = match;
    parts.push(
      <a 
        key={match.index} 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-400 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {text}
      </a>
    );
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add any remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  
  return parts.length ? parts : content;
};

const NoteContent: React.FC<NoteContentProps> = ({
  content,
  isEditing,
  setIsEditing,
  onChange
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-focus the textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);
  
  // Handle click on the content area to start editing
  const handleContentClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };
  
  // Handle blur to save content and exit editing mode
  const handleBlur = () => {
    setIsEditing(false);
  };
  
  // Handle content changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Extract title and content
  const { title, content: mainContent } = extractTitleAndContent(content);

  // Format content with links for display
  const formattedContent = formatContentWithLinks(mainContent);

  return (
    <div className="flex flex-col">
      {/* Title section */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="w-full h-full min-h-[80px] bg-transparent outline-none resize-none p-3"
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Write something..."
        />
      ) : (
        <div onClick={handleContentClick} className="cursor-text">
          {/* Title section */}
          {title && (
            <div className="px-3 py-2 border-b border-border-light">
              <h3 className="font-medium text-base">{title}</h3>
            </div>
          )}
          
          {/* Main content section */}
          <div className="p-3 min-h-[60px] break-words whitespace-pre-wrap">
            {formattedContent || 
             (!title ? <span className="text-text-secondary">Click to add content</span> : null)}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteContent; 