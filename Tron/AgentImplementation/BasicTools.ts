import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { SecurityLevel } from './SecurityModule';
import { 
  Tool, 
  ToolMetadata, 
  ToolProtocol, 
  ToolContext,
  ToolsSystem
} from './ToolsSystem';

/**
 * File System Tools
 */

// Read File Tool
interface ReadFileParams {
  filePath: string;
  encoding?: BufferEncoding;
}

export const createReadFileTool = (): Tool<ReadFileParams, string> => {
  const metadata: ToolMetadata = {
    id: 'file.read',
    name: 'Read File',
    description: 'Reads the contents of a file from the file system',
    version: '1.0.0',
    category: 'File System',
    tags: ['file', 'io', 'read'],
    parameters: [
      {
        name: 'filePath',
        type: 'string',
        description: 'The path to the file to read',
        required: true
      },
      {
        name: 'encoding',
        type: 'string',
        description: 'The encoding to use (default: utf8)',
        required: false,
        default: 'utf8'
      }
    ],
    returns: {
      type: 'string',
      description: 'The contents of the file'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {}
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.MEDIUM,
    capabilities: ['file.read', 'io.read']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: ReadFileParams, context: ToolContext): Promise<string> => {
      const encoding = params.encoding || 'utf8';
      try {
        const content = await fs.readFile(params.filePath, { encoding });
        return content;
      } catch (error) {
        throw new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: ReadFileParams): boolean => {
      return typeof params.filePath === 'string' && params.filePath.trim().length > 0;
    }
  };
};

// Write File Tool
interface WriteFileParams {
  filePath: string;
  content: string;
  encoding?: BufferEncoding;
  createPath?: boolean;
}

export const createWriteFileTool = (): Tool<WriteFileParams, boolean> => {
  const metadata: ToolMetadata = {
    id: 'file.write',
    name: 'Write File',
    description: 'Writes content to a file in the file system',
    version: '1.0.0',
    category: 'File System',
    tags: ['file', 'io', 'write'],
    parameters: [
      {
        name: 'filePath',
        type: 'string',
        description: 'The path to the file to write',
        required: true
      },
      {
        name: 'content',
        type: 'string',
        description: 'The content to write to the file',
        required: true
      },
      {
        name: 'encoding',
        type: 'string',
        description: 'The encoding to use (default: utf8)',
        required: false,
        default: 'utf8'
      },
      {
        name: 'createPath',
        type: 'boolean',
        description: 'Whether to create the directory path if it does not exist',
        required: false,
        default: false
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if the file was written successfully'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {}
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.HIGH,
    capabilities: ['file.write', 'io.write']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: WriteFileParams, context: ToolContext): Promise<boolean> => {
      const encoding = params.encoding || 'utf8';
      try {
        if (params.createPath) {
          const dirname = path.dirname(params.filePath);
          await fs.mkdir(dirname, { recursive: true });
        }
        
        await fs.writeFile(params.filePath, params.content, { encoding });
        return true;
      } catch (error) {
        throw new Error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: WriteFileParams): boolean => {
      return (
        typeof params.filePath === 'string' && 
        params.filePath.trim().length > 0 && 
        typeof params.content === 'string'
      );
    }
  };
};

// List Directory Tool
interface ListDirectoryParams {
  directoryPath: string;
  recursive?: boolean;
  pattern?: string;
}

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedTime?: Date;
}

export const createListDirectoryTool = (): Tool<ListDirectoryParams, FileInfo[]> => {
  const metadata: ToolMetadata = {
    id: 'file.list',
    name: 'List Directory',
    description: 'Lists files and directories in a specified directory',
    version: '1.0.0',
    category: 'File System',
    tags: ['file', 'directory', 'list'],
    parameters: [
      {
        name: 'directoryPath',
        type: 'string',
        description: 'The path to the directory to list',
        required: true
      },
      {
        name: 'recursive',
        type: 'boolean',
        description: 'Whether to recursively list subdirectories',
        required: false,
        default: false
      },
      {
        name: 'pattern',
        type: 'string',
        description: 'A glob pattern to filter files',
        required: false
      }
    ],
    returns: {
      type: 'array',
      description: 'An array of file and directory information'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {}
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.MEDIUM,
    capabilities: ['file.list', 'directory.list']
  };

  const tool: Tool<ListDirectoryParams, FileInfo[]> = {
    metadata,
    initialized: true,
    execute: async (params: ListDirectoryParams, context: ToolContext): Promise<FileInfo[]> => {
      try {
        const entries = await fs.readdir(params.directoryPath, { withFileTypes: true });
        const result: FileInfo[] = [];
        
        for (const entry of entries) {
          const entryPath = path.join(params.directoryPath, entry.name);
          
          // Skip if pattern is provided and doesn't match
          if (params.pattern && !entryPath.includes(params.pattern)) {
            continue;
          }
          
          const entryInfo: FileInfo = {
            name: entry.name,
            path: entryPath,
            isDirectory: entry.isDirectory()
          };
          
          try {
            const stats = await fs.stat(entryPath);
            entryInfo.size = stats.size;
            entryInfo.modifiedTime = stats.mtime;
          } catch (error) {
            // Ignore stats errors and continue
          }
          
          result.push(entryInfo);
          
          // Recursively list subdirectories if requested
          if (params.recursive && entry.isDirectory()) {
            const subEntries = await tool.execute(
              { 
                directoryPath: entryPath, 
                recursive: true, 
                pattern: params.pattern 
              }, 
              context
            );
            result.push(...subEntries);
          }
        }
        
        return result;
      } catch (error) {
        throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: ListDirectoryParams): boolean => {
      return typeof params.directoryPath === 'string' && params.directoryPath.trim().length > 0;
    }
  };
  
  return tool;
};

/**
 * Network Tools
 */

// HTTP Request Tool
interface HttpRequestParams {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
}

export const createHttpRequestTool = (): Tool<HttpRequestParams, HttpResponse> => {
  const metadata: ToolMetadata = {
    id: 'network.http',
    name: 'HTTP Request',
    description: 'Makes an HTTP request to a specified URL',
    version: '1.0.0',
    category: 'Network',
    tags: ['http', 'network', 'request'],
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'The URL to send the request to',
        required: true
      },
      {
        name: 'method',
        type: 'string',
        description: 'The HTTP method to use',
        required: false,
        default: 'GET',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      },
      {
        name: 'headers',
        type: 'object',
        description: 'HTTP headers to include in the request',
        required: false
      },
      {
        name: 'body',
        type: 'object',
        description: 'The request body (for POST, PUT, etc.)',
        required: false
      },
      {
        name: 'timeout',
        type: 'number',
        description: 'Request timeout in milliseconds',
        required: false,
        default: 30000
      }
    ],
    returns: {
      type: 'object',
      description: 'The HTTP response'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {}
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.MEDIUM,
    timeout: 60000,
    capabilities: ['network.http', 'network.request']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: HttpRequestParams, context: ToolContext): Promise<HttpResponse> => {
      try {
        const options: any = {
          method: params.method || 'GET',
          headers: params.headers || {},
          timeout: params.timeout || 30000
        };
        
        // Add body if provided
        if (params.body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
          options.body = JSON.stringify(params.body);
          options.headers['Content-Type'] = 'application/json';
        }
        
        const response = await fetch(params.url, options);
        let data;
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        
        // Convert headers to record
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        
        return {
          status: response.status,
          statusText: response.statusText,
          headers,
          data
        };
      } catch (error) {
        throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: HttpRequestParams): boolean => {
      return typeof params.url === 'string' && params.url.trim().length > 0;
    }
  };
};

/**
 * System Tools
 */

// System Info Tool
interface SystemInfoParams {
  includeMemory?: boolean;
  includeCpu?: boolean;
  includeNetwork?: boolean;
}

interface SystemInfo {
  platform: string;
  hostname: string;
  arch: string;
  uptime: number;
  memory?: {
    total: number;
    free: number;
    used: number;
  };
  cpus?: {
    model: string;
    speed: number;
    cores: number;
  };
  network?: {
    interfaces: Record<string, any>;
  };
}

export const createSystemInfoTool = (): Tool<SystemInfoParams, SystemInfo> => {
  const metadata: ToolMetadata = {
    id: 'system.info',
    name: 'System Information',
    description: 'Retrieves information about the system',
    version: '1.0.0',
    category: 'System',
    tags: ['system', 'info', 'diagnostics'],
    parameters: [
      {
        name: 'includeMemory',
        type: 'boolean',
        description: 'Whether to include memory information',
        required: false,
        default: true
      },
      {
        name: 'includeCpu',
        type: 'boolean',
        description: 'Whether to include CPU information',
        required: false,
        default: true
      },
      {
        name: 'includeNetwork',
        type: 'boolean',
        description: 'Whether to include network interface information',
        required: false,
        default: false
      }
    ],
    returns: {
      type: 'object',
      description: 'System information'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {}
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.LOW,
    capabilities: ['system.info']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: SystemInfoParams, context: ToolContext): Promise<SystemInfo> => {
      try {
        const info: SystemInfo = {
          platform: os.platform(),
          hostname: os.hostname(),
          arch: os.arch(),
          uptime: os.uptime()
        };
        
        if (params.includeMemory !== false) {
          const totalMem = os.totalmem();
          const freeMem = os.freemem();
          info.memory = {
            total: totalMem,
            free: freeMem,
            used: totalMem - freeMem
          };
        }
        
        if (params.includeCpu !== false) {
          const cpus = os.cpus();
          info.cpus = {
            model: cpus[0].model,
            speed: cpus[0].speed,
            cores: cpus.length
          };
        }
        
        if (params.includeNetwork === true) {
          info.network = {
            interfaces: os.networkInterfaces()
          };
        }
        
        return info;
      } catch (error) {
        throw new Error(`Failed to get system info: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };
};

/**
 * Data Processing Tools
 */

// JSON Parser Tool
interface JsonParseParams {
  input: string;
  reviver?: string; // Function string to be evaluated
}

export const createJsonParseTool = (): Tool<JsonParseParams, any> => {
  const metadata: ToolMetadata = {
    id: 'data.json.parse',
    name: 'JSON Parser',
    description: 'Parses a JSON string into a JavaScript object',
    version: '1.0.0',
    category: 'Data Processing',
    tags: ['json', 'parser', 'data'],
    parameters: [
      {
        name: 'input',
        type: 'string',
        description: 'The JSON string to parse',
        required: true
      },
      {
        name: 'reviver',
        type: 'string',
        description: 'A function string for the JSON.parse reviver parameter',
        required: false
      }
    ],
    returns: {
      type: 'object',
      description: 'The parsed JavaScript object'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {}
    },
    requiresAuth: false,
    minSecurityLevel: SecurityLevel.LOW,
    capabilities: ['data.parse', 'json.parse']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: JsonParseParams, context: ToolContext): Promise<any> => {
      try {
        if (params.reviver) {
          // Convert string function to actual function (with security considerations)
          // Note: In a production environment, you would want to be very careful with this
          const reviverFn = new Function('key', 'value', `return (${params.reviver})(key, value);`) as (key: string, value: any) => any;
          return JSON.parse(params.input, reviverFn);
        } else {
          return JSON.parse(params.input);
        }
      } catch (error) {
        throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: JsonParseParams): boolean => {
      return typeof params.input === 'string' && params.input.trim().length > 0;
    }
  };
};

/**
 * Register all basic tools with the ToolsSystem
 */
export function registerBasicTools(): void {
  const toolsSystem = ToolsSystem.getInstance();
  
  // Register file system tools
  toolsSystem.registerTool(createReadFileTool());
  toolsSystem.registerTool(createWriteFileTool());
  toolsSystem.registerTool(createListDirectoryTool());
  
  // Register network tools
  toolsSystem.registerTool(createHttpRequestTool());
  
  // Register system tools
  toolsSystem.registerTool(createSystemInfoTool());
  
  // Register data processing tools
  toolsSystem.registerTool(createJsonParseTool());
  
  console.log('Basic tools registered successfully');
} 