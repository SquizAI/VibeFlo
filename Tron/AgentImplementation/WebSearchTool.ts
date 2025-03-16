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
 * Types for web search tools
 */

export interface WebSearchParams {
  query: string;
  contextSize?: 'low' | 'medium' | 'high';
  userLocation?: {
    country?: string;  // ISO country code (e.g., 'US')
    city?: string;     // City name (e.g., 'San Francisco')
    region?: string;   // Region/state (e.g., 'California')
    timezone?: string; // IANA timezone (e.g., 'America/Los_Angeles')
  };
  numResults?: number;
  safeSearch?: boolean;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source?: string;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  totalResults: number;
  searchId: string;
  executionTime: number;
}

/**
 * Configuration for web search
 */
export interface WebSearchConfig {
  apiKey?: string;
  apiEndpoint?: string;
  defaultContextSize?: 'low' | 'medium' | 'high';
  defaultNumResults?: number;
  defaultSafeSearch?: boolean;
  timeout?: number;
}

/**
 * Create a tool for web search
 */
export const createWebSearchTool = (config: WebSearchConfig = {}): Tool<WebSearchParams, WebSearchResponse> => {
  const metadata: ToolMetadata = {
    id: 'web.search',
    name: 'Web Search',
    description: 'Searches the web for current information on a given query',
    version: '1.0.0',
    category: 'Web',
    tags: ['web', 'search', 'internet', 'information'],
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The search query to look up on the web',
        required: true
      },
      {
        name: 'contextSize',
        type: 'string',
        description: 'Amount of context to retrieve: "low" (fastest, least info), "medium" (default), or "high" (most comprehensive)',
        required: false,
        default: config.defaultContextSize || 'medium',
        enum: ['low', 'medium', 'high']
      },
      {
        name: 'userLocation',
        type: 'object',
        description: 'User location information to contextualize search results',
        required: false
      },
      {
        name: 'numResults',
        type: 'number',
        description: 'Maximum number of search results to return',
        required: false,
        default: config.defaultNumResults || 5
      },
      {
        name: 'safeSearch',
        type: 'boolean',
        description: 'Whether to filter explicit content',
        required: false,
        default: config.defaultSafeSearch !== undefined ? config.defaultSafeSearch : true
      }
    ],
    returns: {
      type: 'object',
      description: 'Search results and metadata'
    },
    protocolInfo: {
      protocol: ToolProtocol.HTTP,
      config: {
        endpoint: config.apiEndpoint || 'https://api.search.service/v1/search'
      }
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.LOW,
    timeout: config.timeout || 30000,
    capabilities: ['web.search', 'knowledge.recent']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: WebSearchParams, context: ToolContext): Promise<WebSearchResponse> => {
      try {
        // Record start time for execution timing
        const startTime = Date.now();
        
        // In a real implementation, this would use a search API
        // For this example, we'll simulate search results
        const simulatedSearchDelay = params.contextSize === 'high' ? 2000 : 
                                     params.contextSize === 'medium' ? 1000 : 500;
        
        // Simulate network request delay
        await new Promise(resolve => setTimeout(resolve, simulatedSearchDelay));
        
        // Number of results based on context size
        const resultCount = params.contextSize === 'high' ? 10 : 
                            params.contextSize === 'medium' ? 5 : 3;
        
        // Limit to requested number if specified
        const limitedCount = params.numResults ? Math.min(params.numResults, resultCount) : resultCount;
        
        // Generate simulated results
        // In a real implementation, this would call an actual search API
        const results: WebSearchResult[] = [];
        for (let i = 0; i < limitedCount; i++) {
          results.push({
            title: `Search Result for "${params.query}" #${i+1}`,
            url: `https://example.com/result-${i+1}`,
            snippet: `This is a simulated search result snippet for the query "${params.query}". It would contain relevant information from the web.`,
            publishedDate: new Date().toISOString(),
            source: 'Example Search Engine'
          });
        }
        
        // Log user location if provided (in a real implementation, this would be sent to the search API)
        if (params.userLocation) {
          console.log(`Search location context: ${JSON.stringify(params.userLocation)}`);
        }
        
        // Generate response
        return {
          results,
          totalResults: resultCount * 10, // Simulated total available results
          searchId: uuidv4(),
          executionTime: Date.now() - startTime
        };
      } catch (error) {
        throw new Error(`Web search failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: WebSearchParams): boolean => {
      return typeof params.query === 'string' && params.query.trim().length > 0;
    }
  };
};

/**
 * Create a tool for web content retrieval
 */
export const createWebContentTool = (config: WebSearchConfig = {}): Tool<{ url: string }, string> => {
  const metadata: ToolMetadata = {
    id: 'web.content',
    name: 'Web Content Retrieval',
    description: 'Retrieves and extracts content from a specified URL',
    version: '1.0.0',
    category: 'Web',
    tags: ['web', 'content', 'scraping'],
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'The URL to retrieve content from',
        required: true
      }
    ],
    returns: {
      type: 'string',
      description: 'The extracted text content from the webpage'
    },
    protocolInfo: {
      protocol: ToolProtocol.HTTP,
      config: {}
    },
    requiresAuth: true,
    minSecurityLevel: SecurityLevel.MEDIUM,
    timeout: config.timeout || 30000,
    capabilities: ['web.content', 'knowledge.recent']
  };

  return {
    metadata,
    initialized: true,
    execute: async (params: { url: string }, context: ToolContext): Promise<string> => {
      try {
        // In a real implementation, this would make an HTTP request and extract content
        // For this example, we'll simulate content retrieval
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Return simulated content
        return `
This is simulated web content from ${params.url}.

The content would be extracted from the actual webpage and returned as clean text.
It would include relevant information from the page while removing navigation elements,
advertisements, and other non-content elements.

In a real implementation, this would use a proper HTML parser and content extraction algorithm.
        `.trim();
      } catch (error) {
        throw new Error(`Web content retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (params: { url: string }): boolean => {
      return typeof params.url === 'string' && params.url.trim().length > 0;
    }
  };
};

/**
 * Register web search tools with the ToolsSystem
 */
export function registerWebSearchTools(config: WebSearchConfig = {}): void {
  const toolsSystem = ToolsSystem.getInstance();
  
  // Register web search tools
  toolsSystem.registerTool(createWebSearchTool(config));
  toolsSystem.registerTool(createWebContentTool(config));
  
  console.log('Web search tools registered successfully');
} 