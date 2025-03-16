import { v4 as uuidv4 } from 'uuid';
import { SecurityLevel } from './SecurityModule';
import { 
  Tool, 
  ToolMetadata, 
  ToolProtocol, 
  ToolContext,
  ToolsSystem,
  ToolParameter
} from './ToolsSystem';

/**
 * Types for function calling
 */

// Function definition in OpenAI-compatible format
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterDefinition>;
    required?: string[];
  };
}

// Parameter definition
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: any[];
  format?: string;
  items?: {
    type: 'string' | 'number' | 'boolean' | 'object';
  };
  properties?: Record<string, ParameterDefinition>;
}

// Function execution parameters
export interface FunctionCallParams {
  function_name: string;
  parameters: Record<string, any>;
}

// Function catalog for registration
export interface FunctionCatalog {
  functions: FunctionDefinition[];
}

// Function registration parameters
export interface FunctionRegistrationParams {
  functions: FunctionDefinition[];
}

// Function execution function type
export type FunctionExecutor = (functionName: string, params: Record<string, any>) => Promise<any>;

/**
 * Configuration for function calling
 */
export interface FunctionCallingConfig {
  defaultTimeout?: number;
  functionExecutor?: FunctionExecutor;
}

/**
 * Convert OpenAI function definitions to TRON tool parameters
 */
function convertToToolParameters(functionDef: FunctionDefinition): ToolParameter[] {
  const params: ToolParameter[] = [];
  
  // Convert each property to a tool parameter
  for (const [name, paramDef] of Object.entries(functionDef.parameters.properties)) {
    const required = functionDef.parameters.required?.includes(name) || false;
    
    params.push({
      name,
      type: paramDef.type,
      description: paramDef.description,
      required,
      enum: paramDef.enum,
      ...(paramDef.format && { format: paramDef.format })
    });
  }
  
  return params;
}

/**
 * Default function executor that logs the call and returns a placeholder
 */
const defaultFunctionExecutor: FunctionExecutor = async (functionName, params) => {
  console.log(`Function called: ${functionName}`, params);
  return {
    result: `This is a placeholder result for function '${functionName}'. In a real implementation, this would execute the actual function.`,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create a tool for function calling
 */
export const createFunctionCallingTool = (config: FunctionCallingConfig = {}): Tool<FunctionCallParams, any> => {
  const metadata: ToolMetadata = {
    id: 'function.call',
    name: 'Function Calling',
    description: 'Calls a registered function with the provided parameters',
    version: '1.0.0',
    category: 'Function',
    tags: ['function', 'execution', 'api'],
    parameters: [
      {
        name: 'function_name',
        type: 'string',
        description: 'Name of the function to call',
        required: true
      },
      {
        name: 'parameters',
        type: 'object',
        description: 'Parameters to pass to the function',
        required: true
      }
    ],
    returns: {
      type: 'object',
      description: 'Result of the function execution'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {}
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.MEDIUM,
    timeout: config.defaultTimeout || 30000,
    capabilities: ['function.call', 'code.execute']
  };

  // Use provided function executor or the default
  const functionExecutor = config.functionExecutor || defaultFunctionExecutor;

  return {
    metadata,
    initialized: true,
    execute: async (params: FunctionCallParams, context: ToolContext): Promise<any> => {
      try {
        // Execute the function with the provided parameters
        const result = await functionExecutor(params.function_name, params.parameters);
        
        return {
          function_name: params.function_name,
          result,
          execution_id: uuidv4()
        };
      } catch (error) {
        throw new Error(`Function execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: FunctionCallParams): boolean => {
      return (
        typeof params.function_name === 'string' && 
        params.function_name.trim().length > 0 &&
        typeof params.parameters === 'object'
      );
    }
  };
};

/**
 * Create a tool for function registration
 */
export const createFunctionRegistrationTool = (
  config: FunctionCallingConfig = {},
  functionCatalog: FunctionCatalog = { functions: [] }
): Tool<FunctionRegistrationParams, string[]> => {
  const metadata: ToolMetadata = {
    id: 'function.register',
    name: 'Register Functions',
    description: 'Registers functions that can be called by the function calling tool',
    version: '1.0.0',
    category: 'Function',
    tags: ['function', 'registration', 'api'],
    parameters: [
      {
        name: 'functions',
        type: 'array',
        description: 'Array of function definitions to register',
        required: true
      }
    ],
    returns: {
      type: 'array',
      description: 'List of registered function names'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {}
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.HIGH,
    capabilities: ['function.register']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: FunctionRegistrationParams, context: ToolContext): Promise<string[]> => {
      try {
        const registeredFunctions: string[] = [];
        
        // Register each function
        for (const func of params.functions) {
          // Check if function already exists (update it if it does)
          const existingIndex = functionCatalog.functions.findIndex(f => f.name === func.name);
          
          if (existingIndex >= 0) {
            functionCatalog.functions[existingIndex] = func;
          } else {
            functionCatalog.functions.push(func);
          }
          
          // Create a specialized tool for this function
          const toolsSystem = ToolsSystem.getInstance();
          
          // Convert function definition to tool parameters
          const toolParams = convertToToolParameters(func);
          
          // Create a tool for this specific function
          const functionTool: Tool = {
            metadata: {
              id: `function.${func.name}`,
              name: func.name,
              description: func.description,
              version: '1.0.0',
              category: 'Function',
              tags: ['function', 'api', func.name],
              parameters: toolParams,
              returns: {
                type: 'object',
                description: `Result of ${func.name} execution`
              },
              protocolInfo: {
                protocol: ToolProtocol.LOCAL,
                config: { functionName: func.name }
              },
              requiresAuth: true,
              minSecurityLevel: SecurityLevel.MEDIUM,
              timeout: config.defaultTimeout || 30000,
              capabilities: ['function.execute', `function.${func.name}`]
            },
            initialized: true,
            execute: async (params: any, ctx: ToolContext): Promise<any> => {
              // This will call the underlying function executor with the specific function name
              const execFunc = config.functionExecutor || defaultFunctionExecutor;
              return execFunc(func.name, params);
            }
          };
          
          // Register the specialized tool
          toolsSystem.registerTool(functionTool);
          
          // Add to the list of registered functions
          registeredFunctions.push(func.name);
        }
        
        return registeredFunctions;
      } catch (error) {
        throw new Error(`Function registration failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: FunctionRegistrationParams): boolean => {
      return Array.isArray(params.functions) && params.functions.length > 0;
    }
  };
};

/**
 * Create a tool to retrieve available functions
 */
export const createFunctionListTool = (
  functionCatalog: FunctionCatalog = { functions: [] }
): Tool<{}, FunctionCatalog> => {
  const metadata: ToolMetadata = {
    id: 'function.list',
    name: 'List Functions',
    description: 'Lists all registered functions and their definitions',
    version: '1.0.0',
    category: 'Function',
    tags: ['function', 'list', 'api'],
    parameters: [],
    returns: {
      type: 'object',
      description: 'Catalog of available functions'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {}
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.LOW,
    capabilities: ['function.list']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: {}, context: ToolContext): Promise<FunctionCatalog> => {
      try {
        // Return a copy of the function catalog
        return {
          functions: [...functionCatalog.functions]
        };
      } catch (error) {
        throw new Error(`Function listing failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };
};

/**
 * Register function calling tools with the ToolsSystem
 */
export function registerFunctionCallingTools(config: FunctionCallingConfig = {}): { 
  catalog: FunctionCatalog
} {
  const toolsSystem = ToolsSystem.getInstance();
  
  // Create a shared function catalog
  const functionCatalog: FunctionCatalog = { functions: [] };
  
  // Use provided function executor or the default
  const functionExecutor = config.functionExecutor || defaultFunctionExecutor;
  
  // Register function calling tools
  toolsSystem.registerTool(createFunctionCallingTool({ 
    ...config, 
    functionExecutor 
  }));
  
  toolsSystem.registerTool(createFunctionRegistrationTool(
    { ...config, functionExecutor },
    functionCatalog
  ));
  
  toolsSystem.registerTool(createFunctionListTool(functionCatalog));
  
  console.log('Function calling tools registered successfully');
  
  // Return the catalog so it can be used to register functions programmatically
  return { catalog: functionCatalog };
} 