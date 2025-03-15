import { DomainAgent, DomainAgentConfig } from './DomainAgent';
import { v4 as uuidv4 } from 'uuid';
import { MessageType, CommandMessage, ResponseMessage, Message, getErrorMessage } from './BaseAgent';

// Workflow domain agent configuration
export interface WorkflowDomainAgentConfig extends DomainAgentConfig {
  workflowStoragePath?: string;
  maxConcurrentWorkflows?: number;
}

// Simple workflow definition interface
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  version: number;
}

// Workflow node interface
export interface WorkflowNode {
  id: string;
  type: string;
  name?: string;
  data?: Record<string, any>;
  position?: { x: number; y: number };
}

// Workflow edge interface
export interface WorkflowEdge {
  id: string;
  source: string;      // Source node ID
  target: string;      // Target node ID
  type?: string;       // Edge type (e.g., 'standard', 'conditional')
  data?: Record<string, any>;
}

// Workflow instance interface
export interface WorkflowInstance {
  id: string;
  workflowId: string;
  status: 'CREATED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELED';
  startTime?: number;
  endTime?: number;
  currentNodeId?: string;
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Specialized domain agent for workflow management
 */
export class WorkflowDomainAgent extends DomainAgent {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private workflowInstances: Map<string, WorkflowInstance> = new Map();
  private workflowStoragePath: string;
  private maxConcurrentWorkflows: number;
  
  constructor(config: WorkflowDomainAgentConfig) {
    super({
      ...config,
      domain: 'workflow'
    });
    
    this.workflowStoragePath = config.workflowStoragePath || './workflows';
    this.maxConcurrentWorkflows = config.maxConcurrentWorkflows || 10;
    
    // Register workflow-specific message handlers
    this.registerMessageHandler(MessageType.COMMAND, 'workflow.create', this.handleCreateWorkflow.bind(this) as (message: Message) => Promise<ResponseMessage>);
    this.registerMessageHandler(MessageType.COMMAND, 'workflow.get', this.handleGetWorkflow.bind(this) as (message: Message) => Promise<ResponseMessage>);
    this.registerMessageHandler(MessageType.COMMAND, 'workflow.list', this.handleListWorkflows.bind(this) as (message: Message) => Promise<ResponseMessage>);
    this.registerMessageHandler(MessageType.COMMAND, 'workflow.update', this.handleUpdateWorkflow.bind(this) as (message: Message) => Promise<ResponseMessage>);
    this.registerMessageHandler(MessageType.COMMAND, 'workflow.delete', this.handleDeleteWorkflow.bind(this) as (message: Message) => Promise<ResponseMessage>);
    this.registerMessageHandler(MessageType.COMMAND, 'workflow.execute', this.handleExecuteWorkflow.bind(this) as (message: Message) => Promise<ResponseMessage>);
    this.registerMessageHandler(MessageType.COMMAND, 'workflow.getStatus', this.handleGetWorkflowStatus.bind(this) as (message: Message) => Promise<ResponseMessage>);
  }
  
  /**
   * Initialize the workflow domain agent
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    // In a real implementation, we would load stored workflows here
    console.log(`WorkflowDomainAgent initialized: ${this.getName()} (${this.getId()})`);
  }
  
  /**
   * Handle create workflow command
   */
  private async handleCreateWorkflow(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const { name, description, nodes, edges, metadata } = message.payload.parameters;
      
      if (!name || !nodes || !edges) {
        return this.createErrorResponse(message, 'Workflow name, nodes, and edges are required');
      }
      
      // Create a new workflow definition
      const workflowId = uuidv4();
      const now = Date.now();
      
      const workflow: WorkflowDefinition = {
        id: workflowId,
        name,
        description,
        nodes,
        edges,
        metadata: metadata || {},
        createdAt: now,
        updatedAt: now,
        version: 1
      };
      
      // Store the workflow
      this.workflows.set(workflowId, workflow);
      
      console.log(`Workflow created: ${name} (${workflowId})`);
      
      return this.createSuccessResponse(message, { workflow });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to create workflow: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Handle get workflow command
   */
  private async handleGetWorkflow(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const { workflowId } = message.payload.parameters;
      
      if (!workflowId) {
        return this.createErrorResponse(message, 'Workflow ID is required');
      }
      
      // Get the workflow
      const workflow = this.workflows.get(workflowId);
      
      if (!workflow) {
        return this.createErrorResponse(message, `Workflow not found: ${workflowId}`);
      }
      
      return this.createSuccessResponse(message, { workflow });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to get workflow: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Handle list workflows command
   */
  private async handleListWorkflows(message: CommandMessage): Promise<ResponseMessage> {
    try {
      // Extract any filtering parameters (optional)
      const { filter } = message.payload.parameters || {};
      
      // Get all workflows
      let workflows = Array.from(this.workflows.values());
      
      // Apply filters if provided
      if (filter) {
        if (filter.name) {
          workflows = workflows.filter(wf => wf.name.includes(filter.name));
        }
        
        if (filter.metadata) {
          workflows = workflows.filter(wf => {
            for (const [key, value] of Object.entries(filter.metadata)) {
              if (wf.metadata?.[key] !== value) {
                return false;
              }
            }
            return true;
          });
        }
      }
      
      return this.createSuccessResponse(message, { 
        workflows,
        total: workflows.length 
      });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to list workflows: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Handle update workflow command
   */
  private async handleUpdateWorkflow(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const { workflowId, name, description, nodes, edges, metadata } = message.payload.parameters;
      
      if (!workflowId) {
        return this.createErrorResponse(message, 'Workflow ID is required');
      }
      
      // Get the existing workflow
      const workflow = this.workflows.get(workflowId);
      
      if (!workflow) {
        return this.createErrorResponse(message, `Workflow not found: ${workflowId}`);
      }
      
      // Update the workflow
      const updatedWorkflow: WorkflowDefinition = {
        ...workflow,
        name: name || workflow.name,
        description: description !== undefined ? description : workflow.description,
        nodes: nodes || workflow.nodes,
        edges: edges || workflow.edges,
        metadata: metadata ? { ...workflow.metadata, ...metadata } : workflow.metadata,
        updatedAt: Date.now(),
        version: workflow.version + 1
      };
      
      // Store the updated workflow
      this.workflows.set(workflowId, updatedWorkflow);
      
      console.log(`Workflow updated: ${updatedWorkflow.name} (${workflowId})`);
      
      return this.createSuccessResponse(message, { workflow: updatedWorkflow });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to update workflow: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Handle delete workflow command
   */
  private async handleDeleteWorkflow(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const { workflowId } = message.payload.parameters;
      
      if (!workflowId) {
        return this.createErrorResponse(message, 'Workflow ID is required');
      }
      
      // Check if the workflow exists
      if (!this.workflows.has(workflowId)) {
        return this.createErrorResponse(message, `Workflow not found: ${workflowId}`);
      }
      
      // Delete the workflow
      const workflow = this.workflows.get(workflowId);
      this.workflows.delete(workflowId);
      
      console.log(`Workflow deleted: ${workflow?.name} (${workflowId})`);
      
      return this.createSuccessResponse(message, { deleted: true });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to delete workflow: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Handle execute workflow command
   */
  private async handleExecuteWorkflow(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const { workflowId, parameters } = message.payload.parameters;
      
      if (!workflowId) {
        return this.createErrorResponse(message, 'Workflow ID is required');
      }
      
      // Get the workflow
      const workflow = this.workflows.get(workflowId);
      
      if (!workflow) {
        return this.createErrorResponse(message, `Workflow not found: ${workflowId}`);
      }
      
      // Check if we can execute more workflows
      const runningInstances = Array.from(this.workflowInstances.values())
        .filter(instance => instance.status === 'RUNNING')
        .length;
      
      if (runningInstances >= this.maxConcurrentWorkflows) {
        return this.createErrorResponse(message, `Max concurrent workflows (${this.maxConcurrentWorkflows}) reached`);
      }
      
      // Create a new workflow instance
      const instanceId = uuidv4();
      const now = Date.now();
      
      const instance: WorkflowInstance = {
        id: instanceId,
        workflowId,
        status: 'CREATED',
        parameters: parameters || {},
        createdAt: now,
        updatedAt: now
      };
      
      // Store the instance
      this.workflowInstances.set(instanceId, instance);
      
      // Start execution (async)
      this.executeWorkflowInstance(instanceId)
        .catch(error => console.error(`Error executing workflow instance ${instanceId}: ${getErrorMessage(error)}`));
      
      console.log(`Workflow execution started: ${workflow.name} (${instanceId})`);
      
      return this.createSuccessResponse(message, { 
        instanceId,
        workflowId,
        status: 'CREATED' 
      });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to execute workflow: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Handle get workflow status command
   */
  private async handleGetWorkflowStatus(message: CommandMessage): Promise<ResponseMessage> {
    try {
      const { instanceId } = message.payload.parameters;
      
      if (!instanceId) {
        return this.createErrorResponse(message, 'Instance ID is required');
      }
      
      // Get the workflow instance
      const instance = this.workflowInstances.get(instanceId);
      
      if (!instance) {
        return this.createErrorResponse(message, `Workflow instance not found: ${instanceId}`);
      }
      
      // Get the workflow
      const workflow = this.workflows.get(instance.workflowId);
      
      return this.createSuccessResponse(message, { 
        instance,
        workflowName: workflow?.name
      });
    } catch (error: unknown) {
      return this.createErrorResponse(message, `Failed to get workflow status: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Execute a workflow instance (actual implementation would be more complex)
   */
  private async executeWorkflowInstance(instanceId: string): Promise<void> {
    try {
      // Get the instance
      const instance = this.workflowInstances.get(instanceId);
      if (!instance) {
        throw new Error(`Instance not found: ${instanceId}`);
      }
      
      // Get the workflow
      const workflow = this.workflows.get(instance.workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${instance.workflowId}`);
      }
      
      // Update instance status to RUNNING
      instance.status = 'RUNNING';
      instance.startTime = Date.now();
      instance.updatedAt = Date.now();
      this.workflowInstances.set(instanceId, instance);
      
      console.log(`Starting workflow execution: ${workflow.name} (${instanceId})`);
      
      // In a real implementation, this would execute the workflow by:
      // 1. Traversing the workflow graph
      // 2. Executing each node
      // 3. Handling conditional logic
      // 4. Managing state
      
      // For this example, we'll just simulate execution with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update instance status to COMPLETED
      instance.status = 'COMPLETED';
      instance.endTime = Date.now();
      instance.updatedAt = Date.now();
      instance.result = { message: 'Workflow executed successfully' };
      this.workflowInstances.set(instanceId, instance);
      
      console.log(`Workflow execution completed: ${workflow.name} (${instanceId})`);
    } catch (error: unknown) {
      // Handle errors
      const errorMessage = getErrorMessage(error);
      console.error(`Error executing workflow instance ${instanceId}: ${errorMessage}`);
      
      // Update instance status to FAILED
      const instance = this.workflowInstances.get(instanceId);
      if (instance) {
        instance.status = 'FAILED';
        instance.endTime = Date.now();
        instance.updatedAt = Date.now();
        instance.error = errorMessage;
        this.workflowInstances.set(instanceId, instance);
      }
    }
  }
  
  /**
   * Get a count of workflows and instances by status
   */
  public getWorkflowStats(): any {
    const workflowCount = this.workflows.size;
    
    // Count instances by status
    const instanceCounts: Record<string, number> = {
      CREATED: 0,
      RUNNING: 0,
      PAUSED: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELED: 0
    };
    
    for (const instance of this.workflowInstances.values()) {
      instanceCounts[instance.status] = (instanceCounts[instance.status] || 0) + 1;
    }
    
    return {
      workflows: {
        total: workflowCount
      },
      instances: {
        total: this.workflowInstances.size,
        byStatus: instanceCounts
      }
    };
  }
} 