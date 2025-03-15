import { BaseAgent, AgentConfig, AgentType, MessageType, CommandMessage, Message, ResponseMessage, AgentStatus, getErrorMessage } from './BaseAgent';
import { AgentRegistry, AgentInfo } from './AgentRegistry';

// Master agent specific configuration
export interface MasterAgentConfig extends AgentConfig {
  heartbeatInterval?: number;
  inactiveAgentTimeout?: number;
}

// System status information
export interface SystemStatus {
  agents: {
    total: number;
    byType: Record<string, number>;
    active: number;
  };
  system: {
    uptime: number;
    startTime: number;
    resources: any; // Would be more detailed in a complete implementation
  };
}

/**
 * MasterAgent is the top-level agent that manages the entire TRON system
 */
export class MasterAgent extends BaseAgent {
  private agentRegistry: AgentRegistry;
  private heartbeatInterval: number;
  private inactiveAgentTimeout: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  
  constructor(config: MasterAgentConfig) {
    super({
      ...config,
      type: AgentType.MASTER
    });
    
    this.agentRegistry = AgentRegistry.getInstance();
    this.heartbeatInterval = config.heartbeatInterval || 30000; // Default: 30 seconds
    this.inactiveAgentTimeout = config.inactiveAgentTimeout || 90000; // Default: 90 seconds
    
    // Register message handlers
    this.registerMessageHandler(MessageType.COMMAND, 'master.registerAgent', this.handleRegisterAgent.bind(this) as (message: Message) => Promise<ResponseMessage>);
    this.registerMessageHandler(MessageType.COMMAND, 'master.unregisterAgent', this.handleUnregisterAgent.bind(this) as (message: Message) => Promise<ResponseMessage>);
    this.registerMessageHandler(MessageType.COMMAND, 'master.getSystemStatus', this.handleGetSystemStatus.bind(this) as (message: Message) => Promise<ResponseMessage>);
    this.registerMessageHandler(MessageType.COMMAND, 'master.findAgents', this.handleFindAgents.bind(this) as (message: Message) => Promise<ResponseMessage>);
    this.registerMessageHandler(MessageType.COMMAND, 'master.heartbeat', this.handleHeartbeat.bind(this) as (message: Message) => Promise<ResponseMessage>);
  }
  
  /**
   * Initialize the master agent and register in the registry
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    // Register ourselves in the registry
    this.agentRegistry.registerAgent({
      id: this.getId(),
      name: this.getName(),
      type: this.getType(),
      status: this.getStatus(),
      capabilities: this.getCapabilities()
    });
    
    console.log(`MasterAgent initialized: ${this.getName()} (${this.getId()})`);
  }
  
  /**
   * Start the master agent and heartbeat monitoring
   */
  public async start(): Promise<void> {
    await super.start();
    
    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
    
    // Update our status in the registry
    this.agentRegistry.updateAgentStatus(this.getId(), this.getStatus());
    
    console.log(`MasterAgent started: ${this.getName()} (${this.getId()})`);
  }
  
  /**
   * Stop the master agent and heartbeat monitoring
   */
  public async stop(): Promise<void> {
    // Stop heartbeat monitoring
    this.stopHeartbeatMonitoring();
    
    await super.stop();
    
    // Update our status in the registry
    this.agentRegistry.updateAgentStatus(this.getId(), this.getStatus());
    
    console.log(`MasterAgent stopped: ${this.getName()} (${this.getId()})`);
  }
  
  /**
   * Handle register agent command
   */
  private async handleRegisterAgent(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const agentInfo: AgentInfo = message.payload.parameters.agentInfo;
      
      if (!agentInfo || !agentInfo.id || !agentInfo.type) {
        return this.createErrorResponse(message, 'Invalid agent info provided');
      }
      
      // Register the agent
      this.agentRegistry.registerAgent(agentInfo);
      
      console.log(`Agent registered via command: ${agentInfo.name} (${agentInfo.id})`);
      
      return this.createSuccessResponse(message, { 
        registered: true,
        agentId: agentInfo.id 
      });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to register agent: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Handle unregister agent command
   */
  private async handleUnregisterAgent(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const agentId = message.payload.parameters.agentId;
      
      if (!agentId) {
        return this.createErrorResponse(message, 'Agent ID is required');
      }
      
      // Unregister the agent
      const result = this.agentRegistry.unregisterAgent(agentId);
      
      if (!result) {
        return this.createErrorResponse(message, `Agent not found: ${agentId}`);
      }
      
      console.log(`Agent unregistered via command: ${agentId}`);
      
      return this.createSuccessResponse(message, { unregistered: true });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to unregister agent: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Handle get system status command
   */
  private async handleGetSystemStatus(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const status = this.getSystemStatus();
      return this.createSuccessResponse(message, status);
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to get system status: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Handle find agents command
   */
  private async handleFindAgents(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const { type, capabilities } = message.payload.parameters;
      
      let agents: AgentInfo[] = [];
      
      if (type) {
        // Find by type
        agents = this.agentRegistry.getAgentsByType(type);
      } else if (capabilities && Array.isArray(capabilities)) {
        // Find by capabilities
        agents = this.agentRegistry.findAgentsWithCapabilities(capabilities);
      } else {
        // Get all agents
        agents = this.agentRegistry.getAllAgents();
      }
      
      return this.createSuccessResponse(message, { agents });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to find agents: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Handle heartbeat command
   */
  private async handleHeartbeat(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const agentId = message.payload.parameters.agentId;
      
      if (!agentId) {
        return this.createErrorResponse(message, 'Agent ID is required');
      }
      
      // Record the heartbeat
      const result = this.agentRegistry.recordHeartbeat(agentId);
      
      if (!result) {
        return this.createErrorResponse(message, `Agent not found: ${agentId}`);
      }
      
      return this.createSuccessResponse(message, { acknowledged: true });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to process heartbeat: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Get the current system status
   */
  public getSystemStatus(): SystemStatus {
    const agents = this.agentRegistry.getAllAgents();
    
    return {
      agents: {
        total: agents.length,
        byType: this.agentRegistry.getAgentCountByType(),
        active: agents.filter(a => a.status === AgentStatus.ACTIVE).length
      },
      system: {
        uptime: this.getUptime(),
        startTime: this.startTime,
        resources: this.getSystemResourceUsage()
      }
    };
  }
  
  /**
   * Start monitoring agent heartbeats
   */
  private startHeartbeatMonitoring(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      this.checkForInactiveAgents();
    }, this.heartbeatInterval);
    
    console.log(`Heartbeat monitoring started (interval: ${this.heartbeatInterval}ms)`);
  }
  
  /**
   * Stop monitoring agent heartbeats
   */
  private stopHeartbeatMonitoring(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('Heartbeat monitoring stopped');
    }
  }
  
  /**
   * Check for inactive agents and mark them as terminated
   */
  private checkForInactiveAgents(): void {
    const inactiveAgents = this.agentRegistry.findInactiveAgents(this.inactiveAgentTimeout);
    
    if (inactiveAgents.length > 0) {
      console.log(`Found ${inactiveAgents.length} inactive agents`);
      
      for (const agent of inactiveAgents) {
        console.log(`Marking agent as terminated due to inactivity: ${agent.name} (${agent.id})`);
        this.agentRegistry.updateAgentStatus(agent.id, AgentStatus.TERMINATED);
      }
    }
  }
  
  /**
   * Get system resource usage
   * In a real implementation, this would gather actual system metrics
   */
  private getSystemResourceUsage(): any {
    return {
      cpu: {
        usage: 0.25, // 25% CPU usage (example value)
      },
      memory: {
        total: 8 * 1024 * 1024 * 1024, // 8GB total (example)
        used: 2 * 1024 * 1024 * 1024,  // 2GB used (example)
      },
      network: {
        bytesReceived: 1024 * 1024,    // 1MB received (example)
        bytesSent: 512 * 1024,         // 512KB sent (example)
      }
    };
  }
} 