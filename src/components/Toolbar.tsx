import React from 'react';
import '../styles/toolbar.css';
import { 
  Save, 
  Mic, 
  Grid, 
  Settings, 
  FileText, 
  Plus, 
  Info,
  List,
  Command
} from 'lucide-react';

interface ToolbarProps {
  onToggleGrid: () => void;
  onToggleSettings: () => void;
  onToggleRecording: () => void;
  onCreateNote: () => void;
  onExport: () => void;
  onSave: () => void;
  onToggleAbout: () => void;
  onToggleCommandPalette: () => void;
  isRecording: boolean;
  showGrid: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onToggleGrid,
  onToggleSettings,
  onToggleRecording,
  onCreateNote,
  onExport,
  onSave,
  onToggleAbout,
  onToggleCommandPalette,
  isRecording,
  showGrid
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button 
          className="toolbar-button new-note" 
          onClick={onCreateNote}
          title="Create New Note"
        >
          <Plus size={18} />
          <span>New Note</span>
        </button>
      </div>

      <div className="toolbar-center">
        <button 
          className={`toolbar-button ${showGrid ? 'active' : ''}`} 
          onClick={onToggleGrid}
          title={showGrid ? "Hide Grid" : "Show Grid"}
        >
          <Grid size={18} />
        </button>

        <button 
          className={`toolbar-button recording-button ${isRecording ? 'recording' : ''}`} 
          onClick={onToggleRecording}
          title={isRecording ? "Stop Recording" : "Start Voice Dictation"}
        >
          <Mic size={18} />
          {isRecording && (
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>Recording...</span>
            </div>
          )}
        </button>

        <button 
          className="toolbar-button" 
          onClick={onExport}
          title="Export Canvas"
        >
          <FileText size={18} />
        </button>

        <button 
          className="toolbar-button" 
          onClick={onSave}
          title="Save Canvas"
        >
          <Save size={18} />
        </button>
      </div>

      <div className="toolbar-right">
        <button 
          className="toolbar-button" 
          onClick={onToggleCommandPalette}
          title="Command Palette"
        >
          <Command size={18} />
        </button>
        
        <button 
          className="toolbar-button" 
          onClick={onToggleAbout}
          title="About"
        >
          <Info size={18} />
        </button>
        
        <button 
          className="toolbar-button" 
          onClick={onToggleSettings}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar; 