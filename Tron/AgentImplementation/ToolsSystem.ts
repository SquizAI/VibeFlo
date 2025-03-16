import { v4 as uuidv4 } from 'uuid';
import { SecurityModule, Credentials, SecurityLevel } from './SecurityModule';
import { getErrorMessage } from './BaseAgent';

/**
 * Tool execution context
 */
export interface ToolContext {
  executionId: string;
  requesterId: string;
  credentials?: Credentials;
  startTime: number;
  parentExecutionId?: string;
  metadata: Record<string, any>;
}

/**
 * Tool execution result
 */
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  executionTime: number;
  executionId: string;
}

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
}

/**
 * Tool execution protocol
 */
export enum ToolProtocol {
  LOCAL = 'local',      // Execute in the same process
  HTTP = 'http',        // Execute over HTTP
  GRPC = 'grpc',        // Execute over gRPC
  SHELL = 'shell',      // Execute as a shell command
  PYTHON = 'python',    // Execute as a Python script
  PLUGIN = 'plugin',    // Execute through a plugin
  COMPOSITE = 'composite' // Execute as a composition of other tools
}

/**
 * Tool metadata
 */
export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  category: string;
  tags: string[];
  parameters: ToolParameter[];
  returns: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
  };
  protocolInfo: {
    protocol: ToolProtocol;
    config: Record<string, any>;
  };
  requiresAuth: boolean;
  minSecurityLevel: SecurityLevel;
  timeout?: number; // In milliseconds
  rateLimit?: {
    requests: number;
    period: number; // In milliseconds
  };
  capabilities: string[]; // Capabilities this tool provides
}

/**
 * Tool handler function
 */
export type ToolHandler<P = any, R = any> = (
  params: P,
  context: ToolContext
) => Promise<R>;

/**
 * Tool implementation
 */
export interface Tool<P = any, R = any> {
  metadata: ToolMetadata;
  execute: ToolHandler<P, R>;
  validate?: (params: P) => boolean;
  initialized: boolean;
  initialize?: () => Promise<void>;
  shutdown?: () => Promise<void>;
}

/**
 * Tool capability interface
 */
export interface ToolCapability {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  returns: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
  };
  tags: string[];
  minSecurityLevel: SecurityLevel;
}

/**
 * Tool discovery options
 */
export interface ToolDiscoveryOptions {
  category?: string;
  tags?: string[];
  capabilities?: string[];
  protocol?: ToolProtocol;
  requiresAuth?: boolean;
  maxSecurityLevel?: SecurityLevel;
}

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  timeout?: number;
  retries?: number;
  requesterInfo?: {
    id: string;
    credentials?: Credentials;
  };
  parentExecutionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Tool rate limiting tracker
 */
interface RateLimitTracker {
  requests: number[];
  lastReset: number;
}

/**
 * Composite tool step
 */
export interface CompositeToolStep {
  toolId: string;
  parameterMapping: Record<string, string | ((results: Record<string, any>) => any)>;
  resultMapping?: string | ((result: any) => any);
  condition?: (results: Record<string, any>) => boolean;
}

/**
 * Composite tool execution plan
 */
export interface CompositeToolPlan {
  steps: CompositeToolStep[];
  parallel?: boolean;
}

/**
 * Tools System manager
 */
export class ToolsSystem {
  private static instance: ToolsSystem;
  private tools: Map<string, Tool> = new Map();
  private capabilities: Map<string, ToolCapability> = new Map();
  private rateLimits: Map<string, RateLimitTracker> = new Map();
  private securityModule?: SecurityModule;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ToolsSystem {
    if (!ToolsSystem.instance) {
      ToolsSystem.instance = new ToolsSystem();
    }
    
    return ToolsSystem.instance;
  }
  
  /**
   * Set the security module
   */
  public setSecurityModule(securityModule: SecurityModule): void {
    this.securityModule = securityModule;
  }
  
  /**
   * Register a tool
   */
  public registerTool<P = any, R = any>(tool: Tool<P, R>): void {
    if (this.tools.has(tool.metadata.id)) {
      throw new Error(`Tool with ID ${tool.metadata.id} is already registered`);
    }
    
    // Register the tool
    this.tools.set(tool.metadata.id, tool);
    
    // Register the capabilities this tool provides
    for (const capabilityId of tool.metadata.capabilities) {
      // If the capability doesn't exist, create it based on the tool
      if (!this.capabilities.has(capabilityId)) {
        this.capabilities.set(capabilityId, {
          id: capabilityId,
          name: capabilityId,
          description: `Capability provided by ${tool.metadata.name}`,
          parameters: tool.metadata.parameters,
          returns: tool.metadata.returns,
          tags: tool.metadata.tags,
          minSecurityLevel: tool.metadata.minSecurityLevel
        });
      }
    }
    
    console.log(`Tool ${tool.metadata.name} (${tool.metadata.id}) registered successfully`);
  }
  
  /**
   * Unregister a tool
   */
  public unregisterTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    
    if (!tool) {
      return false;
    }
    
    // Remove tool
    this.tools.delete(toolId);
    
    // Clean up capability registrations if no other tools provide them
    for (const capabilityId of tool.metadata.capabilities) {
      let isStillProvided = false;
      
      for (const [, otherTool] of this.tools.entries()) {
        if (otherTool.metadata.capabilities.includes(capabilityId)) {
          isStillProvided = true;
          break;
        }
      }
      
      if (!isStillProvided) {
        this.capabilities.delete(capabilityId);
      }
    }
    
    console.log(`Tool ${tool.metadata.name} (${toolId}) unregistered successfully`);
    return true;
  }
  
  /**
   * Discover available tools
   */
  public discoverTools(options?: ToolDiscoveryOptions): ToolMetadata[] {
    // Start with all tools
    let result = Array.from(this.tools.values()).map(tool => tool.metadata);
    
    // Apply filters if provided
    if (options) {
      if (options.category) {
        result = result.filter(tool => tool.category === options.category);
      }
      
      if (options.tags && options.tags.length > 0) {
        result = result.filter(tool => 
          options.tags!.some(tag => tool.tags.includes(tag))
        );
      }
      
      if (options.capabilities && options.capabilities.length > 0) {
        result = result.filter(tool => 
          options.capabilities!.some(cap => tool.capabilities.includes(cap))
        );
      }
      
      if (options.protocol) {
        result = result.filter(tool => 
          tool.protocolInfo.protocol === options.protocol
        );
      }
      
      if (options.requiresAuth !== undefined) {
        result = result.filter(tool => 
          tool.requiresAuth === options.requiresAuth
        );
      }
      
      if (options.maxSecurityLevel !== undefined) {
        result = result.filter(tool => 
          tool.minSecurityLevel <= options.maxSecurityLevel!
        );
      }
    }
    
    return result;
  }
  
  /**
   * Discover available capabilities
   */
  public discoverCapabilities(tags?: string[]): ToolCapability[] {
    let result = Array.from(this.capabilities.values());
    
    if (tags && tags.length > 0) {
      result = result.filter(cap => 
        tags.some(tag => cap.tags.includes(tag))
      );
    }
    
    return result;
  }
  
  /**
   * Execute a tool by ID
   */
  public async executeTool<P = any, R = any>(
    toolId: string,
    params: P,
    options?: ToolExecutionOptions
  ): Promise<ToolResult<R>> {
    const tool = this.tools.get(toolId) as Tool<P, R>;
    
    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool with ID ${toolId} not found`
        },
        executionTime: 0,
        executionId: uuidv4()
      };
    }
    
    return this.executeToolImpl(tool, params, options);
  }
  
  /**
   * Execute a capability
   */
  public async executeCapability<P = any, R = any>(
    capabilityId: string,
    params: P,
    options?: ToolExecutionOptions
  ): Promise<ToolResult<R>> {
    // Find tools that provide this capability
    const toolsWithCapability = Array.from(this.tools.values())
      .filter(tool => tool.metadata.capabilities.includes(capabilityId))
      .sort((a, b) => {
        // Sort by security level (lowest first)
        if (a.metadata.minSecurityLevel !== b.metadata.minSecurityLevel) {
          return a.metadata.minSecurityLevel - b.metadata.minSecurityLevel;
        }
        // Then by protocol (local first)
        if (a.metadata.protocolInfo.protocol !== b.metadata.protocolInfo.protocol) {
          return a.metadata.protocolInfo.protocol === ToolProtocol.LOCAL ? -1 : 1;
        }
        // Then by version (highest first)
        return b.metadata.version.localeCompare(a.metadata.version);
      });
    
    if (toolsWithCapability.length === 0) {
      return {
        success: false,
        error: {
          code: 'CAPABILITY_NOT_FOUND',
          message: `No tools provide capability ${capabilityId}`
        },
        executionTime: 0,
        executionId: uuidv4()
      };
    }
    
    // Use the first applicable tool
    const tool = toolsWithCapability[0] as Tool<P, R>;
    
    return this.executeToolImpl(tool, params, options);
  }
  
  /**
   * Execute a composite tool plan
   */
  public async executeCompositeTool<R = any>(
    plan: CompositeToolPlan,
    initialParams: Record<string, any> = {},
    options?: ToolExecutionOptions
  ): Promise<ToolResult<R>> {
    const executionId = uuidv4();
    const startTime = Date.now();
    
    // Store the results from each step
    const stepResults: Record<string, any> = { ...initialParams };
    
    try {
      if (plan.parallel) {
        // Execute steps in parallel
        const stepPromises = plan.steps.map(async step => {
          // Check condition if present
          if (step.condition && !step.condition(stepResults)) {
            return null; // Skip this step
          }
          
          // Map parameters from previous results
          const params = this.mapStepParameters(step.parameterMapping, stepResults);
          
          // Execute the tool
          const result = await this.executeTool(
            step.toolId,
            params,
            {
              ...options,
              parentExecutionId: executionId
            }
          );
          
          if (!result.success) {
            throw new Error(`Step execution failed: ${result.error?.message}`);
          }
          
          // Map the result if needed
          return step.resultMapping 
            ? this.mapStepResult(step.resultMapping, result.data)
            : result.data;
        });
        
        // Wait for all steps to complete
        const results = await Promise.all(stepPromises);
        
        // Merge results into stepResults
        results.forEach((result, index) => {
          if (result !== null) {
            const stepId = `step${index}`;
            stepResults[stepId] = result;
          }
        });
      } else {
        // Execute steps sequentially
        for (let i = 0; i < plan.steps.length; i++) {
          const step = plan.steps[i];
          
          // Check condition if present
          if (step.condition && !step.condition(stepResults)) {
            continue; // Skip this step
          }
          
          // Map parameters from previous results
          const params = this.mapStepParameters(step.parameterMapping, stepResults);
          
          // Execute the tool
          const result = await this.executeTool(
            step.toolId,
            params,
            {
              ...options,
              parentExecutionId: executionId
            }
          );
          
          if (!result.success) {
            return {
              success: false,
              error: {
                code: 'COMPOSITE_STEP_FAILED',
                message: `Step ${i} failed: ${result.error?.message}`,
                details: { stepIndex: i, error: result.error }
              },
              executionTime: Date.now() - startTime,
              executionId
            };
          }
          
          // Store the result for use in subsequent steps
          const stepId = `step${i}`;
          stepResults[stepId] = step.resultMapping 
            ? this.mapStepResult(step.resultMapping, result.data)
            : result.data;
        }
      }
      
      // Final result is the combination of all step results
      return {
        success: true,
        data: stepResults as any,
        executionTime: Date.now() - startTime,
        executionId
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: {
          code: 'COMPOSITE_EXECUTION_ERROR',
          message: getErrorMessage(error),
          details: { error }
        },
        executionTime: Date.now() - startTime,
        executionId
      };
    }
  }
  
  /**
   * Create a composite tool
   */
  public createCompositeTool<P = any, R = any>(
    metadata: Omit<ToolMetadata, 'protocolInfo'>,
    plan: CompositeToolPlan,
    parameterMapping?: Record<string, string>
  ): Tool<P, R> {
    // Create a composite tool
    const compositeTool: Tool<P, R> = {
      metadata: {
        ...metadata,
        protocolInfo: {
          protocol: ToolProtocol.COMPOSITE,
          config: { plan }
        }
      },
      execute: async (params: P, context: ToolContext): Promise<R> => {
        // Map input parameters to initialParams
        const initialParams: Record<string, any> = {};
        
        if (parameterMapping) {
          for (const [paramName, stepParamKey] of Object.entries(parameterMapping)) {
            initialParams[stepParamKey] = (params as any)[paramName];
          }
        } else {
          // Without explicit mapping, pass all params as-is
          Object.assign(initialParams, params);
        }
        
        // Execute the composite plan
        const result = await this.executeCompositeTool<R>(
          plan,
          initialParams,
          {
            requesterInfo: {
              id: context.requesterId,
              credentials: context.credentials
            },
            parentExecutionId: context.executionId,
            metadata: context.metadata
          }
        );
        
        if (!result.success) {
          throw new Error(`Composite tool execution failed: ${result.error?.message}`);
        }
        
        // Ensure we always return a non-undefined value of type R
        return result.data as R;
      },
      initialized: true
    };
    
    // Register the tool
    this.registerTool(compositeTool);
    
    return compositeTool;
  }
  
  /**
   * Internal method to execute a tool
   */
  private async executeToolImpl<P = any, R = any>(
    tool: Tool<P, R>,
    params: P,
    options?: ToolExecutionOptions
  ): Promise<ToolResult<R>> {
    const executionId = uuidv4();
    const startTime = Date.now();
    
    try {
      // Check rate limits
      if (tool.metadata.rateLimit && !this.checkRateLimit(tool.metadata.id, tool.metadata.rateLimit)) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded for tool ${tool.metadata.name}`
          },
          executionTime: 0,
          executionId
        };
      }
      
      // Check authentication if required
      if (tool.metadata.requiresAuth) {
        if (!this.securityModule) {
          return {
            success: false,
            error: {
              code: 'SECURITY_MODULE_NOT_CONFIGURED',
              message: 'Security module is required but not configured'
            },
            executionTime: 0,
            executionId
          };
        }
        
        const credentials = options?.requesterInfo?.credentials;
        
        if (!credentials) {
          return {
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: `Tool ${tool.metadata.name} requires authentication`
            },
            executionTime: 0,
            executionId
          };
        }
        
        // Check security level
        if (credentials.securityLevel < tool.metadata.minSecurityLevel) {
          return {
            success: false,
            error: {
              code: 'INSUFFICIENT_SECURITY_LEVEL',
              message: `Tool ${tool.metadata.name} requires security level ${tool.metadata.minSecurityLevel}`
            },
            executionTime: 0,
            executionId
          };
        }
      }
      
      // Validate parameters if a validator is provided
      if (tool.validate && !tool.validate(params)) {
        return {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: `Invalid parameters for tool ${tool.metadata.name}`
          },
          executionTime: 0,
          executionId
        };
      }
      
      // Initialize the tool if needed
      if (!tool.initialized && tool.initialize) {
        await tool.initialize();
        tool.initialized = true;
      }
      
      // Create execution context
      const context: ToolContext = {
        executionId,
        requesterId: options?.requesterInfo?.id || 'anonymous',
        credentials: options?.requesterInfo?.credentials,
        startTime,
        parentExecutionId: options?.parentExecutionId,
        metadata: options?.metadata || {}
      };
      
      // Set up timeout handler if needed
      const timeoutMs = options?.timeout || tool.metadata.timeout || 30000;
      let timeoutId: NodeJS.Timeout | undefined;
      
      const executeWithTimeout = async (): Promise<R> => {
        return new Promise<R>((resolve, reject) => {
          // Set timeout
          timeoutId = setTimeout(() => {
            reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
          }, timeoutMs);
          
          // Execute the tool
          tool.execute(params, context)
            .then(resolve)
            .catch(reject)
            .finally(() => {
              if (timeoutId) clearTimeout(timeoutId);
            });
        });
      };
      
      // Execute with retry logic if configured
      const maxRetries = options?.retries || 0;
      let retryCount = 0;
      let lastError: unknown;
      
      while (retryCount <= maxRetries) {
        try {
          const result = await executeWithTimeout();
          
          return {
            success: true,
            data: result,
            executionTime: Date.now() - startTime,
            executionId
          };
        } catch (error: unknown) {
          lastError = error;
          retryCount++;
          
          if (retryCount <= maxRetries) {
            // Simple exponential backoff
            const backoffMs = Math.min(100 * Math.pow(2, retryCount), 5000);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
        }
      }
      
      // If we get here, all retries failed
      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: getErrorMessage(lastError),
          details: { error: lastError }
        },
        executionTime: Date.now() - startTime,
        executionId
      };
    } catch (error: unknown) {
      // Handle any unexpected errors
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: getErrorMessage(error),
          details: { error }
        },
        executionTime: Date.now() - startTime,
        executionId
      };
    }
  }
  
  /**
   * Check if a tool has exceeded its rate limit
   */
  private checkRateLimit(
    toolId: string,
    rateLimit: { requests: number; period: number }
  ): boolean {
    const now = Date.now();
    
    // Get or create rate limit tracker
    let tracker = this.rateLimits.get(toolId);
    
    if (!tracker) {
      tracker = {
        requests: [],
        lastReset: now
      };
      this.rateLimits.set(toolId, tracker);
    }
    
    // Check if we need to reset the window
    if (now - tracker.lastReset > rateLimit.period) {
      tracker.requests = [];
      tracker.lastReset = now;
    }
    
    // Check if limit is exceeded
    if (tracker.requests.length >= rateLimit.requests) {
      return false;
    }
    
    // Record this request
    tracker.requests.push(now);
    return true;
  }
  
  /**
   * Map parameters for a composite tool step
   */
  private mapStepParameters(
    parameterMapping: Record<string, string | ((results: Record<string, any>) => any)>,
    stepResults: Record<string, any>
  ): Record<string, any> {
    const params: Record<string, any> = {};
    
    for (const [paramName, mapping] of Object.entries(parameterMapping)) {
      if (typeof mapping === 'function') {
        // Use the function to compute the parameter
        params[paramName] = mapping(stepResults);
      } else {
        // Use the string as a key into stepResults
        params[paramName] = stepResults[mapping];
      }
    }
    
    return params;
  }
  
  /**
   * Map a result for a composite tool step
   */
  private mapStepResult(
    resultMapping: string | ((result: any) => any),
    result: any
  ): any {
    if (typeof resultMapping === 'function') {
      return resultMapping(result);
    } else {
      return result[resultMapping];
    }
  }
} 