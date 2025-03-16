import React from 'react';
import { Loader, AlertCircle, CheckCircle, Info } from 'lucide-react';
import '../styles/agentFeedback.css';

export type AgentActivityType = 
  | 'thinking' | 'searching' | 'processing' | 'analyzing' 
  | 'complete' | 'error' | 'info' | 'idle' | 'listening' 
  | 'generating' | 'success' | 'waiting' | 'warning';

interface AgentFeedbackProps {
  isVisible: boolean;
  activity: AgentActivityType;
  message: string;
  progress?: number; // 0-100
  confidence?: number; // 0-100
  onClose?: () => void;
}

export const AgentFeedback: React.FC<AgentFeedbackProps> = ({
  isVisible,
  activity,
  message,
  progress = 0,
  confidence = 0,
  onClose
}) => {
  if (!isVisible) return null;
  
  const getActivityIcon = () => {
    switch (activity) {
      case 'thinking':
        return <div className="activity-icon thinking"><div className="pulse-ring"></div></div>;
      case 'searching':
        return <div className="activity-icon searching"><div className="search-animation"></div></div>;
      case 'processing':
        return <div className="activity-icon processing"><Loader className="spin" size={24} /></div>;
      case 'analyzing':
        return <div className="activity-icon analyzing"><div className="analyze-grid"></div></div>;
      case 'complete':
        return <div className="activity-icon complete"><CheckCircle size={24} /></div>;
      case 'error':
        return <div className="activity-icon error"><AlertCircle size={24} /></div>;
      case 'info':
        return <div className="activity-icon info"><Info size={24} /></div>;
      case 'idle':
        return <div className="activity-icon idle"><div className="pulse-ring slow"></div></div>;
      case 'listening':
        return <div className="activity-icon listening"><div className="audio-wave"></div></div>;
      case 'generating':
        return <div className="activity-icon generating"><Loader className="spin fast" size={24} /></div>;
      case 'success':
        return <div className="activity-icon success"><CheckCircle size={24} /></div>;
      case 'waiting':
        return <div className="activity-icon waiting"><div className="dot-pulse"></div></div>;
      case 'warning':
        return <div className="activity-icon warning"><AlertCircle size={24} /></div>;
      default:
        return <div className="activity-icon"><Loader className="spin" size={24} /></div>;
    }
  };
  
  const getActivityClass = () => {
    return `agent-feedback activity-${activity}`;
  };
  
  return (
    <div className={getActivityClass()}>
      <div className="agent-feedback-content">
        <div className="agent-feedback-header">
          {getActivityIcon()}
          <h3>{getActivityTitle(activity)}</h3>
          {onClose && (
            <button className="agent-feedback-close" onClick={onClose}>×</button>
          )}
        </div>
        
        <div className="agent-feedback-message">
          {message}
        </div>
        
        {(activity === 'thinking' || activity === 'processing' || activity === 'searching' || activity === 'analyzing' || 
          activity === 'generating' || activity === 'listening' || activity === 'waiting') && (
          <div className="agent-feedback-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="progress-text">{progress}% complete</div>
          </div>
        )}
        
        {(activity === 'complete' || activity === 'success') && confidence > 0 && (
          <div className="agent-feedback-confidence">
            <div className="confidence-label">Confidence</div>
            <div className="confidence-bar">
              <div 
                className="confidence-fill" 
                style={{ width: `${confidence}%` }}
              ></div>
            </div>
            <div className="confidence-value">{confidence}%</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get a title based on activity type
function getActivityTitle(activity: AgentActivityType): string {
  switch (activity) {
    case 'thinking':
      return 'Agent is thinking...';
    case 'searching':
      return 'Searching web...';
    case 'processing':
      return 'Processing data...';
    case 'analyzing':
      return 'Analyzing content...';
    case 'complete':
      return 'Task complete!';
    case 'error':
      return 'Error occurred';
    case 'info':
      return 'Information';
    case 'idle':
      return 'Ready to assist';
    case 'listening':
      return 'Listening...';
    case 'generating':
      return 'Generating content...';
    case 'success':
      return 'Success!';
    case 'waiting':
      return 'Waiting for input...';
    case 'warning':
      return 'Warning';
    default:
      return 'Working...';
  }
}

export default AgentFeedback; 