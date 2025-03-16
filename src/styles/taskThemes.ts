export interface TaskTheme {
  container: string;
  task: string;
  taskContent: string;
  taskHeader: string;
  checkbox: string;
  checkboxComplete: string;
  expandButton: string;
  taskText: string;
  completedTaskText: string;
  taskInput: string;
  priority: Record<string, string>;
  metaContainer: string;
  dueDate: string;
  pastDue: string;
  progress: string;
  progressBar: string;
  actionsMenu: string;
  dragHandle: string;
}

export const defaultTaskTheme: TaskTheme = {
  container: 'flex flex-col gap-2 w-full',
  task: 'flex flex-col rounded-md border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800 hover:shadow-sm transition-shadow duration-200',
  taskContent: 'flex flex-col w-full',
  taskHeader: 'flex items-center gap-2 w-full',
  checkbox: 'w-4 h-4 border border-gray-300 dark:border-gray-600 rounded transition-colors duration-200 hover:border-blue-500 cursor-pointer',
  checkboxComplete: 'w-4 h-4 border border-green-500 dark:border-green-400 bg-green-500 dark:bg-green-400 rounded flex items-center justify-center text-white',
  expandButton: 'w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors duration-200',
  taskText: 'flex-1 text-sm text-gray-800 dark:text-gray-200 py-0.5 px-1',
  completedTaskText: 'flex-1 text-sm text-gray-400 dark:text-gray-500 line-through py-0.5 px-1',
  taskInput: 'flex-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 text-sm',
  priority: {
    high: 'text-red-500 dark:text-red-400',
    medium: 'text-yellow-500 dark:text-yellow-400',
    low: 'text-blue-500 dark:text-blue-400'
  },
  metaContainer: 'flex flex-wrap gap-2 mt-1 ml-6 text-xs',
  dueDate: 'flex items-center gap-1 text-gray-600 dark:text-gray-400',
  pastDue: 'text-red-500 dark:text-red-400',
  progress: 'w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1',
  progressBar: 'h-full bg-green-500 dark:bg-green-400 transition-all duration-300',
  actionsMenu: 'absolute right-2 top-2 bg-white dark:bg-gray-800 shadow-md rounded p-1 border border-gray-200 dark:border-gray-700 z-10',
  dragHandle: 'cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
};

export const compactTaskTheme: TaskTheme = {
  ...defaultTaskTheme,
  task: 'flex flex-row items-center rounded-md border border-gray-200 dark:border-gray-700 py-1 px-2 bg-white dark:bg-gray-800 hover:shadow-sm transition-shadow duration-200',
  taskContent: 'flex items-center w-full',
  metaContainer: 'flex items-center ml-auto gap-2 text-xs',
};

export const kanbanTaskTheme: TaskTheme = {
  ...defaultTaskTheme,
  task: 'flex flex-col rounded-md border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow duration-200 mb-2',
  taskHeader: 'flex items-center gap-2 w-full mb-1',
  metaContainer: 'flex flex-wrap gap-2 mt-2 text-xs',
  dragHandle: 'absolute top-2 right-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
};

export const getTaskTheme = (theme: 'default' | 'compact' | 'kanban' = 'default'): TaskTheme => {
  switch (theme) {
    case 'compact':
      return compactTaskTheme;
    case 'kanban':
      return kanbanTaskTheme;
    default:
      return defaultTaskTheme;
  }
}; 