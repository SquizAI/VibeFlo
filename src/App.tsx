import React, { useState } from 'react';
import { Canvas } from './components/Canvas';
import NoteView from './components/NoteView';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './styles.css';

function App() {
  const [viewMode, setViewMode] = useState<'canvas' | 'notes'>('canvas');

  const switchToCanvas = () => setViewMode('canvas');
  const switchToNotes = () => setViewMode('notes');

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-app-bg text-text-primary">
        {viewMode === 'canvas' ? (
          <Canvas onSwitchToNotes={switchToNotes} />
        ) : (
          <NoteView onSwitchToCanvas={switchToCanvas} />
        )}
      </div>
    </DndProvider>
  );
}

export default App;
