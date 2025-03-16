import React from 'react';
import { X, Grid, Settings } from 'lucide-react';

interface CanvasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasWidth: number;
  canvasHeight: number;
  setCanvasWidth: (width: number) => void;
  setCanvasHeight: (height: number) => void;
  showCanvasBoundaries: boolean;
  setShowCanvasBoundaries: (show: boolean) => void;
}

export function CanvasSettingsModal({
  isOpen,
  onClose,
  canvasWidth,
  canvasHeight,
  setCanvasWidth,
  setCanvasHeight,
  showCanvasBoundaries,
  setShowCanvasBoundaries
}: CanvasSettingsModalProps) {
  if (!isOpen) return null;

  const handleSave = () => {
    // Apply any changes
    onClose();
  };

  // Handle width and height input changes
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1000) {
      setCanvasWidth(value);
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1000) {
      setCanvasHeight(value);
    }
  };

  // Toggle canvas boundaries
  const toggleCanvasBoundaries = () => {
    setShowCanvasBoundaries(!showCanvasBoundaries);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content canvas-settings-modal">
        <div className="modal-header">
          <h2>Canvas Settings</h2>
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Configure your canvas dimensions and display settings.
          </p>

          <div className="settings-group">
            <h3>Canvas Size</h3>
            <div className="settings-row">
              <label htmlFor="canvas-width">Width:</label>
              <input
                id="canvas-width"
                type="number"
                value={canvasWidth}
                onChange={handleWidthChange}
                min={1000}
                step={100}
              />
            </div>
            <div className="settings-row">
              <label htmlFor="canvas-height">Height:</label>
              <input
                id="canvas-height"
                type="number"
                value={canvasHeight}
                onChange={handleHeightChange}
                min={1000}
                step={100}
              />
            </div>
          </div>

          <div className="settings-group">
            <h3>Display Options</h3>
            <div className="settings-row">
              <input
                id="show-boundaries"
                type="checkbox"
                checked={showCanvasBoundaries}
                onChange={toggleCanvasBoundaries}
              />
              <label htmlFor="show-boundaries">Show canvas boundaries</label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
} 