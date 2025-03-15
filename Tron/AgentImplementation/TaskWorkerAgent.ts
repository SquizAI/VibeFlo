import { WorkerAgent, AgentConfig, AgentType, Message, MessageType, Response, ErrorResponse } from './BaseAgent';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for a task to be executed by the TaskWorkerAgent
 */
export interface Task {
  id: string;
  type: string;
  parameters: Record<string, any>;
  status: TaskStatus;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  progress?: number;
  priority?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Enum for the various task statuses
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Configuration for the TaskWorkerAgent
 */
export interface TaskWorkerAgentConfig extends AgentConfig {
  supportedTaskTypes: string[];
  maxConcurrentTasks?: number;
  taskTimeout?: number; // in milliseconds
}

/**
 * Worker agent responsible for executing various tasks
 */
export class TaskWorkerAgent extends WorkerAgent {
  private tasks: Map<string, Task> = new Map();
  private supportedTaskTypes: string[];
  private maxConcurrentTasks: number;
  private taskTimeout: number;
  private runningTasks: number = 0;
  private taskHandlers: Map<string, (task: Task) => Promise<any>> = new Map();

  /**
   * Creates a new TaskWorkerAgent
   * @param config Configuration for the TaskWorkerAgent
   */
  constructor(config: TaskWorkerAgentConfig) {
    super({
      ...config,
      type: AgentType.WORKER
    });

    this.supportedTaskTypes = config.supportedTaskTypes;
    this.maxConcurrentTasks = config.maxConcurrentTasks || 5;
    this.taskTimeout = config.taskTimeout || 300000; // Default 5 minutes
  }

  /**
   * Initializes the TaskWorkerAgent
   */
  async initialize(): Promise<void> {
    try {
      await super.initialize();
      this.registerMessageHandlers();
      this.registerDefaultTaskHandlers();
      this.logger.info(`TaskWorkerAgent initialized with supported task types: ${this.supportedTaskTypes.join(', ')}`);
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to initialize TaskWorkerAgent: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Register message handlers for task-related commands
   */
  private registerMessageHandlers(): void {
    this.registerMessageHandler('task.execute', this.handleExecuteTask.bind(this));
    this.registerMessageHandler('task.getStatus', this.handleGetTaskStatus.bind(this));
    this.registerMessageHandler('task.cancel', this.handleCancelTask.bind(this));
    this.registerMessageHandler('task.list', this.handleListTasks.bind(this));
  }

  /**
   * Register default task handlers
   */
  private registerDefaultTaskHandlers(): void {
    // Register a simple echo task handler for testing
    this.registerTaskHandler('echo', async (task: Task) => {
      return task.parameters;
    });
  }

  /**
   * Register a task handler for a specific task type
   * @param taskType The type of task
   * @param handler The handler function
   */
  public registerTaskHandler(taskType: string, handler: (task: Task) => Promise<any>): void {
    if (!this.supportedTaskTypes.includes(taskType)) {
      this.supportedTaskTypes.push(taskType);
    }
    this.taskHandlers.set(taskType, handler);
    this.logger.info(`Registered handler for task type: ${taskType}`);
  }

  /**
   * Handle an execute task command
   * @param message The message containing the task to execute
   * @returns Response with task status
   */
  private async handleExecuteTask(message: Message): Promise<Response> {
    try {
      const { type, parameters } = message.payload?.parameters || {};
      
      if (!type) {
        return this.createErrorResponse(message, 'Missing task type');
      }
      
      if (!this.supportedTaskTypes.includes(type)) {
        return this.createErrorResponse(message, `Unsupported task type: ${type}`);
      }
      
      if (this.runningTasks >= this.maxConcurrentTasks) {
        return this.createErrorResponse(message, 'Maximum concurrent tasks reached');
      }
      
      // Create a new task
      const task: Task = {
        id: uuidv4(),
        type,
        parameters: parameters || {},
        status: TaskStatus.PENDING,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Store the task
      this.tasks.set(task.id, task);
      
      // Execute the task asynchronously
      this.executeTask(task.id).catch(error => {
        const errorMessage = this.getErrorMessage(error);
        this.logger.error(`Error executing task ${task.id}: ${errorMessage}`);
      });
      
      return {
        correlationId: message.id,
        type: MessageType.RESPONSE,
        status: 'SUCCESS',
        sender: this.name,
        timestamp: Date.now(),
        payload: {
          result: {
            taskId: task.id,
            status: task.status
          }
        }
      };
      
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      return this.createErrorResponse(message, `Failed to execute task: ${errorMessage}`);
    }
  }

  /**
   * Execute a task by its ID
   * @param taskId The ID of the task to execute
   */
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.error(`Task ${taskId} not found`);
      return;
    }
    
    // Update task status to RUNNING
    task.status = TaskStatus.RUNNING;
    task.startTime = Date.now();
    task.updatedAt = Date.now();
    this.tasks.set(taskId, task);
    this.runningTasks++;
    
    try {
      // Get the handler for this task type
      const handler = this.taskHandlers.get(task.type);
      if (!handler) {
        throw new Error(`No handler registered for task type: ${task.type}`);
      }
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Task execution timed out after ${this.taskTimeout}ms`)), this.taskTimeout);
      });
      
      // Execute the task with timeout
      const result = await Promise.race([
        handler(task),
        timeoutPromise
      ]);
      
      // Update the task with the result
      task.status = TaskStatus.COMPLETED;
      task.result = result;
      task.endTime = Date.now();
      task.updatedAt = Date.now();
      
    } catch (error) {
      // Update the task with the error
      task.status = TaskStatus.FAILED;
      task.error = this.getErrorMessage(error);
      task.endTime = Date.now();
      task.updatedAt = Date.now();
    } finally {
      // Update the task in the map
      this.tasks.set(taskId, task);
      this.runningTasks--;
    }
  }

  /**
   * Handle a get task status command
   * @param message The message requesting task status
   * @returns Response with task status
   */
  private async handleGetTaskStatus(message: Message): Promise<Response> {
    try {
      const { taskId } = message.payload?.parameters || {};
      
      if (!taskId) {
        return this.createErrorResponse(message, 'Missing task ID');
      }
      
      const task = this.tasks.get(taskId);
      if (!task) {
        return this.createErrorResponse(message, `Task not found: ${taskId}`);
      }
      
      return {
        correlationId: message.id,
        type: MessageType.RESPONSE,
        status: 'SUCCESS',
        sender: this.name,
        timestamp: Date.now(),
        payload: {
          result: {
            task
          }
        }
      };
      
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      return this.createErrorResponse(message, `Failed to get task status: ${errorMessage}`);
    }
  }

  /**
   * Handle a cancel task command
   * @param message The message requesting task cancellation
   * @returns Response with cancel status
   */
  private async handleCancelTask(message: Message): Promise<Response> {
    try {
      const { taskId } = message.payload?.parameters || {};
      
      if (!taskId) {
        return this.createErrorResponse(message, 'Missing task ID');
      }
      
      const task = this.tasks.get(taskId);
      if (!task) {
        return this.createErrorResponse(message, `Task not found: ${taskId}`);
      }
      
      if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) {
        return this.createErrorResponse(message, `Cannot cancel task with status ${task.status}`);
      }
      
      // Update task status to CANCELLED
      task.status = TaskStatus.CANCELLED;
      task.endTime = Date.now();
      task.updatedAt = Date.now();
      this.tasks.set(taskId, task);
      
      return {
        correlationId: message.id,
        type: MessageType.RESPONSE,
        status: 'SUCCESS',
        sender: this.name,
        timestamp: Date.now(),
        payload: {
          result: {
            taskId,
            status: task.status
          }
        }
      };
      
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      return this.createErrorResponse(message, `Failed to cancel task: ${errorMessage}`);
    }
  }

  /**
   * Handle a list tasks command
   * @param message The message requesting task list
   * @returns Response with list of tasks
   */
  private async handleListTasks(message: Message): Promise<Response> {
    try {
      const { status, type } = message.payload?.parameters || {};
      
      let filteredTasks = Array.from(this.tasks.values());
      
      // Filter by status if provided
      if (status) {
        filteredTasks = filteredTasks.filter(task => task.status === status);
      }
      
      // Filter by type if provided
      if (type) {
        filteredTasks = filteredTasks.filter(task => task.type === type);
      }
      
      return {
        correlationId: message.id,
        type: MessageType.RESPONSE,
        status: 'SUCCESS',
        sender: this.name,
        timestamp: Date.now(),
        payload: {
          result: {
            tasks: filteredTasks
          }
        }
      };
      
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      return this.createErrorResponse(message, `Failed to list tasks: ${errorMessage}`);
    }
  }

  /**
   * Create an error response
   * @param message The original message
   * @param error The error message
   * @returns ErrorResponse
   */
  private createErrorResponse(message: Message, error: string): ErrorResponse {
    return {
      correlationId: message.id,
      type: MessageType.RESPONSE,
      status: 'ERROR',
      sender: this.name,
      timestamp: Date.now(),
      payload: {
        error
      }
    };
  }

  /**
   * Get error message from an unknown error object
   * @param error The error object
   * @returns The error message as a string
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  /**
   * Get statistics about tasks
   * @returns Object containing task statistics
   */
  public getTaskStats(): Record<string, any> {
    const tasks = Array.from(this.tasks.values());
    const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING).length;
    const runningTasks = tasks.filter(t => t.status === TaskStatus.RUNNING).length;
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const failedTasks = tasks.filter(t => t.status === TaskStatus.FAILED).length;
    const cancelledTasks = tasks.filter(t => t.status === TaskStatus.CANCELLED).length;
    
    const taskTypeStats: Record<string, number> = {};
    for (const task of tasks) {
      taskTypeStats[task.type] = (taskTypeStats[task.type] || 0) + 1;
    }
    
    return {
      totalTasks: tasks.length,
      pendingTasks,
      runningTasks,
      completedTasks,
      failedTasks,
      cancelledTasks,
      byType: taskTypeStats,
      maxConcurrentTasks: this.maxConcurrentTasks,
      supportedTaskTypes: this.supportedTaskTypes
    };
  }
} 