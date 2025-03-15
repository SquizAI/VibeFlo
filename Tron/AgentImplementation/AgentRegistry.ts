import { AgentType, getErrorMessage } from './BaseAgent';

// Interface for agent information stored in the registry
export interface AgentInfo {
  id: string;
  name: string;
  type: AgentType;
  status: string;
  capabilities: string[];
  endpoint?: string;
  metadata?: Record<string, any>;
  lastHeartbeat?: number;
}

// Registry change event listener type
export type RegistryChangeListener = (agentId: string, action: 'add' | 'update' | 'remove') => void;

/**
 * Agent Registry for tracking all agents in the system
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentInfo> = new Map();
  private changeListeners: RegistryChangeListener[] = [];
  
  // Use singleton pattern for the registry
  private constructor() {}
  
  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }
  
  /**
   * Register a new agent or update an existing one
   */
  public registerAgent(agentInfo: AgentInfo): void {
    const isNew = !this.agents.has(agentInfo.id);
    this.agents.set(agentInfo.id, {
      ...agentInfo,
      lastHeartbeat: Date.now()
    });
    
    // Notify listeners
    this.notifyChangeListeners(agentInfo.id, isNew ? 'add' : 'update');
    
    console.log(`Agent ${isNew ? 'registered' : 'updated'}: ${agentInfo.name} (${agentInfo.id})`);
  }
  
  /**
   * Unregister an agent from the registry
   */
  public unregisterAgent(agentId: string): boolean {
    if (!this.agents.has(agentId)) {
      return false;
    }
    
    const agentInfo = this.agents.get(agentId);
    this.agents.delete(agentId);
    
    // Notify listeners
    this.notifyChangeListeners(agentId, 'remove');
    
    console.log(`Agent unregistered: ${agentInfo?.name} (${agentId})`);
    return true;
  }
  
  /**
   * Update agent status
   */
  public updateAgentStatus(agentId: string, status: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }
    
    agent.status = status;
    agent.lastHeartbeat = Date.now();
    this.agents.set(agentId, agent);
    
    // Notify listeners
    this.notifyChangeListeners(agentId, 'update');
    
    return true;
  }
  
  /**
   * Record a heartbeat from an agent
   */
  public recordHeartbeat(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }
    
    agent.lastHeartbeat = Date.now();
    this.agents.set(agentId, agent);
    return true;
  }
  
  /**
   * Get an agent by ID
   */
  public getAgent(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId);
  }
  
  /**
   * Check if an agent exists in the registry
   */
  public hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }
  
  /**
   * Get all agents in the registry
   */
  public getAllAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Get agents by type
   */
  public getAgentsByType(type: AgentType): AgentInfo[] {
    return Array.from(this.agents.values()).filter(agent => agent.type === type);
  }
  
  /**
   * Get agents by capability
   */
  public getAgentsByCapability(capability: string): AgentInfo[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.capabilities && agent.capabilities.includes(capability)
    );
  }
  
  /**
   * Find agents that match all the given capabilities
   */
  public findAgentsWithCapabilities(capabilities: string[]): AgentInfo[] {
    if (!capabilities || capabilities.length === 0) {
      return [];
    }
    
    return Array.from(this.agents.values()).filter(agent => 
      capabilities.every(cap => agent.capabilities && agent.capabilities.includes(cap))
    );
  }
  
  /**
   * Add a change listener
   */
  public addChangeListener(listener: RegistryChangeListener): void {
    this.changeListeners.push(listener);
  }
  
  /**
   * Remove a change listener
   */
  public removeChangeListener(listener: RegistryChangeListener): void {
    const index = this.changeListeners.indexOf(listener);
    if (index >= 0) {
      this.changeListeners.splice(index, 1);
    }
  }
  
  /**
   * Get count of agents by type
   */
  public getAgentCountByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const agent of this.agents.values()) {
      counts[agent.type] = (counts[agent.type] || 0) + 1;
    }
    
    return counts;
  }
  
  /**
   * Find inactive agents that haven't sent a heartbeat within the specified time period
   */
  public findInactiveAgents(maxInactiveTime: number): AgentInfo[] {
    const now = Date.now();
    return Array.from(this.agents.values()).filter(agent => 
      agent.lastHeartbeat && (now - agent.lastHeartbeat) > maxInactiveTime
    );
  }
  
  /**
   * Clear the registry (primarily for testing)
   */
  public clear(): void {
    this.agents.clear();
  }
  
  /**
   * Notify all change listeners of a registry change
   */
  private notifyChangeListeners(agentId: string, action: 'add' | 'update' | 'remove'): void {
    for (const listener of this.changeListeners) {
      try {
        listener(agentId, action);
      } catch (error: unknown) {
        console.error(`Error in registry change listener: ${getErrorMessage(error)}`);
      }
    }
  }
} 