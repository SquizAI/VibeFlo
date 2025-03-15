import { BaseAgent, AgentConfig, AgentType, MessageType, Message, ResponseMessage, getErrorMessage } from './BaseAgent';

// Domain agent specific configuration
export interface DomainAgentConfig extends AgentConfig {
  masterAgentId?: string;
  masterAgentEndpoint?: string;
  domain: string;
}

/**
 * Base Domain Agent class that all domain-specific agents extend
 */
export abstract class DomainAgent extends BaseAgent {
  protected domain: string;
  protected masterAgentId: string | undefined;
  protected masterAgentEndpoint: string | undefined;
  
  constructor(config: DomainAgentConfig) {
    super({
      ...config,
      type: AgentType.DOMAIN
    });
    
    this.domain = config.domain;
    this.masterAgentId = config.masterAgentId;
    this.masterAgentEndpoint = config.masterAgentEndpoint;
    
    // Add domain info to the agent's state
    this.state.domain = this.domain;
    
    // Register common message handlers
    this.registerMessageHandler(MessageType.COMMAND, 'domain.getStatus', this.handleGetStatus.bind(this) as (message: Message) => Promise<ResponseMessage>);
  }
  
  /**
   * Initialize the domain agent
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    console.log(`DomainAgent(${this.domain}) initialized: ${this.getName()} (${this.getId()})`);
  }
  
  /**
   * Start the domain agent and register with master agent if configured
   */
  public async start(): Promise<void> {
    await super.start();
    
    // Register with master agent if configured
    if (this.masterAgentId && this.masterAgentEndpoint) {
      await this.registerWithMasterAgent();
    }
    
    console.log(`DomainAgent(${this.domain}) started: ${this.getName()} (${this.getId()})`);
  }
  
  /**
   * Stop the domain agent and unregister from master
   */
  public async stop(): Promise<void> {
    if (this.masterAgentId && this.masterAgentEndpoint) {
      await this.unregisterFromMasterAgent();
    }
    
    await super.stop();
    console.log(`DomainAgent(${this.domain}) stopped: ${this.getName()} (${this.getId()})`);
  }
  
  /**
   * Register the domain agent with the master agent
   */
  protected async registerWithMasterAgent(): Promise<void> {
    try {
      console.log(`Registering domain agent with master agent: ${this.masterAgentId}`);
      // In a real implementation, this would send a message to the master agent
      // For now, we'll just log it
    } catch (error: unknown) {
      console.error(`Failed to register with master agent: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Unregister the domain agent from the master agent
   */
  protected async unregisterFromMasterAgent(): Promise<void> {
    try {
      console.log(`Unregistering domain agent from master agent: ${this.masterAgentId}`);
      // In a real implementation, this would send a message to the master agent
    } catch (error: unknown) {
      console.error(`Failed to unregister from master agent: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Get the domain this agent belongs to
   */
  public getDomain(): string {
    return this.domain;
  }
  
  /**
   * Handle get status command
   */
  protected async handleGetStatus(message: Message): Promise<ResponseMessage> {
    try {
      const status = {
        id: this.getId(),
        name: this.getName(),
        domain: this.domain,
        status: this.getStatus(),
        uptime: this.getUptime(),
        lastActiveTime: this.lastActiveTime,
        capabilities: this.getCapabilities(),
      };
      
      return this.createSuccessResponse(message, status);
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to get domain agent status: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Check if this domain agent handles the specified domain
   */
  public handlesDomain(domain: string): boolean {
    return this.domain === domain;
  }
} 