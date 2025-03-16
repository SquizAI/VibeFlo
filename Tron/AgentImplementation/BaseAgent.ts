import { v4 as uuidv4 } from 'uuid';
import { MessageBus } from './MessageBus';

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
  useBus?: boolean; // Whether to use the message bus for communication
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

// Success response (for easier typing)
export interface SuccessResponse extends ResponseMessage {
  status: 'SUCCESS';
  payload: {
    result: any;
    metadata?: Record<string, any>;
  };
}

// Error response (for easier typing)
export interface ErrorResponse extends ResponseMessage {
  status: 'ERROR';
  payload: {
    error: {
      code: string;
      message: string;
      details?: any;
    };
    metadata?: Record<string, any>;
  };
}

// Response type for handlers
export type Response = ResponseMessage | void;

// Helper function to safely get error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Message handler function type
export type MessageHandler = (message: Message) => Promise<Response>;

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

// Logger interface
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// Default Console Logger Implementation
export class ConsoleLogger implements Logger {
  private prefix: string;
  
  constructor(prefix: string) {
    this.prefix = prefix;
  }
  
  debug(message: string, ...args: any[]): void {
    console.debug(`[${this.prefix}] ${message}`, ...args);
  }
  
  info(message: string, ...args: any[]): void {
    console.info(`[${this.prefix}] ${message}`, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.prefix}] ${message}`, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    console.error(`[${this.prefix}] ${message}`, ...args);
  }
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
  protected useBus: boolean = false;
  protected subscriptions: string[] = [];
  protected logger: Logger;
  
  constructor(config: AgentConfig) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.type = config.type;
    this.config = config.configuration || {};
    this.useBus = config.useBus || false;
    this.logger = new ConsoleLogger(`${this.type}:${this.name}`);
    
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
  protected registerMessageHandler(command: string, handler: MessageHandler): void {
    const key = command;
    this.messageHandlers.set(key, handler);
    
    // If using bus, subscribe to the specific command
    if (this.useBus) {
      const messageBus = MessageBus.getInstance();
      const subscriptionId = messageBus.subscribe(
        this.id,
        { command },
        async (message: Message) => {
          const response = await this.handleMessage(message);
          
          // If there's a response, publish it back to the bus
          if (response) {
            await messageBus.publish(response);
          }
        }
      );
      this.subscriptions.push(subscriptionId);
    }
  }
  
  /**
   * Handle an incoming message
   */
  public async handleMessage(message: Message): Promise<Response> {
    try {
      this.lastActiveTime = Date.now();
      
      let handlerKey: string;
      
      switch (message.type) {
        case MessageType.COMMAND:
          const cmdMsg = message as CommandMessage;
          handlerKey = cmdMsg.command;
          break;
        case MessageType.EVENT:
          const eventMsg = message as EventMessage;
          handlerKey = eventMsg.event;
          break;
        case MessageType.QUERY:
          const queryMsg = message as QueryMessage;
          handlerKey = queryMsg.query;
          break;
        default:
          throw new Error(`Unsupported message type: ${message.type}`);
      }
      
      const handler = this.messageHandlers.get(handlerKey);
      if (!handler) {
        return this.createErrorResponse(message, `No handler registered for ${handlerKey}`);
      }
      
      return await handler(message);
    } catch (error: unknown) {
      return this.createErrorResponse(message, getErrorMessage(error));
    }
  }
  
  /**
   * Send a message to another agent
   * If using the bus, this will publish the message to the bus
   * Otherwise, it will directly call the target agent's handleMessage method
   */
  public async sendMessage(message: Message, targetAgent?: BaseAgent): Promise<Response> {
    try {
      if (this.useBus) {
        const messageBus = MessageBus.getInstance();
        
        // For messages that expect a response, use the request-response pattern
        if (message.type === MessageType.COMMAND || message.type === MessageType.QUERY) {
          return await messageBus.request(message) as ResponseMessage;
        } else {
          // For events, just publish
          await messageBus.publish(message);
          return;
        }
      } else if (targetAgent) {
        // Direct call if not using bus
        return await targetAgent.handleMessage(message);
      } else {
        throw new Error('Target agent required when not using message bus');
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to send message: ${getErrorMessage(error)}`);
      throw error;
    }
  }
  
  /**
   * Create a success response message
   */
  protected createSuccessResponse(message: Message, result: any): SuccessResponse {
    return {
      id: uuidv4(),
      type: MessageType.RESPONSE,
      sender: this.id,
      timestamp: Date.now(),
      correlationId: message.id,
      status: 'SUCCESS',
      payload: {
        result
      }
    };
  }
  
  /**
   * Create an error response message
   */
  protected createErrorResponse(message: Message, errorMessage: string, code: string = 'AGENT_ERROR', details?: any): ErrorResponse {
    return {
      id: uuidv4(),
      type: MessageType.RESPONSE,
      sender: this.id,
      timestamp: Date.now(),
      correlationId: message.id,
      status: 'ERROR',
      payload: {
        error: {
          code,
          message: errorMessage,
          details
        }
      }
    };
  }
  
  /**
   * Create a command message
   */
  protected createCommandMessage(command: string, parameters: Record<string, any>): CommandMessage {
    return {
      id: uuidv4(),
      type: MessageType.COMMAND,
      command,
      sender: this.id,
      timestamp: Date.now(),
      payload: {
        parameters
      }
    };
  }
  
  /**
   * Create an event message
   */
  protected createEventMessage(event: string, data: any): EventMessage {
    return {
      id: uuidv4(),
      type: MessageType.EVENT,
      event,
      sender: this.id,
      timestamp: Date.now(),
      payload: {
        data
      }
    };
  }
  
  /**
   * Create a query message
   */
  protected createQueryMessage(query: string, parameters: Record<string, any>): QueryMessage {
    return {
      id: uuidv4(),
      type: MessageType.QUERY,
      query,
      sender: this.id,
      timestamp: Date.now(),
      payload: {
        parameters
      }
    };
  }
  
  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    this.status = AgentStatus.INITIALIZING;
    // This would be where we would initialize components
    this.logger.info(`Initialized with ID: ${this.id}`);
  }
  
  /**
   * Start the agent
   */
  public async start(): Promise<void> {
    this.status = AgentStatus.ACTIVE;
    this.startTime = Date.now();
    this.lastActiveTime = this.startTime;
    this.logger.info(`Started`);
    
    // Publish agent started event if using bus
    if (this.useBus) {
      const startedEvent = this.createEventMessage('agent.started', {
        agentId: this.id,
        agentType: this.type,
        agentName: this.name
      });
      
      const messageBus = MessageBus.getInstance();
      await messageBus.publish(startedEvent);
    }
  }
  
  /**
   * Pause the agent
   */
  public async pause(): Promise<void> {
    this.status = AgentStatus.PAUSED;
    this.logger.info(`Paused`);
    
    // Publish agent paused event if using bus
    if (this.useBus) {
      const pausedEvent = this.createEventMessage('agent.paused', {
        agentId: this.id
      });
      
      const messageBus = MessageBus.getInstance();
      await messageBus.publish(pausedEvent);
    }
  }
  
  /**
   * Resume the agent
   */
  public async resume(): Promise<void> {
    this.status = AgentStatus.ACTIVE;
    this.logger.info(`Resumed`);
    
    // Publish agent resumed event if using bus
    if (this.useBus) {
      const resumedEvent = this.createEventMessage('agent.resumed', {
        agentId: this.id
      });
      
      const messageBus = MessageBus.getInstance();
      await messageBus.publish(resumedEvent);
    }
  }
  
  /**
   * Stop the agent
   */
  public async stop(): Promise<void> {
    this.status = AgentStatus.STOPPING;
    
    // Unsubscribe from all message bus subscriptions
    if (this.useBus) {
      const messageBus = MessageBus.getInstance();
      messageBus.unsubscribeAll(this.id);
      this.subscriptions = [];
      
      // Publish agent stopping event
      const stoppingEvent = this.createEventMessage('agent.stopping', {
        agentId: this.id
      });
      await messageBus.publish(stoppingEvent);
    }
    
    // This would be where we would clean up resources
    this.status = AgentStatus.TERMINATED;
    this.logger.info(`Stopped`);
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