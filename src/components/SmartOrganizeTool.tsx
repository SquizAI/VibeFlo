import React from 'react';
import { X, Grid, Folder, BrainCircuit } from 'lucide-react';

interface SmartOrganizeToolProps {
  isOpen: boolean;
  onClose: () => void;
  onOrganize: (style: string) => void;
  style: string;
  setStyle: (style: string) => void;
}

export function SmartOrganizeTool({
  isOpen,
  onClose,
  onOrganize,
  style,
  setStyle
}: SmartOrganizeToolProps) {
  if (!isOpen) return null;

  const handleOrganize = () => {
    onOrganize(style);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content smart-organize-modal">
        <div className="modal-header">
          <h2>Smart Organize</h2>
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Choose how you want to organize your notes on the canvas.
          </p>

          <div className="organize-options">
            <div 
              className={`organize-option ${style === 'by-grid' ? 'selected' : ''}`}
              onClick={() => setStyle('by-grid')}
            >
              <div className="organize-option-icon">
                <Grid size={24} />
              </div>
              <div className="organize-option-content">
                <h3>Grid Layout</h3>
                <p>Arrange notes in your existing grid cells</p>
              </div>
            </div>

            <div 
              className={`organize-option ${style === 'by-category' ? 'selected' : ''}`}
              onClick={() => setStyle('by-category')}
            >
              <div className="organize-option-icon">
                <Folder size={24} />
              </div>
              <div className="organize-option-content">
                <h3>By Category</h3>
                <p>Group notes by their main task category</p>
              </div>
            </div>

            <div 
              className={`organize-option ${style === 'by-ai' ? 'selected' : ''}`}
              onClick={() => setStyle('by-ai')}
            >
              <div className="organize-option-icon">
                <BrainCircuit size={24} />
              </div>
              <div className="organize-option-content">
                <h3>AI Analyze</h3>
                <p>Let AI analyze your notes and organize them by context</p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleOrganize}>
            Organize
          </button>
        </div>
      </div>
    </div>
  );
} 