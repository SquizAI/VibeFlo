import React, { useState } from 'react';
import { 
  AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, AlignStartHorizontal, AlignStartVertical,
  AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween,
  AlignEndHorizontal, AlignEndVertical, Grid, 
  Rows, Columns, Box, BoxSelect, X, Wand2,
  Layers, GitBranch, Network, PanelLeft
} from 'lucide-react';

// Alignment and organization panel for note management
interface NoteAlignmentPanelProps {
  onClose: () => void;
  onAlignNotes: (type: string) => void;
  onDistributeNotes: (type: string) => void;
  onOrganizeNotes: (type: string) => void;
  selectedCount: number;
}

interface AlignmentOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  onClick: () => void;
}

const NoteAlignmentPanel: React.FC<NoteAlignmentPanelProps> = ({
  onClose,
  onAlignNotes,
  onDistributeNotes,
  onOrganizeNotes,
  selectedCount
}) => {
  const [activeTab, setActiveTab] = useState<'align' | 'organize' | 'smart'>('align');
  
  // Alignment options
  const alignmentOptions: AlignmentOption[] = [
    {
      id: 'align-left',
      name: 'Align Left',
      icon: <AlignLeft size={18} />,
      description: 'Align selected notes to the left edge',
      onClick: () => onAlignNotes('left')
    },
    {
      id: 'align-center',
      name: 'Align Center',
      icon: <AlignCenter size={18} />,
      description: 'Align selected notes to the center',
      onClick: () => onAlignNotes('center')
    },
    {
      id: 'align-right',
      name: 'Align Right',
      icon: <AlignRight size={18} />,
      description: 'Align selected notes to the right edge',
      onClick: () => onAlignNotes('right')
    },
    {
      id: 'align-top',
      name: 'Align Top',
      icon: <AlignStartVertical size={18} />,
      description: 'Align selected notes to the top edge',
      onClick: () => onAlignNotes('top')
    },
    {
      id: 'align-middle',
      name: 'Align Middle',
      icon: <AlignJustify size={18} />,
      description: 'Align selected notes to the middle',
      onClick: () => onAlignNotes('middle')
    },
    {
      id: 'align-bottom',
      name: 'Align Bottom',
      icon: <AlignEndVertical size={18} />,
      description: 'Align selected notes to the bottom edge',
      onClick: () => onAlignNotes('bottom')
    }
  ];
  
  // Distribution options
  const distributionOptions: AlignmentOption[] = [
    {
      id: 'distribute-horizontal',
      name: 'Distribute Horizontally',
      icon: <AlignHorizontalSpaceBetween size={18} />,
      description: 'Distribute selected notes horizontally with equal spacing',
      onClick: () => onDistributeNotes('horizontal')
    },
    {
      id: 'distribute-vertical',
      name: 'Distribute Vertically',
      icon: <AlignVerticalSpaceBetween size={18} />,
      description: 'Distribute selected notes vertically with equal spacing',
      onClick: () => onDistributeNotes('vertical')
    }
  ];
  
  // Organization options
  const organizationOptions: AlignmentOption[] = [
    {
      id: 'organize-grid',
      name: 'Grid Layout',
      icon: <Grid size={18} />,
      description: 'Organize notes in a grid pattern',
      onClick: () => onOrganizeNotes('grid')
    },
    {
      id: 'organize-columns',
      name: 'Column Layout',
      icon: <Columns size={18} />,
      description: 'Organize notes in vertical columns',
      onClick: () => onOrganizeNotes('columns')
    },
    {
      id: 'organize-rows',
      name: 'Row Layout',
      icon: <Rows size={18} />,
      description: 'Organize notes in horizontal rows',
      onClick: () => onOrganizeNotes('rows')
    },
    {
      id: 'organize-stack',
      name: 'Stack Layout',
      icon: <Layers size={18} />,
      description: 'Stack notes with slight offset',
      onClick: () => onOrganizeNotes('stack')
    }
  ];
  
  // Smart organization options
  const smartOptions: AlignmentOption[] = [
    {
      id: 'smart-mindmap',
      name: 'Mind Map',
      icon: <GitBranch size={18} />,
      description: 'Organize notes in a hierarchical mind map',
      onClick: () => onOrganizeNotes('mindmap')
    },
    {
      id: 'smart-categories',
      name: 'By Category',
      icon: <BoxSelect size={18} />,
      description: 'Group notes by their categories',
      onClick: () => onOrganizeNotes('categories')
    },
    {
      id: 'smart-timeline',
      name: 'Timeline',
      icon: <PanelLeft size={18} />,
      description: 'Arrange notes in chronological order',
      onClick: () => onOrganizeNotes('timeline')
    },
    {
      id: 'smart-network',
      name: 'Connection Map',
      icon: <Network size={18} />,
      description: 'Visualize connections between notes',
      onClick: () => onOrganizeNotes('network')
    }
  ];
  
  return (
    <div className="bg-card-bg border border-border-light rounded-lg shadow-lg w-80 overflow-hidden">
      {/* Header */}
      <div className="bg-card-bg border-b border-border-light p-3 flex items-center justify-between">
        <h2 className="text-base font-medium">Note Organization</h2>
        <button 
          className="p-1 rounded-full hover:bg-white/10 text-text-secondary hover:text-text-primary"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Selected notes count */}
      <div className="px-3 py-2 bg-white/5 border-b border-border-light">
        <span className="text-sm">
          {selectedCount === 0 
            ? 'No notes selected' 
            : `${selectedCount} note${selectedCount === 1 ? '' : 's'} selected`}
        </span>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-border-light">
        <button 
          className={`flex-1 py-2 text-sm ${activeTab === 'align' ? 'border-b-2 border-accent-blue text-accent-blue' : 'text-text-secondary'}`}
          onClick={() => setActiveTab('align')}
        >
          Align & Distribute
        </button>
        <button 
          className={`flex-1 py-2 text-sm ${activeTab === 'organize' ? 'border-b-2 border-accent-blue text-accent-blue' : 'text-text-secondary'}`}
          onClick={() => setActiveTab('organize')}
        >
          Organize
        </button>
        <button 
          className={`flex-1 py-2 text-sm ${activeTab === 'smart' ? 'border-b-2 border-accent-blue text-accent-blue' : 'text-text-secondary'}`}
          onClick={() => setActiveTab('smart')}
        >
          Smart Layout
        </button>
      </div>
      
      {/* Content */}
      <div className="p-3 max-h-[400px] overflow-y-auto">
        {activeTab === 'align' && (
          <div>
            {selectedCount < 2 ? (
              <div className="text-sm text-text-secondary p-4 text-center border border-dashed border-border-light rounded-md">
                Please select at least 2 notes to use alignment tools
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-xs font-medium uppercase text-text-secondary mb-2">Align Notes</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {alignmentOptions.map(option => (
                      <button
                        key={option.id}
                        className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-white/10 transition-colors text-center"
                        onClick={option.onClick}
                        title={option.description}
                      >
                        <div className="mb-1">{option.icon}</div>
                        <span className="text-xs">{option.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-medium uppercase text-text-secondary mb-2">Distribute Notes</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {distributionOptions.map(option => (
                      <button
                        key={option.id}
                        className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-white/10 transition-colors text-center"
                        onClick={option.onClick}
                        title={option.description}
                      >
                        <div className="mb-1">{option.icon}</div>
                        <span className="text-xs">{option.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {activeTab === 'organize' && (
          <div>
            {selectedCount === 0 ? (
              <div className="text-sm text-text-secondary p-4 text-center border border-dashed border-border-light rounded-md">
                Please select notes to organize
              </div>
            ) : (
              <div>
                <h3 className="text-xs font-medium uppercase text-text-secondary mb-2">Layout Options</h3>
                <div className="grid grid-cols-2 gap-3">
                  {organizationOptions.map(option => (
                    <button
                      key={option.id}
                      className="flex items-center p-3 rounded-md hover:bg-white/10 transition-colors bg-white/5 border border-border-light"
                      onClick={option.onClick}
                      title={option.description}
                    >
                      <div className="mr-2 text-accent-blue">{option.icon}</div>
                      <div className="text-left">
                        <div className="text-sm font-medium">{option.name}</div>
                        <div className="text-xs text-text-secondary">{option.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'smart' && (
          <div>
            <div className="flex items-center mb-3">
              <Wand2 size={16} className="text-accent-blue mr-2" />
              <span className="text-sm">AI-powered organization</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {smartOptions.map(option => (
                <button
                  key={option.id}
                  className="flex items-center p-3 rounded-md hover:bg-white/10 transition-colors bg-white/5 border border-border-light"
                  onClick={option.onClick}
                  title={option.description}
                >
                  <div className="mr-3 text-accent-blue">{option.icon}</div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium">{option.name}</div>
                    <div className="text-xs text-text-secondary">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteAlignmentPanel; 