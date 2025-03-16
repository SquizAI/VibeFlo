import * as fs from 'fs/promises';
import * as path from 'path';
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
 * Types for file search
 */

// File metadata
export interface FileMetadata {
  fileId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadDate: string;
  lastModifiedDate: string;
  customMetadata?: Record<string, any>;
}

// Vector store representation
export interface VectorStore {
  id: string;
  name: string;
  description?: string;
  fileCount: number;
  totalSize: number;
  createdAt: string;
  updatedAt: string;
}

// File chunk with embedded vector
export interface FileChunk {
  chunkId: string;
  fileId: string;
  filename: string;
  content: string;
  startChar: number;
  endChar: number;
  metadata?: Record<string, any>;
  score?: number;
}

// File search parameters
export interface FileSearchParams {
  query: string;
  vectorStoreIds: string[];
  maxResults?: number;
  filters?: MetadataFilter;
  includeMetadata?: boolean;
}

// File search response
export interface FileSearchResponse {
  results: FileChunk[];
  totalResults: number;
  searchId: string;
  vectorStoreIds: string[];
  executionTime: number;
}

// Metadata filter types
export type MetadataFilter = 
  | EqualsFilter
  | NotEqualsFilter
  | GreaterThanFilter
  | LessThanFilter
  | InFilter
  | NotInFilter
  | AndFilter
  | OrFilter;

export interface EqualsFilter {
  type: 'eq';
  key: string;
  value: string | number | boolean;
}

export interface NotEqualsFilter {
  type: 'ne';
  key: string;
  value: string | number | boolean;
}

export interface GreaterThanFilter {
  type: 'gt';
  key: string;
  value: number;
}

export interface LessThanFilter {
  type: 'lt';
  key: string;
  value: number;
}

export interface InFilter {
  type: 'in';
  key: string;
  values: (string | number | boolean)[];
}

export interface NotInFilter {
  type: 'nin';
  key: string;
  values: (string | number | boolean)[];
}

export interface AndFilter {
  type: 'and';
  filters: MetadataFilter[];
}

export interface OrFilter {
  type: 'or';
  filters: MetadataFilter[];
}

// File upload parameters
export interface FileUploadParams {
  filepath: string;
  filename?: string;
  vectorStoreId: string;
  chunkSize?: number;
  chunkOverlap?: number;
  metadata?: Record<string, any>;
}

// File upload response
export interface FileUploadResponse {
  fileId: string;
  filename: string;
  vectorStoreId: string;
  chunkCount: number;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

// Vector store creation parameters
export interface VectorStoreCreateParams {
  name: string;
  description?: string;
  embeddingModel?: string;
}

/**
 * Configuration for file search
 */
export interface FileSearchConfig {
  vectorStoreDir?: string;
  defaultEmbeddingModel?: string;
  defaultChunkSize?: number;
  defaultChunkOverlap?: number;
  defaultMaxResults?: number;
}

/**
 * Create a tool for semantic file search
 */
export const createFileSearchTool = (config: FileSearchConfig = {}): Tool<FileSearchParams, FileSearchResponse> => {
  const metadata: ToolMetadata = {
    id: 'file.search',
    name: 'File Search',
    description: 'Searches through indexed files using semantic search',
    version: '1.0.0',
    category: 'File System',
    tags: ['file', 'search', 'semantic', 'vector'],
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The search query to look for in the files',
        required: true
      },
      {
        name: 'vectorStoreIds',
        type: 'array',
        description: 'IDs of the vector stores to search in',
        required: true
      },
      {
        name: 'maxResults',
        type: 'number',
        description: 'Maximum number of results to return',
        required: false,
        default: config.defaultMaxResults || 10
      },
      {
        name: 'filters',
        type: 'object',
        description: 'Metadata filters to apply to the search',
        required: false
      },
      {
        name: 'includeMetadata',
        type: 'boolean',
        description: 'Whether to include file metadata in the results',
        required: false,
        default: true
      }
    ],
    returns: {
      type: 'object',
      description: 'Search results and metadata'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {
        vectorStoreDir: config.vectorStoreDir || './vector_stores'
      }
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.MEDIUM,
    capabilities: ['file.search', 'knowledge.query', 'semantic.search']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: FileSearchParams, context: ToolContext): Promise<FileSearchResponse> => {
      try {
        // Record start time for execution timing
        const startTime = Date.now();
        
        // In a real implementation, this would use a vector database
        // For this example, we'll simulate search results
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate search results
        const results: FileChunk[] = [];
        
        // Generate 'maxResults' simulated chunks
        const numResults = params.maxResults || 10;
        for (let i = 0; i < numResults; i++) {
          const storeId = params.vectorStoreIds[0]; // Use the first store ID
          results.push({
            chunkId: `chunk_${uuidv4()}`,
            fileId: `file_${i}_${uuidv4().substring(0, 8)}`,
            filename: `document_${i}.pdf`,
            content: `This is a simulated file chunk that contains information relevant to the query: "${params.query}".
It would contain actual text from the document that matches semantically with the query.
The text would be a segment from the document that contains the most relevant information.`,
            startChar: i * 1000,
            endChar: (i * 1000) + 500,
            metadata: {
              page: i + 1,
              section: 'Introduction',
              ...(params.filters ? { type: 'report' } : {}) // Add metadata to match filters if provided
            },
            score: 0.95 - (i * 0.05) // Decreasing relevance scores
          });
        }
        
        // If filters are provided, simulate filtering
        if (params.filters) {
          console.log(`Applying filter: ${JSON.stringify(params.filters)}`);
          // In a real implementation, this would filter based on the actual filter logic
        }
        
        return {
          results,
          totalResults: numResults * 3, // Simulate more total results than returned
          searchId: uuidv4(),
          vectorStoreIds: params.vectorStoreIds,
          executionTime: Date.now() - startTime
        };
      } catch (error) {
        throw new Error(`File search failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: FileSearchParams): boolean => {
      return (
        typeof params.query === 'string' && 
        params.query.trim().length > 0 &&
        Array.isArray(params.vectorStoreIds) && 
        params.vectorStoreIds.length > 0
      );
    }
  };
};

/**
 * Create a tool for file upload and indexing
 */
export const createFileUploadTool = (config: FileSearchConfig = {}): Tool<FileUploadParams, FileUploadResponse> => {
  const metadata: ToolMetadata = {
    id: 'file.upload',
    name: 'File Upload',
    description: 'Uploads and indexes a file into a vector store for semantic search',
    version: '1.0.0',
    category: 'File System',
    tags: ['file', 'upload', 'index', 'vector'],
    parameters: [
      {
        name: 'filepath',
        type: 'string',
        description: 'Path to the file to upload',
        required: true
      },
      {
        name: 'filename',
        type: 'string',
        description: 'Name to use for the file (defaults to the basename of filepath)',
        required: false
      },
      {
        name: 'vectorStoreId',
        type: 'string',
        description: 'ID of the vector store to upload the file to',
        required: true
      },
      {
        name: 'chunkSize',
        type: 'number',
        description: 'Size of text chunks for indexing',
        required: false,
        default: config.defaultChunkSize || 1000
      },
      {
        name: 'chunkOverlap',
        type: 'number',
        description: 'Overlap between consecutive chunks',
        required: false,
        default: config.defaultChunkOverlap || 200
      },
      {
        name: 'metadata',
        type: 'object',
        description: 'Custom metadata to associate with the file',
        required: false
      }
    ],
    returns: {
      type: 'object',
      description: 'Upload result including file ID and metadata'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {
        vectorStoreDir: config.vectorStoreDir || './vector_stores'
      }
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.HIGH,
    capabilities: ['file.upload', 'file.index']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: FileUploadParams, context: ToolContext): Promise<FileUploadResponse> => {
      try {
        // Get the filename from the path if not provided
        const filename = params.filename || path.basename(params.filepath);
        
        // Check if file exists
        await fs.access(params.filepath);
        
        // Get file stats
        const stats = await fs.stat(params.filepath);
        
        // Determine MIME type based on extension
        const ext = path.extname(filename).toLowerCase();
        let mimeType = 'application/octet-stream'; // Default
        
        // Simple MIME type detection
        if (['.txt', '.md'].includes(ext)) mimeType = 'text/plain';
        else if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === '.html') mimeType = 'text/html';
        else if (ext === '.json') mimeType = 'application/json';
        
        // In a real implementation, this would read the file and index it in a vector database
        // For this example, we'll just simulate the process
        
        // Simulate processing time based on file size
        const processingDelay = Math.min(1000, stats.size / 1024);
        await new Promise(resolve => setTimeout(resolve, processingDelay));
        
        // Generate a file ID
        const fileId = `file_${uuidv4()}`;
        
        // Simulate chunk count based on file size and chunk parameters
        const chunkSize = params.chunkSize || 1000;
        const estimatedChunkCount = Math.ceil(stats.size / (chunkSize * 0.7)); // Rough estimate
        
        return {
          fileId,
          filename,
          vectorStoreId: params.vectorStoreId,
          chunkCount: estimatedChunkCount,
          size: stats.size,
          mimeType,
          metadata: params.metadata
        };
      } catch (error) {
        throw new Error(`File upload failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: FileUploadParams): boolean => {
      return (
        typeof params.filepath === 'string' && 
        params.filepath.trim().length > 0 &&
        typeof params.vectorStoreId === 'string' && 
        params.vectorStoreId.trim().length > 0
      );
    }
  };
};

/**
 * Create a tool for vector store management
 */
export const createVectorStoreTool = (config: FileSearchConfig = {}): Tool<VectorStoreCreateParams, VectorStore> => {
  const metadata: ToolMetadata = {
    id: 'vector.store.create',
    name: 'Create Vector Store',
    description: 'Creates a new vector store for file indexing and search',
    version: '1.0.0',
    category: 'File System',
    tags: ['vector', 'store', 'index', 'create'],
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Name of the vector store',
        required: true
      },
      {
        name: 'description',
        type: 'string',
        description: 'Description of the vector store',
        required: false
      },
      {
        name: 'embeddingModel',
        type: 'string',
        description: 'Embedding model to use for vectors',
        required: false,
        default: config.defaultEmbeddingModel || 'default'
      }
    ],
    returns: {
      type: 'object',
      description: 'The created vector store information'
    },
    protocolInfo: {
      protocol: ToolProtocol.LOCAL,
      config: {
        vectorStoreDir: config.vectorStoreDir || './vector_stores'
      }
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.HIGH,
    capabilities: ['vector.store.create']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: VectorStoreCreateParams, context: ToolContext): Promise<VectorStore> => {
      try {
        // In a real implementation, this would create a vector store
        // For this example, we'll just simulate it
        
        // Generate a vector store ID
        const id = `vector_store_${uuidv4()}`;
        
        // Get current timestamp
        const now = new Date().toISOString();
        
        // Return the simulated vector store
        return {
          id,
          name: params.name,
          description: params.description || `Vector store for ${params.name}`,
          fileCount: 0,
          totalSize: 0,
          createdAt: now,
          updatedAt: now
        };
      } catch (error) {
        throw new Error(`Vector store creation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: VectorStoreCreateParams): boolean => {
      return typeof params.name === 'string' && params.name.trim().length > 0;
    }
  };
};

/**
 * Register file search tools with the ToolsSystem
 */
export function registerFileSearchTools(config: FileSearchConfig = {}): void {
  const toolsSystem = ToolsSystem.getInstance();
  
  // Register file search tools
  toolsSystem.registerTool(createFileSearchTool(config));
  toolsSystem.registerTool(createFileUploadTool(config));
  toolsSystem.registerTool(createVectorStoreTool(config));
  
  console.log('File search tools registered successfully');
} 