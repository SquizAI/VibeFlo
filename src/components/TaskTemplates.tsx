import React, { useState, useEffect } from 'react';
import { TaskTemplate, Task } from '../types';
import { Plus, Copy, Edit, Trash, Check, X, Tag, Calendar, Clock, Star } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { migrateTask } from '../utils/taskMigrationUtil';

// Built-in templates
const builtInTemplates: TaskTemplate[] = [
  {
    id: 'template-project',
    name: 'Project Template',
    description: 'A template for managing a standard project with planning, execution, and review phases.',
    icon: 'layout',
    color: '#00b4fa',
    category: 'Project',
    isDefault: true,
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    useCount: 0,
    tasks: [
      {
        id: 'project-task-1',
        text: 'Planning Phase',
        done: false,
        priority: 'high',
        subtasks: [
          {
            id: 'project-subtask-1-1',
            text: 'Define project scope',
            done: false,
            priority: 'high',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'project-subtask-1-2',
            text: 'Create timeline',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'project-subtask-1-3',
            text: 'Allocate resources',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          }
        ],
        isExpanded: true,
        depth: 0
      },
      {
        id: 'project-task-2',
        text: 'Execution Phase',
        done: false,
        priority: 'medium',
        subtasks: [
          {
            id: 'project-subtask-2-1',
            text: 'Development task 1',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'project-subtask-2-2',
            text: 'Development task 2',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          }
        ],
        isExpanded: true,
        depth: 0
      },
      {
        id: 'project-task-3',
        text: 'Review Phase',
        done: false,
        priority: 'low',
        subtasks: [
          {
            id: 'project-subtask-3-1',
            text: 'Quality assurance',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'project-subtask-3-2',
            text: 'Project retrospective',
            done: false,
            priority: 'low',
            subtasks: [],
            isExpanded: true,
            depth: 1
          }
        ],
        isExpanded: true,
        depth: 0
      }
    ]
  },
  {
    id: 'template-meeting',
    name: 'Meeting Preparation',
    description: 'Prepare for and follow up after a meeting.',
    icon: 'users',
    color: '#7f00ff',
    category: 'Meetings',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    useCount: 0,
    tasks: [
      {
        id: 'meeting-task-1',
        text: 'Before Meeting',
        done: false,
        priority: 'high',
        subtasks: [
          {
            id: 'meeting-subtask-1-1',
            text: 'Create agenda',
            done: false,
            priority: 'high',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'meeting-subtask-1-2',
            text: 'Send invitations',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'meeting-subtask-1-3',
            text: 'Prepare materials',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          }
        ],
        isExpanded: true,
        depth: 0
      },
      {
        id: 'meeting-task-2',
        text: 'During Meeting',
        done: false,
        priority: 'medium',
        subtasks: [
          {
            id: 'meeting-subtask-2-1',
            text: 'Take notes',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'meeting-subtask-2-2',
            text: 'Record action items',
            done: false,
            priority: 'high',
            subtasks: [],
            isExpanded: true,
            depth: 1
          }
        ],
        isExpanded: true,
        depth: 0
      },
      {
        id: 'meeting-task-3',
        text: 'After Meeting',
        done: false,
        priority: 'medium',
        subtasks: [
          {
            id: 'meeting-subtask-3-1',
            text: 'Send meeting summary',
            done: false,
            priority: 'high',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'meeting-subtask-3-2',
            text: 'Follow up on action items',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          }
        ],
        isExpanded: true,
        depth: 0
      }
    ]
  },
  {
    id: 'template-daily',
    name: 'Daily Tasks',
    description: 'A template for organizing your day.',
    icon: 'sun',
    color: '#ff8c00',
    category: 'Personal',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    useCount: 0,
    tasks: [
      {
        id: 'daily-task-1',
        text: 'Morning Routine',
        done: false,
        priority: 'high',
        subtasks: [
          {
            id: 'daily-subtask-1-1',
            text: 'Review calendar',
            done: false,
            priority: 'high',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'daily-subtask-1-2',
            text: 'Check emails',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          }
        ],
        isExpanded: true,
        depth: 0
      },
      {
        id: 'daily-task-2',
        text: 'Priority Tasks',
        done: false,
        priority: 'high',
        subtasks: [
          {
            id: 'daily-subtask-2-1',
            text: 'Important task 1',
            done: false,
            priority: 'high',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'daily-subtask-2-2',
            text: 'Important task 2',
            done: false,
            priority: 'high',
            subtasks: [],
            isExpanded: true,
            depth: 1
          }
        ],
        isExpanded: true,
        depth: 0
      },
      {
        id: 'daily-task-3',
        text: 'End of Day',
        done: false,
        priority: 'medium',
        subtasks: [
          {
            id: 'daily-subtask-3-1',
            text: 'Review completed tasks',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          },
          {
            id: 'daily-subtask-3-2',
            text: 'Plan for tomorrow',
            done: false,
            priority: 'medium',
            subtasks: [],
            isExpanded: true,
            depth: 1
          }
        ],
        isExpanded: true,
        depth: 0
      }
    ]
  }
];

interface TaskTemplatesProps {
  onApplyTemplate: (tasks: Task[]) => void;
  onClose: () => void;
}

export const TaskTemplates: React.FC<TaskTemplatesProps> = ({ onApplyTemplate, onClose }) => {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate>>({
    name: '',
    description: '',
    tasks: []
  });
  
  // Load templates from localStorage or use built-in ones
  useEffect(() => {
    const savedTemplates = localStorage.getItem('taskTemplates');
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        setTemplates([...builtInTemplates, ...parsed]);
      } catch (e) {
        console.error('Failed to parse saved templates', e);
        setTemplates(builtInTemplates);
      }
    } else {
      setTemplates(builtInTemplates);
    }
  }, []);
  
  // Save templates to localStorage when they change
  useEffect(() => {
    // Only save user-created templates, not built-in ones
    const userTemplates = templates.filter(t => !t.isBuiltIn);
    if (userTemplates.length > 0) {
      localStorage.setItem('taskTemplates', JSON.stringify(userTemplates));
    }
  }, [templates]);
  
  const applyTemplate = (template: TaskTemplate) => {
    // Convert template tasks to actual tasks with IDs
    const tasks = template.tasks.map(templateTask => {
      return migrateTask({
        ...templateTask,
        id: uuidv4(),
        subtasks: templateTask.subtasks?.map(sub => ({
          ...sub,
          id: uuidv4()
        }))
      });
    });
    
    // Update use count
    if (!template.isBuiltIn) {
      setTemplates(prev => 
        prev.map(t => 
          t.id === template.id 
            ? { ...t, useCount: (t.useCount || 0) + 1, updatedAt: Date.now() } 
            : t
        )
      );
    }
    
    onApplyTemplate(tasks);
    onClose();
  };
  
  const createTemplate = () => {
    if (newTemplate.name && (newTemplate.tasks?.length || 0) > 0) {
      // Ensure each task has a valid ID
      const tasksWithIds = (newTemplate.tasks || []).map(task => {
        if (!task.id) {
          return {
            ...task,
            id: uuidv4()
          };
        }
        return task;
      }) as Task[];

      const template: TaskTemplate = {
        id: uuidv4(),
        name: newTemplate.name,
        description: newTemplate.description,
        icon: newTemplate.icon || 'list',
        color: newTemplate.color || '#00b4fa',
        category: newTemplate.category || 'Custom',
        tasks: tasksWithIds,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        useCount: 0
      };
      
      setTemplates(prev => [...prev, template]);
      setNewTemplate({
        name: '',
        description: '',
        tasks: []
      });
      setIsCreating(false);
    }
  };
  
  const updateTemplate = (templateId: string, updates: Partial<TaskTemplate>) => {
    setTemplates(prev => 
      prev.map(t => 
        t.id === templateId 
          ? { ...t, ...updates, updatedAt: Date.now() } 
          : t
      )
    );
  };
  
  const deleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
    }
  };
  
  return (
    <div className="task-templates-modal">
      <div className="task-templates-header">
        <h2>Task Templates</h2>
        <button className="close-button" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      
      <div className="task-templates-content">
        <div className="templates-sidebar">
          <div className="templates-list">
            {templates.map(template => (
              <div 
                key={template.id}
                className={`template-item ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div 
                  className="template-icon" 
                  style={{ color: template.color || '#00b4fa' }}
                >
                  {template.isDefault && <Star size={12} className="default-indicator" />}
                </div>
                <div className="template-info">
                  <div className="template-name">{template.name}</div>
                  <div className="template-meta">
                    {template.category && (
                      <span className="template-category">
                        <Tag size={12} />
                        {template.category}
                      </span>
                    )}
                    {(template.useCount !== undefined && template.useCount > 0) && (
                      <span className="template-usage">
                        Used {template.useCount} times
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            className="create-template-button"
            onClick={() => {
              setIsCreating(true);
              setSelectedTemplate(null);
            }}
          >
            <Plus size={16} />
            New Template
          </button>
        </div>
        
        <div className="template-details">
          {selectedTemplate && !isCreating && !isEditing && (
            <div className="template-view">
              <div className="template-header">
                <h3>{selectedTemplate.name}</h3>
                <div className="template-actions">
                  {!selectedTemplate.isBuiltIn && (
                    <>
                      <button 
                        className="template-action edit"
                        onClick={() => {
                          setIsEditing(true);
                          setNewTemplate(selectedTemplate);
                        }}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="template-action delete"
                        onClick={() => deleteTemplate(selectedTemplate.id)}
                      >
                        <Trash size={16} />
                      </button>
                    </>
                  )}
                  <button 
                    className="template-action copy"
                    onClick={() => {
                      setIsCreating(true);
                      setNewTemplate({
                        ...selectedTemplate,
                        name: `Copy of ${selectedTemplate.name}`,
                        isDefault: false,
                        isBuiltIn: false
                      });
                    }}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              
              {selectedTemplate.description && (
                <p className="template-description">{selectedTemplate.description}</p>
              )}
              
              <div className="template-task-preview">
                <h4>Tasks</h4>
                <ul className="task-list-preview">
                  {selectedTemplate.tasks.map((task, index) => (
                    <li key={index} className="task-preview-item">
                      <span className="task-preview-text">{task.text}</span>
                      {task.subtasks && task.subtasks.length > 0 && (
                        <span className="subtask-count">
                          +{task.subtasks.length} subtasks
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button 
                className="apply-template-button"
                onClick={() => applyTemplate(selectedTemplate)}
              >
                Use Template
              </button>
            </div>
          )}
          
          {(isCreating || isEditing) && (
            <div className="template-editor">
              <div className="template-editor-header">
                <h3>{isEditing ? 'Edit Template' : 'Create Template'}</h3>
                <button 
                  className="cancel-button"
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                    setNewTemplate({
                      name: '',
                      description: '',
                      tasks: []
                    });
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="template-form">
                <div className="form-group">
                  <label>Name</label>
                  <input 
                    type="text" 
                    value={newTemplate.name || ''}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Template name"
                  />
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea 
                    value={newTemplate.description || ''}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Template description"
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label>Category</label>
                  <input 
                    type="text" 
                    value={newTemplate.category || ''}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Category"
                  />
                </div>
                
                <div className="form-group">
                  <label>Color</label>
                  <input 
                    type="color" 
                    value={newTemplate.color || '#00b4fa'}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
                
                <div className="form-group">
                  <label>Default Template</label>
                  <input 
                    type="checkbox" 
                    checked={newTemplate.isDefault || false}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, isDefault: e.target.checked }))}
                  />
                </div>
                
                {/* Task editor would go here - would be complex, simplified version shown */}
                <div className="form-group">
                  <label>Tasks (sample)</label>
                  <div className="tasks-editor-placeholder">
                    {isCreating && !isEditing && (
                      <p className="placeholder-text">
                        In a full implementation, you would be able to add, edit and 
                        arrange tasks and subtasks here for your template.
                      </p>
                    )}
                    
                    {(newTemplate.tasks?.length || 0) > 0 && (
                      <ul className="task-list-preview">
                        {newTemplate.tasks?.map((task: any, index: number) => (
                          <li key={index} className="task-preview-item">
                            <span className="task-preview-text">{task.text}</span>
                            {task.subtasks && task.subtasks.length > 0 && (
                              <span className="subtask-count">
                                +{task.subtasks.length} subtasks
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                
                <div className="template-editor-actions">
                  <button 
                    className="cancel-button"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setNewTemplate({
                        name: '',
                        description: '',
                        tasks: []
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="save-button"
                    onClick={isEditing 
                      ? () => {
                          updateTemplate(selectedTemplate!.id, newTemplate);
                          setIsEditing(false);
                          setSelectedTemplate({...selectedTemplate!, ...newTemplate});
                        }
                      : createTemplate
                    }
                    disabled={!newTemplate.name}
                  >
                    {isEditing ? 'Update Template' : 'Create Template'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {!selectedTemplate && !isCreating && (
            <div className="no-template-selected">
              <p>Select a template from the list or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 