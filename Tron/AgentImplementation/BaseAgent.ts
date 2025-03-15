import { v4 as uuidv4 } from 'uuid';

// Enum for agent types
export enum AgentType {
  MASTER = 'MASTER',
  DOMAIN = 'DOMAIN',
  WORKER = 'WORKER',
}

// Enum for agent lifecycle states
export enum AgentStatus {
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  STOPPING = 'STOPPING',
  TERMINATED = 'TERMINATED',
  ERROR = 'ERROR',
}

// Enum for message types
export enum MessageType {
  COMMAND = 'COMMAND',
  EVENT = 'EVENT',
  QUERY = 'QUERY',
  RESPONSE = 'RESPONSE',
}

// Agent configuration
export interface AgentConfig {
  id?: string;
  name: string;
  type: AgentType;
  capabilities?: string[];
  configuration?: Record<string, any>;
}

// Agent capability
export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  version: string;
  metadata?: Record<string, any>;
}

// Base message interface
export interface Message {
  id: string;
  type: MessageType;
  sender: string;
  timestamp: number;
  payload: any;
}

// Command message
export interface CommandMessage extends Message {
  type: MessageType.COMMAND;
  command: string;
  payload: {
    parameters: Record<string, any>;
    metadata?: Record<string, any>;
  };
}

// Event message
export interface EventMessage extends Message {
  type: MessageType.EVENT;
  event: string;
  payload: {
    data: any;
    metadata?: Record<string, any>;
  };
}

// Query message
export interface QueryMessage extends Message {
  type: MessageType.QUERY;
  query: string;
  payload: {
    parameters: Record<string, any>;
    metadata?: Record<string, any>;
  };
}

// Response message
export interface ResponseMessage extends Message {
  type: MessageType.RESPONSE;
  correlationId: string;
  status: 'SUCCESS' | 'ERROR';
  payload: {
    result?: any;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
    metadata?: Record<string, any>;
  };
}

// Helper function to safely get error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Message handler function type
export type MessageHandler = (message: Message) => Promise<ResponseMessage | void>;

// State manager interface
export interface StateManager {
  getState(): Record<string, any>;
  setState(state: Record<string, any>): void;
  getStateValue<T>(key: string): T | undefined;
  setStateValue<T>(key: string, value: T): void;
  saveState(): Promise<void>;
  loadState(): Promise<void>;
  resetState(): Promise<void>;
}

// Component registry for modular agent components
export interface ComponentRegistry {
  registerComponent(name: string, component: any): void;
  getComponent<T>(name: string): T;
  hasComponent(name: string): boolean;
}

/**
 * Abstract base agent class that all agent types extend
 */
export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected type: AgentType;
  protected status: AgentStatus = AgentStatus.INITIALIZING;
  protected capabilities: Set<string> = new Set();
  protected messageHandlers: Map<string, MessageHandler> = new Map();
  protected components: Map<string, any> = new Map();
  protected state: Record<string, any> = {};
  protected config: Record<string, any> = {};
  protected startTime: number = 0;
  protected lastActiveTime: number = 0;
  
  constructor(config: AgentConfig) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.type = config.type;
    this.config = config.configuration || {};
    
    if (config.capabilities) {
      config.capabilities.forEach(cap => this.capabilities.add(cap));
    }
    
    // Initialize core components
    this.registerCoreComponents();
  }
  
  /**
   * Initialize the agent's core components
   */
  protected registerCoreComponents(): void {
    // This would be where we register message handler, lifecycle manager, etc.
    // For now we'll keep it simple
  }
  
  /**
   * Register a component with the agent
   */
  protected registerComponent(name: string, component: any): void {
    this.components.set(name, component);
  }
  
  /**
   * Get a component by name
   */
  protected getComponent<T>(name: string): T {
    const component = this.components.get(name);
    if (!component) {
      throw new Error(`Component '${name}' not found`);
    }
    return component as T;
  }
  
  /**
   * Register a message handler
   */
  protected registerMessageHandler(messageType: MessageType, command: string, handler: MessageHandler): void {
    const key = `${messageType}:${command}`;
    this.messageHandlers.set(key, handler);
  }
  
  /**
   * Handle an incoming message
   */
  public async handleMessage(message: Message): Promise<ResponseMessage | void> {
    this.lastActiveTime = Date.now();
    
    let handlerKey: string;
    
    switch (message.type) {
      case MessageType.COMMAND:
        const cmdMsg = message as CommandMessage;
        handlerKey = `${MessageType.COMMAND}:${cmdMsg.command}`;
        break;
      case MessageType.EVENT:
        const eventMsg = message as EventMessage;
        handlerKey = `${MessageType.EVENT}:${eventMsg.event}`;
        break;
      case MessageType.QUERY:
        const queryMsg = message as QueryMessage;
        handlerKey = `${MessageType.QUERY}:${queryMsg.query}`;
        break;
      default:
        throw new Error(`Unsupported message type: ${message.type}`);
    }
    
    const handler = this.messageHandlers.get(handlerKey);
    if (!handler) {
      return this.createErrorResponse(message, `No handler registered for ${handlerKey}`);
    }
    
    try {
      return await handler(message);
    } catch (error: unknown) {
      return this.createErrorResponse(message, getErrorMessage(error));
    }
  }
  
  /**
   * Create a success response message
   */
  protected createSuccessResponse(message: Message, result: any): ResponseMessage {
    return {
      id: uuidv4(),
      type: MessageType.RESPONSE,
      sender: this.id,
      timestamp: Date.now(),
      correlationId: message.id,
      status: 'SUCCESS',
      payload: {
        result,
      }
    };
  }
  
  /**
   * Create an error response message
   */
  protected createErrorResponse(message: Message, errorMessage: string): ResponseMessage {
    return {
      id: uuidv4(),
      type: MessageType.RESPONSE,
      sender: this.id,
      timestamp: Date.now(),
      correlationId: message.id,
      status: 'ERROR',
      payload: {
        error: {
          code: 'AGENT_ERROR',
          message: errorMessage,
        }
      }
    };
  }
  
  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    this.status = AgentStatus.INITIALIZING;
    // This would be where we would initialize components
    console.log(`${this.name} (${this.type}) initialized with ID: ${this.id}`);
  }
  
  /**
   * Start the agent
   */
  public async start(): Promise<void> {
    this.status = AgentStatus.ACTIVE;
    this.startTime = Date.now();
    this.lastActiveTime = this.startTime;
    console.log(`${this.name} (${this.type}) started`);
  }
  
  /**
   * Pause the agent
   */
  public async pause(): Promise<void> {
    this.status = AgentStatus.PAUSED;
    console.log(`${this.name} (${this.type}) paused`);
  }
  
  /**
   * Resume the agent
   */
  public async resume(): Promise<void> {
    this.status = AgentStatus.ACTIVE;
    console.log(`${this.name} (${this.type}) resumed`);
  }
  
  /**
   * Stop the agent
   */
  public async stop(): Promise<void> {
    this.status = AgentStatus.STOPPING;
    // This would be where we would clean up resources
    this.status = AgentStatus.TERMINATED;
    console.log(`${this.name} (${this.type}) stopped`);
  }
  
  /**
   * Get the agent's current status
   */
  public getStatus(): AgentStatus {
    return this.status;
  }
  
  /**
   * Get the agent's ID
   */
  public getId(): string {
    return this.id;
  }
  
  /**
   * Get the agent's name
   */
  public getName(): string {
    return this.name;
  }
  
  /**
   * Get the agent's type
   */
  public getType(): AgentType {
    return this.type;
  }
  
  /**
   * Get the agent's capabilities
   */
  public getCapabilities(): string[] {
    return Array.from(this.capabilities);
  }
  
  /**
   * Check if the agent has a specific capability
   */
  public hasCapability(capability: string): boolean {
    return this.capabilities.has(capability);
  }
  
  /**
   * Add a capability to the agent
   */
  public addCapability(capability: string): void {
    this.capabilities.add(capability);
  }
  
  /**
   * Remove a capability from the agent
   */
  public removeCapability(capability: string): void {
    this.capabilities.delete(capability);
  }
  
  /**
   * Get the agent's uptime in milliseconds
   */
  public getUptime(): number {
    if (this.startTime === 0) {
      return 0;
    }
    return Date.now() - this.startTime;
  }
  
  /**
   * Get time since last activity in milliseconds
   */
  public getTimeSinceLastActivity(): number {
    if (this.lastActiveTime === 0) {
      return 0;
    }
    return Date.now() - this.lastActiveTime;
  }
} 