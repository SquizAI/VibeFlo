import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { NoteTaskListProps, Task } from '../../types';
import TaskItem from './TaskItem';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Define drag item types
const ItemTypes = {
  TASK: 'task',
};

// DraggableTaskItem component with drag-and-drop functionality
interface DraggableTaskItemProps {
  task: Task;
  index: number;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableTaskItem: React.FC<DraggableTaskItemProps> = ({ 
  task, 
  index, 
  onUpdate, 
  onDelete,
  onMove 
}) => {
  const [, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { index },
  });

  const [, drop] = useDrop({
    accept: ItemTypes.TASK,
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        onMove(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  return (
    <div ref={(node) => drag(drop(node))} className="cursor-move">
      <TaskItem task={task} onUpdate={onUpdate} onDelete={onDelete} />
    </div>
  );
};

const NoteTaskList: React.FC<NoteTaskListProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [newTaskText, setNewTaskText] = useState('');
  
  // Handle creating a new task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newTaskText.trim()) {
      onAddTask(newTaskText.trim());
      setNewTaskText('');
    }
  };
  
  // Move task function for drag and drop
  const moveTask = (dragIndex: number, hoverIndex: number) => {
    const draggedTask = tasks[dragIndex];
    
    const updatedTasks = [...tasks];
    updatedTasks.splice(dragIndex, 1);
    updatedTasks.splice(hoverIndex, 0, draggedTask);
    
    // Update the parent component with the new order
    // This assumes your onUpdateTask can handle an array of tasks
    updatedTasks.forEach((task, i) => {
      onUpdateTask(task.id, { order: i });
    });
  };
  
  // Calculate task completion percentage
  const completedTasks = tasks.filter(task => task.done).length;
  const completionPercentage = tasks.length > 0 
    ? Math.round((completedTasks / tasks.length) * 100) 
    : 0;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="tasks-container p-3 pt-0">
        {/* Task progress bar */}
        {tasks.length > 0 && (
          <div className="task-progress mb-3">
            <div className="flex justify-between text-xs text-text-secondary mb-1 font-medium">
              <span>{completionPercentage}% Complete</span>
              <span>{completedTasks}/{tasks.length} Tasks</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-accent-blue transition-all duration-300 ease-in-out"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Task list */}
        <ul className="tasks-list space-y-2 mb-3">
          {tasks.map((task, index) => (
            <DraggableTaskItem
              key={task.id}
              task={task}
              index={index}
              onUpdate={(updates) => onUpdateTask(task.id, updates)}
              onDelete={() => onDeleteTask(task.id)}
              onMove={moveTask}
            />
          ))}
        </ul>
        
        {/* Add task form */}
        <form onSubmit={handleAddTask} className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 bg-white/5 p-2 rounded outline-none focus:ring-1 focus:ring-accent-blue text-sm"
            placeholder="Add a new task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
          />
          <button
            type="submit"
            className="bg-accent-blue p-2 rounded text-white"
            disabled={!newTaskText.trim()}
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>
    </DndProvider>
  );
};

export default NoteTaskList; 