import React, { useEffect, useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, CheckSquare, AlertTriangle, Clock, Tag, Target, Edit, Trash2, Plus, Check, X, Download, ShoppingCart, Calculator, BarChart3, MessageSquarePlus, ExternalLink, PlusCircle, ThumbsUp, Send } from 'lucide-react';
import '../styles/dictationPreview.css';

type TaskItem = {
  text: string;
  completed: boolean;
  category?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  quantity?: string;
};

type DictationNote = {
  id: string;
  type: string;
  title: string;
  content?: string;
  items?: TaskItem[];
  color?: string;
  insights?: {
    key_topics?: string[];
    timeframe?: string;
    action_required?: boolean;
    summary?: string;
    nutrition_summary?: {
      total_calories?: number;
      total_protein?: number;
      total_carbs?: number;
      total_fat?: number;
    };
  }
};

interface DictationPreviewProps {
  isVisible: boolean;
  transcript: string;
  interimTranscript: string;
  notes: DictationNote[];
  onApprove: () => void;
  onCancel: () => void;
  isRecording?: boolean;
  onApproveIndividual?: (noteId: string) => void;
  onEdit?: (noteId: string, updates: Partial<DictationNote>) => void;
  onDelete?: (noteId: string) => void;
}

const DictationPreview: React.FC<DictationPreviewProps> = ({
  isVisible,
  transcript,
  interimTranscript,
  notes,
  onApprove,
  onCancel,
  isRecording = false,
  onApproveIndividual,
  onEdit,
  onDelete,
}) => {
  const [resultsReady, setResultsReady] = useState(false);
  const [showAiReasoning, setShowAiReasoning] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editedNotes, setEditedNotes] = useState<{[key: string]: Partial<DictationNote>}>({});
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [showNutrition, setShowNutrition] = useState<{[key: string]: boolean}>({});
  const [followUpMode, setFollowUpMode] = useState<string | null>(null);
  const [followUpInput, setFollowUpInput] = useState('');
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [sortType, setSortType] = useState('type');
  
  useEffect(() => {
    console.log('🚨 DictationPreview RENDER:', { isVisible, notesCount: notes.length });
    
    if (isVisible && notes.length > 0) {
      console.log('🔥 PREVIEW NOTES AVAILABLE, SHOULD BE VISIBLE:', notes);
      
      // Force some DOM changes to ensure visibility
      const body = document.body;
      body.style.overflow = 'hidden'; // Prevent scrolling
      
      // Fix audio play error with a more robust approach
      try {
        const audioUrl = '/notification.mp3';
        
        // Check if audio file exists before attempting to play
        fetch(audioUrl, { method: 'HEAD' })
          .then(response => {
            if (response.ok) {
              const audio = new Audio(audioUrl);
              audio.volume = 0.5;
              
              // Add event listeners to track and handle errors
              audio.addEventListener('error', (e) => {
                console.log('Audio error handled gracefully:', e.type);
              });
              
              // Try to play with promise handling
              const playPromise = audio.play();
              
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    // Playback started successfully
                    console.log('Audio notification played successfully');
                  })
                  .catch(e => {
                    // Auto-play was prevented or other error
                    console.log('Audio play prevented or failed:', e);
                    // No need to show error to user
                  });
              }
            } else {
              console.log('Audio file not found, skipping notification');
            }
          })
          .catch(e => {
            console.log('Audio file check failed:', e);
          });
      } catch (e) {
        console.log('Audio creation failed, but continuing silently');
      }
      
      // Clean up when component unmounts
      return () => {
        body.style.overflow = '';
        console.log('🧹 DictationPreview cleaned up');
      };
    }

    // Select all notes by default
    setSelectedNotes(notes.map(note => note.id));
    
    // Set results ready if we have notes to show
    setResultsReady(notes.length > 0);
    
    // Initialize nutrition display state
    const nutritionState: {[key: string]: boolean} = {};
    notes.forEach(note => {
      nutritionState[note.id] = false;
    });
    setShowNutrition(nutritionState);
  }, [isVisible, notes]);

  // Handle note selection toggle
  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  // Handle editing a note's title or content
  const handleEditChange = (noteId: string, field: string, value: string) => {
    setEditedNotes(prev => ({
      ...prev,
      [noteId]: {
        ...prev[noteId],
        [field]: value
      }
    }));
  };

  // Handle saving edited note
  const saveNoteEdit = (noteId: string) => {
    if (onEdit && editedNotes[noteId]) {
      onEdit(noteId, editedNotes[noteId]);
    }
    setEditingNote(null);
  };

  // Handle approving selected notes
  const handleApproveSelected = () => {
    // If we have an individual note approval handler, we could use it here
    // Otherwise, fall back to approving all
    onApprove();
  };
  
  // Toggle nutrition info visibility
  const toggleNutrition = (noteId: string) => {
    setShowNutrition(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };
  
  // Start conversation follow-up for a note
  const startFollowUp = (noteId: string, mode: string) => {
    setActiveNote(noteId);
    setFollowUpMode(mode);
  };
  
  // Send follow-up response
  const sendFollowUp = () => {
    // In a real implementation, this would process the follow-up
    // For now, we'll just close the follow-up UI
    setFollowUpMode(null);
    setFollowUpInput('');
    setActiveNote(null);
  };
  
  // Get total nutrition for a grocery list
  const calculateTotalNutrition = (items: TaskItem[] = []) => {
    return items.reduce((totals, item) => {
      if (item.nutrition) {
        return {
          calories: (totals.calories || 0) + (item.nutrition.calories || 0),
          protein: (totals.protein || 0) + (item.nutrition.protein || 0),
          carbs: (totals.carbs || 0) + (item.nutrition.carbs || 0),
          fat: (totals.fat || 0) + (item.nutrition.fat || 0),
        };
      }
      return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };
  
  // Sort notes based on sort type
  const getSortedNotes = () => {
    return [...notes].sort((a, b) => {
      if (sortType === 'type') {
        return a.type.localeCompare(b.type);
      } else if (sortType === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  };

  if (!isVisible) {
    console.log('❌ DictationPreview not visible, returning null');
    return null;
  }

  console.log('✅ RENDERING DICTATION PREVIEW with', notes.length, 'notes');

  return (
    <div className="dictation-preview-overlay">
      <div className={`dictation-preview-panel ${isRecording ? 'recording-panel' : ''}`}>
        <div className="dictation-preview-header">
          <h3>{isRecording ? 'Voice Recording' : notes.length === 1 ? '1 Note Created' : `${notes.length} Notes Created`}</h3>
          <div className="dictation-preview-actions">
            {resultsReady && (
              <button className="dictation-preview-action approve" onClick={handleApproveSelected}>
                <Check size={14} />
                {selectedNotes.length === notes.length 
                  ? 'Add All Notes' 
                  : `Add ${selectedNotes.length} Notes`}
              </button>
            )}
            <button className="dictation-preview-action cancel" onClick={onCancel}>
              <X size={14} />
              {isRecording ? 'Stop' : 'Cancel'}
            </button>
          </div>
        </div>
        
        <div className="dictation-preview-content">
          {isRecording ? (
            <>
              <div className="recording-indicator">
                <div className="recording-pulse"></div>
                <span>Recording in progress...</span>
              </div>
              
              <div className="voice-waveform">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="waveform-bar"></div>
                ))}
              </div>

              <div className="dictation-transcript">
                {transcript ? (
                  <>
                    {transcript}
                    {interimTranscript && <span className="interim-text"> {interimTranscript}</span>}
                  </>
                ) : (
                  <span className="transcript-placeholder">
                    Speak now... your voice will be transcribed here
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              {followUpMode && activeNote && (
                <div className="follow-up-container">
                  <div className="follow-up-header">
                    <h4>
                      {followUpMode === 'enhance' && 'Enhance Your Note'}
                      {followUpMode === 'delivery' && 'Grocery Delivery Options'}
                      {followUpMode === 'nutrition' && 'Nutritional Advice'}
                    </h4>
                    <button 
                      className="follow-up-close" 
                      onClick={() => {
                        setFollowUpMode(null);
                        setActiveNote(null);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="follow-up-content">
                    {followUpMode === 'enhance' && (
                      <div className="follow-up-enhance">
                        <p>How would you like to improve this note? I can help with:</p>
                        <ul className="follow-up-options">
                          <li>Adding more details or items</li>
                          <li>Organizing items into categories</li>
                          <li>Setting priorities or due dates</li>
                          <li>Adding specific measurements or quantities</li>
                        </ul>
                      </div>
                    )}
                    
                    {followUpMode === 'delivery' && (
                      <div className="follow-up-delivery">
                        <p>I can help you order these groceries online. Select a service:</p>
                        <div className="delivery-options">
                          <button className="delivery-option">
                            <ShoppingCart size={16} />
                            Instacart
                          </button>
                          <button className="delivery-option">
                            <ShoppingCart size={16} />
                            Walmart Delivery
                          </button>
                          <button className="delivery-option">
                            <ShoppingCart size={16} />
                            Amazon Fresh
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {followUpMode === 'nutrition' && (
                      <div className="follow-up-nutrition">
                        <p>How would you like me to help with nutritional information?</p>
                        <div className="nutrition-options">
                          <button className="nutrition-option">
                            <Calculator size={16} />
                            Calculate macros for all items
                          </button>
                          <button className="nutrition-option">
                            <BarChart3 size={16} />
                            Suggest healthier alternatives
                          </button>
                          <button className="nutrition-option">
                            <ThumbsUp size={16} />
                            Rate nutritional value
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="follow-up-input-container">
                      <input
                        type="text"
                        placeholder="Tell me more about what you need..."
                        value={followUpInput}
                        onChange={(e) => setFollowUpInput(e.target.value)}
                        className="follow-up-input"
                      />
                      <button 
                        className="follow-up-send"
                        onClick={sendFollowUp}
                        disabled={!followUpInput.trim()}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {notes.length > 0 && !followUpMode && (
                <div className="dictation-notes-container">
                  <div className="dictation-notes-controls">
                    <div className="notes-selection-info">
                      <input 
                        type="checkbox" 
                        checked={selectedNotes.length === notes.length} 
                        onChange={() => {
                          if (selectedNotes.length === notes.length) {
                            setSelectedNotes([]);
                          } else {
                            setSelectedNotes(notes.map(note => note.id));
                          }
                        }}
                      /> 
                      <span>
                        {selectedNotes.length} of {notes.length} notes selected
                      </span>
                    </div>
                    <div className="notes-sort-filter">
                      <select 
                        className="notes-sort-select"
                        value={sortType}
                        onChange={(e) => setSortType(e.target.value)}
                      >
                        <option value="type">Sort by Type</option>
                        <option value="alpha">Sort by Name</option>
                      </select>
                    </div>
                  </div>

                  <div className="dictation-notes-grid">
                    {getSortedNotes().map((note) => {
                      const noteTypeIcon = 
                        note.type === 'grocery_list' ? '🛒' : 
                        note.type === 'task_list' ? '✓' : 
                        note.type === 'recipe' ? '🍽️' : '📝';
                      
                      const isEditing = editingNote === note.id;
                      const editedNote = editedNotes[note.id] || {};
                      const showNutritionInfo = showNutrition[note.id];
                      
                      // Calculate nutrition if it's a grocery list
                      const totalNutrition = note.type === 'grocery_list' && note.items
                        ? calculateTotalNutrition(note.items)
                        : null;
                      
                      return (
                        <div key={note.id} className={`dictation-preview-note ${selectedNotes.includes(note.id) ? 'selected' : ''}`}>
                          <div className="note-preview-selection">
                            <input 
                              type="checkbox" 
                              checked={selectedNotes.includes(note.id)} 
                              onChange={() => toggleNoteSelection(note.id)}
                            />
                          </div>
                          
                          <div className="note-preview-header">
                            <div className="note-title-container">
                              <span className="note-type-icon">{noteTypeIcon}</span>
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={editedNote.title || note.title} 
                                  onChange={(e) => handleEditChange(note.id, 'title', e.target.value)}
                                  className="note-edit-title"
                                />
                              ) : (
                                <span className="note-title">{note.title}</span>
                              )}
                            </div>
                            
                            <div className="note-preview-actions">
                              {isEditing ? (
                                <>
                                  <button className="note-action save" onClick={() => saveNoteEdit(note.id)}>
                                    <Check size={12} />
                                  </button>
                                  <button className="note-action cancel" onClick={() => setEditingNote(null)}>
                                    <X size={12} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    className="note-action"
                                    onClick={() => onApproveIndividual && onApproveIndividual(note.id)}
                                    title="Add note to canvas"
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <button 
                                    className="note-action"
                                    onClick={() => setEditingNote(note.id)}
                                    title="Edit note"
                                  >
                                    <Edit size={12} />
                                  </button>
                                  <button 
                                    className="note-action"
                                    onClick={() => onDelete && onDelete(note.id)}
                                    title="Delete note"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {note.content && (
                            <div className="note-preview-content">
                              {isEditing ? (
                                <textarea 
                                  value={editedNote.content !== undefined ? editedNote.content : note.content} 
                                  onChange={(e) => handleEditChange(note.id, 'content', e.target.value)}
                                  className="note-edit-content"
                                />
                              ) : (
                                <div className="note-content-preview">{note.content}</div>
                              )}
                            </div>
                          )}
                          
                          {note.items && note.items.length > 0 && (
                            <div className="dictation-preview-tasks">
                              {note.items.map((item, idx) => (
                                <div key={idx} className="dictation-preview-task-item">
                                  <div className="task-checkbox">
                                    <input type="checkbox" defaultChecked={item.completed} />
                                  </div>
                                  <div className="task-text">
                                    {item.text}
                                    {item.quantity && <span className="item-quantity">{item.quantity}</span>}
                                  </div>
                                  {item.category && (
                                    <div className="task-category">{item.category}</div>
                                  )}
                                  
                                  {/* If item has nutrition data and we're showing nutrition */}
                                  {showNutritionInfo && item.nutrition && (
                                    <div className="item-nutrition">
                                      {item.nutrition.calories && (
                                        <span className="nutrition-value">
                                          {item.nutrition.calories} cal
                                        </span>
                                      )}
                                      {item.nutrition.protein && (
                                        <span className="nutrition-value protein">
                                          {item.nutrition.protein}g protein
                                        </span>
                                      )}
                                      {item.nutrition.carbs && (
                                        <span className="nutrition-value carbs">
                                          {item.nutrition.carbs}g carbs
                                        </span>
                                      )}
                                      {item.nutrition.fat && (
                                        <span className="nutrition-value fat">
                                          {item.nutrition.fat}g fat
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {isEditing && (
                                <button className="add-task-button">
                                  <Plus size={12} /> Add Item
                                </button>
                              )}
                            </div>
                          )}
                          
                          {/* Nutrition Summary for Grocery Lists */}
                          {note.type === 'grocery_list' && totalNutrition && (
                            <div className={`nutrition-summary ${showNutritionInfo ? 'expanded' : ''}`}>
                              <button 
                                className="nutrition-toggle" 
                                onClick={() => toggleNutrition(note.id)}
                                aria-expanded={showNutritionInfo}
                              >
                                <Calculator size={14} />
                                {showNutritionInfo ? 'Hide Nutrition' : 'Show Nutrition'}
                                {showNutritionInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                              
                              {showNutritionInfo && (
                                <div className="macro-calculator">
                                  <div className="macro-title">Total Macros:</div>
                                  <div className="macro-grid">
                                    <div className="macro-item">
                                      <div className="macro-value">{totalNutrition.calories}</div>
                                      <div className="macro-label">Calories</div>
                                    </div>
                                    <div className="macro-item protein">
                                      <div className="macro-value">{totalNutrition.protein}g</div>
                                      <div className="macro-label">Protein</div>
                                    </div>
                                    <div className="macro-item carbs">
                                      <div className="macro-value">{totalNutrition.carbs}g</div>
                                      <div className="macro-label">Carbs</div>
                                    </div>
                                    <div className="macro-item fat">
                                      <div className="macro-value">{totalNutrition.fat}g</div>
                                      <div className="macro-label">Fat</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Integration buttons based on note type */}
                          <div className="note-integration-buttons">
                            {note.type === 'grocery_list' && (
                              <>
                                <button 
                                  className="integration-button"
                                  onClick={() => startFollowUp(note.id, 'delivery')}
                                >
                                  <ShoppingCart size={14} />
                                  Delivery Options
                                </button>
                                <button 
                                  className="integration-button"
                                  onClick={() => startFollowUp(note.id, 'nutrition')}
                                >
                                  <BarChart3 size={14} />
                                  Nutrition
                                </button>
                              </>
                            )}
                            {note.type === 'recipe' && (
                              <button className="integration-button">
                                <ExternalLink size={14} />
                                Find Similar Recipes
                              </button>
                            )}
                            <button 
                              className="integration-button"
                              onClick={() => startFollowUp(note.id, 'enhance')}
                            >
                              <MessageSquarePlus size={14} />
                              Enhance
                            </button>
                          </div>
                          
                          {note.insights && note.insights.key_topics && (
                            <div className="note-preview-topics">
                              {note.insights.key_topics.slice(0, 3).map((topic, i) => (
                                <span key={i} className="note-topic-tag">{topic}</span>
                              ))}
                            </div>
                          )}
                          
                          <div className="note-preview-type-badge">
                            {note.type.replace('_', ' ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {notes.length === 0 && !followUpMode && (
                <div className="dictation-insights-panel">
                  <h4>
                    <AlertTriangle size={18} />
                    Processing Your Dictation
                  </h4>
                  <div className="insights-content">
                    <div className="note-insight">
                      <div className="insight-summary">
                        Analyzing your dictation to identify the best note format and extract key information...
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {notes.some(note => note.insights) && !followUpMode && (
            <div className="dictation-insights-panel">
              <h4>
                <Sparkles size={16} /> AI-Generated Insights
                <button
                  onClick={() => setShowAiReasoning(!showAiReasoning)}
                  className="insight-toggle-button"
                >
                  {showAiReasoning ? 'Hide Analysis ' : 'Show Analysis '}
                  {showAiReasoning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </h4>
              
              {showAiReasoning && (
                <div className="insights-content">
                  {notes.filter(note => note.insights).map((note, i) => (
                    <div key={i} className="note-insight">
                      <div className="insight-summary">
                        {note.insights?.summary || `AI analyzed "${note.title}" and identified it as a ${note.type.replace('_', ' ')}.`}
                      </div>
                      
                      {note.insights?.key_topics && note.insights.key_topics.length > 0 && (
                        <div className="insight-topics">
                          <div className="insight-label">
                            <Tag size={14} /> Key topics:
                          </div>
                          <div className="topic-tags">
                            {note.insights.key_topics.map((topic: string, i: number) => (
                              <span key={i} className="topic-tag">{topic}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {note.insights?.timeframe && (
                        <div className="insight-timeframe">
                          <Clock size={14} /> Timeframe: {note.insights.timeframe}
                        </div>
                      )}
                      
                      {note.insights?.action_required && (
                        <div className="insight-action-required">
                          <AlertTriangle size={14} /> Action required
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {!followUpMode && (
            <div className="dictation-preview-actions-bottom">
              <button className="action-button secondary" onClick={onCancel}>
                <X size={14} /> Discard All
              </button>
              <button 
                className="action-button primary" 
                onClick={handleApproveSelected}
                disabled={selectedNotes.length === 0}
              >
                <Check size={14} /> 
                {selectedNotes.length === notes.length 
                  ? 'Add All Notes to Canvas' 
                  : `Add ${selectedNotes.length} Notes to Canvas`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DictationPreview; 