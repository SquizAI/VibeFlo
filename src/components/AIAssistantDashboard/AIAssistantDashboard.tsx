import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, BrainCircuit, X, Settings, History, Code, Zap, MessageSquare, Mic, ListTodo, ShoppingCart, FileText } from 'lucide-react';
import AICapabilityCard from './AICapabilityCard';
import AIStatusIndicator from './AIStatusIndicator';
import AIHistoryList from './AIHistoryList';
import AICommandBar from './AICommandBar';

// Define the types for our AI capabilities
interface AICapability {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

// Define the props for the AI Assistant Dashboard
interface AIAssistantDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIAssistantDashboard: React.FC<AIAssistantDashboardProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'recent' | 'settings'>('tools');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Add logging to verify the component is being rendered and props are received
  useEffect(() => {
    console.log('AI Dashboard mounted, isOpen:', isOpen);
  }, [isOpen]);

  // Define the AI capabilities available in the application
  const aiCapabilities: AICapability[] = [
    {
      id: 'dictation',
      name: 'Voice Dictation',
      description: 'Transcribe your speech into text notes',
      icon: <Mic size={24} />,
      shortcut: '⌘+D',
      action: () => console.log('Dictation activated')
    },
    {
      id: 'task-extraction',
      name: 'Smart Task Extraction',
      description: 'Automatically extract tasks from your notes',
      icon: <ListTodo size={24} />,
      shortcut: '⌘+T',
      action: () => console.log('Task extraction activated')
    },
    {
      id: 'recipe-processor',
      name: 'Recipe Processor',
      description: 'Extract ingredients and steps from recipes',
      icon: <FileText size={24} />,
      action: () => console.log('Recipe processor activated')
    },
    {
      id: 'grocery',
      name: 'Grocery List Manager',
      description: 'Organize and categorize grocery items',
      icon: <ShoppingCart size={24} />,
      action: () => console.log('Grocery list manager activated')
    },
    {
      id: 'chat',
      name: 'AI Assistant Chat',
      description: 'Ask questions about your notes and tasks',
      icon: <MessageSquare size={24} />,
      action: () => console.log('AI chat activated')
    },
  ];

  // Handle click outside to close the dashboard
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dashboardRef.current && !dashboardRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle the dashboard with Cmd+/ or Ctrl+/
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        if (!isOpen) {
          // If dashboard is closed, open it
          onClose(); // This is actually toggling in the parent component
        }
      }
      
      // Close with Escape key
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dashboardRef}
      className={`fixed top-14 right-0 bottom-0 bg-gray-900 border-l border-gray-800 flex flex-col shadow-xl transition-all duration-300 ease-in-out z-[1000] ${
        isOpen ? 'w-[360px]' : 'w-0 opacity-0'
      }`}
    >
      {isOpen && (
        <>
          <div className="flex items-center justify-between border-b border-gray-800 p-3">
            <div className="flex items-center text-white">
              <BrainCircuit size={18} className="mr-2 text-blue-500" />
              <h2 className="font-medium">AI Assistant</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800"
              aria-label="Close AI Assistant panel"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-3 border-b border-gray-800">
            <div className="flex space-x-3 text-sm">
              <button
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'tools'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setActiveTab('tools')}
              >
                Tools
              </button>
              <button
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'recent'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setActiveTab('recent')}
              >
                Recent
              </button>
              <button
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'tools' && (
              <div className="space-y-4">
                {/* Voice Dictation Callout */}
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 shadow-inner">
                  <div className="flex items-start">
                    <div className="bg-blue-500/20 p-2 rounded-md mr-3">
                      <Mic size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-400">Voice Dictation</h3>
                      <p className="text-sm text-white/70 mt-1">
                        Use the floating microphone button (bottom left) to record voice notes. 
                        Press <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">⌘+D</kbd> to start/stop recording.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Original AI capabilities list */}
                <h3 className="text-white/70 text-sm font-medium mb-2">AI CAPABILITIES</h3>
                <div className="grid grid-cols-1 gap-3">
                  {aiCapabilities.map(capability => (
                    <AICapabilityCard 
                      key={capability.id}
                      name={capability.name}
                      description={capability.description}
                      icon={capability.icon}
                      shortcut={capability.shortcut}
                      onClick={capability.action}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'recent' && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Recent Activity</h3>
                <AIHistoryList />
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">AI Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Enable AI Features</h4>
                      <p className="text-xs text-gray-400">Turn all AI capabilities on or off</p>
                    </div>
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input 
                        type="checkbox" 
                        id="toggle-ai" 
                        className="sr-only"
                        defaultChecked={true}
                      />
                      <label 
                        htmlFor="toggle-ai"
                        className="block h-6 overflow-hidden bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer"
                      >
                        <span className="block h-6 w-6 rounded-full bg-white transform transition-transform duration-200 ease-in-out translate-x-0" />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Real-time Feedback</h4>
                      <p className="text-xs text-gray-400">Show AI processing status</p>
                    </div>
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input 
                        type="checkbox" 
                        id="toggle-feedback" 
                        className="sr-only"
                        defaultChecked={true}
                      />
                      <label 
                        htmlFor="toggle-feedback"
                        className="block h-6 overflow-hidden bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer"
                      >
                        <span className="block h-6 w-6 rounded-full bg-white transform transition-transform duration-200 ease-in-out translate-x-0" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with info */}
          <div className="border-t border-[#333] p-2 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <span>AI Status: {isProcessing ? 'Processing...' : 'Ready'}</span>
              <button className="text-blue-400 hover:underline">Help</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistantDashboard; 