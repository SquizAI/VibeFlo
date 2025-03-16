import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Search, Edit, FileText, Layout, Brain, Zap, Globe, Image, MessageSquare, BarChart } from 'lucide-react';
import '../styles/agentSidebar.css';

// Define the types of agent capabilities
interface AgentCapability {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'search' | 'creation' | 'analysis' | 'organization';
  status: 'available' | 'busy' | 'disabled';
  examples: string[];
}

interface AgentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentSidebar: React.FC<AgentSidebarProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sample agent capabilities
  const capabilities: AgentCapability[] = [
    {
      id: 'web-search',
      name: 'Web Search',
      description: 'Search the web for real-time information on any topic',
      icon: <Globe size={20} />,
      category: 'search',
      status: 'available',
      examples: [
        'Find recent news about AI advancements',
        'Research climate change statistics',
        'Look up information about React hooks'
      ]
    },
    {
      id: 'content-generator',
      name: 'Content Generator',
      description: 'Generate text content based on your requirements',
      icon: <Edit size={20} />,
      category: 'creation',
      status: 'available',
      examples: [
        'Write a product description',
        'Create a meeting agenda',
        'Draft an email response'
      ]
    },
    {
      id: 'task-analyzer',
      name: 'Task Analyzer',
      description: 'Analyze and organize tasks, suggest priorities',
      icon: <Layout size={20} />,
      category: 'organization',
      status: 'available',
      examples: [
        'Sort my tasks by priority',
        'Group similar tasks together',
        'Suggest deadlines based on task descriptions'
      ]
    },
    {
      id: 'data-visualizer',
      name: 'Data Visualizer',
      description: 'Create visual representations of your data',
      icon: <BarChart size={20} />,
      category: 'analysis',
      status: 'available',
      examples: [
        'Create a chart from my task completion rates',
        'Visualize my note-taking patterns',
        'Show a timeline of my project'
      ]
    },
    {
      id: 'image-generator',
      name: 'Image Generator',
      description: 'Generate images based on text descriptions',
      icon: <Image size={20} />,
      category: 'creation',
      status: 'available',
      examples: [
        'Create an icon for my project',
        'Generate a background image with a cyberpunk theme',
        'Design a logo concept'
      ]
    },
    {
      id: 'conversation-assistant',
      name: 'Conversation Assistant',
      description: 'Have a conversation to brainstorm or solve problems',
      icon: <MessageSquare size={20} />,
      category: 'analysis',
      status: 'available',
      examples: [
        'Help me brainstorm project ideas',
        'Discuss the pros and cons of this approach',
        'Talk through this problem with me'
      ]
    }
  ];

  const categories = [
    { id: 'all', name: 'All Tools', icon: <Zap size={18} /> },
    { id: 'search', name: 'Search', icon: <Search size={18} /> },
    { id: 'creation', name: 'Creation', icon: <Edit size={18} /> },
    { id: 'organization', name: 'Organization', icon: <Layout size={18} /> },
    { id: 'analysis', name: 'Analysis', icon: <Brain size={18} /> }
  ];

  // Filter capabilities based on active category and search
  const filteredCapabilities = capabilities.filter(cap => {
    const matchesCategory = activeCategory === 'all' || cap.category === activeCategory;
    const matchesSearch = cap.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         cap.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCapabilityClick = (capabilityId: string) => {
    // In a real implementation, this would activate the capability
    console.log(`Activated capability: ${capabilityId}`);
  };

  return (
    <div className={`agent-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="agent-sidebar-header">
        <h2>Agent Capabilities</h2>
        <button className="agent-sidebar-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      
      <div className="agent-sidebar-search">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search capabilities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="agent-sidebar-categories">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-button ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.icon}
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      <div className="agent-capabilities-list">
        {filteredCapabilities.map(capability => (
          <div 
            key={capability.id} 
            className={`capability-card ${capability.status}`}
            onClick={() => handleCapabilityClick(capability.id)}
          >
            <div className="capability-header">
              <div className="capability-icon">{capability.icon}</div>
              <div className="capability-title">
                <h3>{capability.name}</h3>
                <span className={`capability-status ${capability.status}`}>
                  {capability.status}
                </span>
              </div>
            </div>
            <p className="capability-description">{capability.description}</p>
            <div className="capability-examples">
              <h4>Examples:</h4>
              <ul>
                {capability.examples.map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Collapsed toggle button that appears when sidebar is closed */}
      {!isOpen && (
        <button className="agent-sidebar-toggle" onClick={() => onClose()}>
          <ChevronRight size={20} />
          <span>Agent</span>
        </button>
      )}
    </div>
  );
};

export default AgentSidebar; 