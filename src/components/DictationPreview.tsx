import React from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import '../styles/dictationPreview.css';

interface DictationNote {
  id: string;
  type: string;
  color: string;
  content?: string;
  title?: string;
  tasks?: any[];
  position: { x: number; y: number };
}

interface DictationPreviewProps {
  isVisible: boolean;
  notes: DictationNote[];
  onApprove: () => void;
  onCancel: () => void;
}

const DictationPreview: React.FC<DictationPreviewProps> = ({
  isVisible,
  notes,
  onApprove,
  onCancel
}) => {
  const [showAiReasoning, setShowAiReasoning] = React.useState(false);

  if (!isVisible) return null;

  return (
    <div className="dictation-preview-panel">
      <div className="dictation-preview-header">
        <h3>Dictation Results</h3>
        <div className="dictation-preview-actions">
          <button 
            className="dictation-preview-action approve" 
            onClick={onApprove}
          >
            Add to Canvas
          </button>
          <button 
            className="dictation-preview-action cancel" 
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="dictation-preview-content">
        <div className="dictation-results-summary">
          AI has organized your dictation into {notes.length} notes. Review the categorization below or use brainstorming to refine.
        </div>

        {notes.map((note, index) => (
          <div className="dictation-preview-note" key={index}>
            <div className={`dictation-preview-note-color ${note.color}`}></div>
            <div className="dictation-preview-note-content">
              {note.type === 'tasks' && (
                <div className="dictation-preview-note-meta">
                  <div className="dictation-preview-category">
                    <span className="category-label">{note.title}</span>
                  </div>
                  <div className="dictation-preview-task-count">
                    {note.tasks?.length || 0} tasks
                  </div>
                </div>
              )}
              
              <div className="dictation-preview-note-text">
                {note.type === 'tasks' ? (
                  <>
                    <div className="dictation-preview-tasks">
                      <ul className="dictation-preview-tasks-list">
                        {note.tasks?.slice(0, 3).map((task: any, idx: number) => (
                          <li className="dictation-preview-task-item" key={idx}>
                            <div className="dictation-preview-task-bullet"></div>
                            <div>{task.text}</div>
                          </li>
                        ))}
                        {(note.tasks?.length || 0) > 3 && (
                          <div className="dictation-preview-task-more">
                            +{(note.tasks?.length || 0) - 3} more tasks
                          </div>
                        )}
                      </ul>
                    </div>
                  </>
                ) : (
                  note.content
                )}
              </div>
              
              <button 
                className="dictation-preview-brainstorm-button"
                onClick={() => {/* Add brainstorm functionality */}}
              >
                <Sparkles size={16} />
                Brainstorm Ideas
              </button>
            </div>
          </div>
        ))}
        
        {notes.length > 0 && (
          <div className="dictation-preview-ai-reasoning">
            <button 
              className="dictation-preview-ai-reasoning-toggle"
              onClick={() => setShowAiReasoning(!showAiReasoning)}
            >
              {showAiReasoning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showAiReasoning ? "Hide AI Processing Logic" : "Show AI Processing Logic"}
            </button>
            
            {showAiReasoning && (
              <div className="dictation-preview-ai-reasoning-content">
                The audio transcription was analyzed and categorized based on content patterns. 
                Text that appeared to be lists or action items were converted to task lists, 
                while descriptive text was preserved as notes. Categories were assigned based on 
                topic clustering and semantic analysis of key terms. Task priority was 
                determined by urgency indicators in the language.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DictationPreview; 