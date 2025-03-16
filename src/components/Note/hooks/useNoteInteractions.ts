import { useCallback, useRef, RefObject } from 'react';
import { Position } from '../../../types';

// Create a more specific type that guarantees the properties we need
interface DraggableNote {
  id: string;
  position: Position;
  [key: string]: any; // Allow other properties
}

export function useNoteInteractions(
  note: DraggableNote,
  nodeRef: RefObject<HTMLDivElement>,
  onMove?: (id: string, newPosition: Position) => void,
  setIsDragging?: (isDragging: boolean) => void
) {
  // Store initial position during drag operation
  const dragStartPos = useRef({ x: 0, y: 0 });
  const mouseStartPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  
  // Handle starting the drag operation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only proceed if it's a left mouse button click
    if (e.button !== 0) return;
    
    // Check if we're clicking on interactive elements that shouldn't trigger dragging
    const target = e.target as HTMLElement;
    const isInteractive = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.tagName === 'BUTTON' ||
                          target.classList.contains('no-drag') ||
                          target.closest('.no-drag') !== null;

    // Don't start dragging if clicking on an interactive element
    if (isInteractive) return;
    
    // Prevent default behavior and stop propagation to prevent canvas movement
    e.preventDefault();
    e.stopPropagation();
    
    // Store initial positions
    mouseStartPos.current = {
      x: e.clientX,
      y: e.clientY
    };
    
    dragStartPos.current = {
      x: note.position.x,
      y: note.position.y
    };
    
    // Set dragging state
    isDraggingRef.current = true;
    
    // Add class to body to prevent unwanted selection during drag
    document.body.classList.add('note-dragging');
    
    // Set up event listeners for tracking the drag with capture phase to ensure we get all events
    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });
    
    // Prevent any wheel events during dragging to stop canvas zoom/pan
    document.addEventListener('wheel', preventWheel, { passive: false, capture: true });
  }, [note]);
  
  // Prevent wheel events during drag
  const preventWheel = useCallback((e: WheelEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);
  
  // Handle the mouse movement during dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    // Prevent default behavior and stop propagation to prevent canvas movement
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate the new position
    const deltaX = e.clientX - mouseStartPos.current.x;
    const deltaY = e.clientY - mouseStartPos.current.y;
    
    // Update the element position directly for smooth dragging
    if (nodeRef.current) {
      nodeRef.current.style.transform = `translate(${dragStartPos.current.x + deltaX}px, ${dragStartPos.current.y + deltaY}px)`;
      // Add a high z-index during drag to keep note on top
      nodeRef.current.style.zIndex = '1000';
    }
    
    if (setIsDragging) {
      setIsDragging(true);
    }
  }, [nodeRef, setIsDragging]);
  
  // Handle the end of dragging operation
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    // Prevent default behavior and stop propagation
    e.preventDefault();
    e.stopPropagation();
    
    // Reset dragging state
    isDraggingRef.current = false;
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove, { capture: true });
    document.removeEventListener('mouseup', handleMouseUp, { capture: true });
    document.removeEventListener('wheel', preventWheel, { capture: true });
    
    // Remove the body class
    document.body.classList.remove('note-dragging');
    
    // Calculate final position
    const deltaX = e.clientX - mouseStartPos.current.x;
    const deltaY = e.clientY - mouseStartPos.current.y;
    const newPosition = {
      x: dragStartPos.current.x + deltaX,
      y: dragStartPos.current.y + deltaY
    };
    
    // Call the onMove callback with the new position
    if (onMove) {
      onMove(note.id, newPosition);
    }
    
    if (setIsDragging) {
      setIsDragging(false);
    }
    
    // Reset z-index after drag
    if (nodeRef.current) {
      nodeRef.current.style.zIndex = '';
    }
  }, [note, onMove, handleMouseMove, preventWheel, setIsDragging]);
  
  // These functions can be exposed if we want to manually trigger drag operations
  const handleDragStart = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (setIsDragging) {
      setIsDragging(true);
    }
    
    isDraggingRef.current = true;
    
    // Add class to body to indicate dragging
    document.body.classList.add('note-dragging');
  }, [setIsDragging]);
  
  const handleDragEnd = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (setIsDragging) {
      setIsDragging(false);
    }
    
    isDraggingRef.current = false;
    
    // Remove class from body
    document.body.classList.remove('note-dragging');
    
    // Reset z-index
    if (nodeRef.current) {
      nodeRef.current.style.zIndex = '';
    }
  }, [setIsDragging, nodeRef]);
  
  return {
    handleMouseDown,
    handleDragStart,
    handleDragEnd
  };
}

export default useNoteInteractions; 