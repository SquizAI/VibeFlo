import { EventEmitter } from 'events';
import { Message, MessageType, getErrorMessage } from './BaseAgent';

/**
 * Interface for message subscription options
 */
export interface SubscriptionOptions {
  agentId?: string;          // Filter by source agent ID
  messageType?: MessageType; // Filter by message type
  command?: string;          // Filter by command (for command messages)
  event?: string;            // Filter by event (for event messages)
  query?: string;            // Filter by query (for query messages)
}

/**
 * Message handler callback type
 */
export type MessageHandler = (message: Message) => Promise<void> | void;

/**
 * Message subscription information
 */
interface Subscription {
  id: string;
  subscriberId: string;
  options: SubscriptionOptions;
  handler: MessageHandler;
}

/**
 * Message Bus for TRON agent communication
 * This implementation uses an event emitter for local communication,
 * but could be extended to support distributed messaging
 */
export class MessageBus {
  private static instance: MessageBus;
  private eventEmitter: EventEmitter;
  private subscriptions: Map<string, Subscription> = new Map();
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.eventEmitter = new EventEmitter();
    // Set a higher limit for event listeners to support many agents
    this.eventEmitter.setMaxListeners(100);
  }
  
  /**
   * Get the singleton instance of the message bus
   */
  public static getInstance(): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus();
    }
    return MessageBus.instance;
  }
  
  /**
   * Publish a message to the bus
   * @param message The message to publish
   */
  public async publish(message: Message): Promise<void> {
    try {
      // Emit the message to all subscribers
      this.eventEmitter.emit('message', message);
      
      // Also emit to specific channels for filtering
      this.eventEmitter.emit(`message:type:${message.type}`, message);
      
      if ('command' in message) {
        this.eventEmitter.emit(`message:command:${message.command}`, message);
      } else if ('event' in message) {
        this.eventEmitter.emit(`message:event:${message.event}`, message);
      } else if ('query' in message) {
        this.eventEmitter.emit(`message:query:${message.query}`, message);
      }
      
      // Emit to agent-specific channel
      this.eventEmitter.emit(`message:agent:${message.sender}`, message);
      
    } catch (error: unknown) {
      console.error(`Error publishing message: ${getErrorMessage(error)}`);
      throw error;
    }
  }
  
  /**
   * Subscribe to messages on the bus
   * @param subscriberId ID of the subscriber (typically an agent ID)
   * @param options Subscription options for filtering messages
   * @param handler The handler function to call when a message matches
   * @returns Subscription ID that can be used to unsubscribe
   */
  public subscribe(subscriberId: string, options: SubscriptionOptions, handler: MessageHandler): string {
    try {
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the subscription
      const subscription: Subscription = {
        id: subscriptionId,
        subscriberId,
        options,
        handler
      };
      
      // Store the subscription
      this.subscriptions.set(subscriptionId, subscription);
      
      // Determine which event to listen to based on options
      let eventName = 'message';
      
      if (options.messageType) {
        eventName = `message:type:${options.messageType}`;
      } else if (options.command) {
        eventName = `message:command:${options.command}`;
      } else if (options.event) {
        eventName = `message:event:${options.event}`;
      } else if (options.query) {
        eventName = `message:query:${options.query}`;
      } else if (options.agentId) {
        eventName = `message:agent:${options.agentId}`;
      }
      
      // Create a handler that filters messages based on options
      const messageHandler = async (message: Message) => {
        // Check if message matches all filters
        if (this.matchesFilters(message, options)) {
          try {
            await handler(message);
          } catch (error: unknown) {
            console.error(`Error in subscription handler: ${getErrorMessage(error)}`);
          }
        }
      };
      
      // Store the handler on the subscription for unsubscribing later
      (subscription as any).eventHandler = messageHandler;
      (subscription as any).eventName = eventName;
      
      // Subscribe to the event
      this.eventEmitter.on(eventName, messageHandler);
      
      console.log(`Subscription ${subscriptionId} created for ${subscriberId} on ${eventName}`);
      return subscriptionId;
      
    } catch (error: unknown) {
      console.error(`Error creating subscription: ${getErrorMessage(error)}`);
      throw error;
    }
  }
  
  /**
   * Unsubscribe from messages
   * @param subscriptionId The ID of the subscription to remove
   * @returns True if the subscription was found and removed
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId) as any;
    
    if (!subscription) {
      return false;
    }
    
    try {
      // Remove the event listener
      this.eventEmitter.off(subscription.eventName, subscription.eventHandler);
      
      // Remove the subscription
      this.subscriptions.delete(subscriptionId);
      
      console.log(`Subscription ${subscriptionId} removed`);
      return true;
      
    } catch (error: unknown) {
      console.error(`Error removing subscription: ${getErrorMessage(error)}`);
      return false;
    }
  }
  
  /**
   * Unsubscribe all subscriptions for a specific subscriber
   * @param subscriberId The ID of the subscriber
   * @returns The number of subscriptions removed
   */
  public unsubscribeAll(subscriberId: string): number {
    let count = 0;
    
    // Find all subscriptions for this subscriber
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.subscriberId === subscriberId) {
        if (this.unsubscribe(id)) {
          count++;
        }
      }
    }
    
    console.log(`Removed ${count} subscriptions for ${subscriberId}`);
    return count;
  }
  
  /**
   * Request-response pattern implementation
   * @param message The request message to send
   * @param timeout Timeout in milliseconds
   * @returns Promise that resolves with the response message
   */
  public async request(message: Message, timeout: number = 10000): Promise<Message> {
    return new Promise((resolve, reject) => {
      // Create a temporary subscription for the response
      const tempSubscriptionId = this.subscribe(
        'temp-requester',
        {
          messageType: MessageType.RESPONSE
        },
        (responseMessage: Message) => {
          // Check if this is the response to our request
          if ('correlationId' in responseMessage && responseMessage.correlationId === message.id) {
            // Unsubscribe as we got our response
            this.unsubscribe(tempSubscriptionId);
            
            // Clear the timeout
            clearTimeout(timeoutId);
            
            // Resolve with the response
            resolve(responseMessage);
          }
        }
      );
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        // Unsubscribe to prevent memory leaks
        this.unsubscribe(tempSubscriptionId);
        
        // Reject with a timeout error
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
      
      // Publish the request message
      this.publish(message).catch(error => {
        // Clean up on error
        clearTimeout(timeoutId);
        this.unsubscribe(tempSubscriptionId);
        
        // Reject with the error
        reject(error);
      });
    });
  }
  
  /**
   * Check if a message matches the provided filters
   * @param message The message to check
   * @param options The filter options
   * @returns True if the message matches all filters
   */
  private matchesFilters(message: Message, options: SubscriptionOptions): boolean {
    // Check agent ID filter
    if (options.agentId && message.sender !== options.agentId) {
      return false;
    }
    
    // Check message type filter
    if (options.messageType && message.type !== options.messageType) {
      return false;
    }
    
    // Check command filter
    if (options.command && (!('command' in message) || message.command !== options.command)) {
      return false;
    }
    
    // Check event filter
    if (options.event && (!('event' in message) || message.event !== options.event)) {
      return false;
    }
    
    // Check query filter
    if (options.query && (!('query' in message) || message.query !== options.query)) {
      return false;
    }
    
    // All filters passed
    return true;
  }
  
  /**
   * Get statistics about the message bus
   */
  public getStats(): Record<string, any> {
    return {
      subscriptions: this.subscriptions.size,
      subscriberCount: new Set(Array.from(this.subscriptions.values()).map(s => s.subscriberId)).size,
      byMessageType: this.countSubscriptionsByType('messageType'),
      byCommand: this.countSubscriptionsByType('command'),
      byEvent: this.countSubscriptionsByType('event'),
      byQuery: this.countSubscriptionsByType('query')
    };
  }
  
  /**
   * Count subscriptions by a specific filter type
   * @param filterType The type of filter to count by
   */
  private countSubscriptionsByType(filterType: string): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const subscription of this.subscriptions.values()) {
      const filterValue = subscription.options[filterType as keyof SubscriptionOptions];
      if (filterValue) {
        counts[String(filterValue)] = (counts[String(filterValue)] || 0) + 1;
      }
    }
    
    return counts;
  }
  
  /**
   * Clear all subscriptions (primarily for testing)
   */
  public clear(): void {
    this.eventEmitter.removeAllListeners();
    this.subscriptions.clear();
    console.log('Message bus cleared');
  }
} 