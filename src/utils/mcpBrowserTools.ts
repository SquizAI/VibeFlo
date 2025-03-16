import { MasterControlProgram } from './errorHandler';

// Define types for browser tools
import type {
  ConsoleMessage,
  NetworkRequest,
  UIOptions,
  FilterFunctions,
  BrowserToolsOptions,
  BrowserToolsInstance
} from '../types/agentdeskai__browser-tools-mcp';

// Store the browser tools instance
let browserToolsInstance: BrowserToolsInstance | null = null;

/**
 * Initialize and connect MCP Browser Tools with our error handler
 * @param options Configuration options for MCP Browser Tools
 * @returns The BrowserToolsInstance
 */
export function initializeMCPBrowserTools(
  options: BrowserToolsOptions = {}
): BrowserToolsInstance | null {
  if (browserToolsInstance) {
    return browserToolsInstance;
  }

  try {
    // Dynamically import the MCP browser tools
    // This is safer than static imports which might break if the package isn't compatible
    const mcpBrowserTools = (window as any).__BROWSER_TOOLS_MCP__;
    
    if (!mcpBrowserTools || typeof mcpBrowserTools.initializeBrowserTools !== 'function') {
      console.warn('MCP Browser Tools not available in window. Make sure to install the Chrome extension.');
      return null;
    }
  
    // Default options
    const defaultOptions: BrowserToolsOptions = {
      captureConsoleErrors: true,
      captureNetworkErrors: true,
      trackConsoleMessages: true,
      trackNetworkRequests: true,
      maxLogEntries: 100,
      filterFunctions: {
        // Optional custom filters for console messages
        consoleFilter: (message: ConsoleMessage) => {
          // Ignore some noisy messages if needed
          if (message.content.includes('[HMR]') || 
              message.content.includes('[vite]') ||
              message.content.includes('some-ignorable-text')) {
            return false;
          }
          return true;
        },
        // Optional custom filter for network requests
        networkFilter: (request: NetworkRequest) => {
          // Ignore some specific requests if needed
          if (request.url.includes('analytics') || request.url.includes('tracking')) {
            return false;
          }
          return true;
        }
      },
      ...options
    };
  
    // Initialize browser tools
    browserToolsInstance = mcpBrowserTools.initializeBrowserTools(defaultOptions);
    
    // Get MCP instance and connect
    const mcp = MasterControlProgram.getInstance();
    
    // Connect MCP and browser tools
    browserToolsInstance.onError((error: Error, info: Record<string, any>) => {
      mcp.logError(error, {
        source: 'mcp-browser-tools',
        browserInfo: info
      });
    });
    
    // Add browser tools panel if in development
    if (import.meta.env.DEV) {
      browserToolsInstance.injectUI({
        position: 'bottom-right',
        theme: 'dark',
        initiallyOpen: false,
        shortcutKey: 'F2'
      });
    }
    
    console.log('✅ MCP Browser Tools initialized successfully');
    
    // Return the instance for any further configuration
    return browserToolsInstance;
  } catch (error) {
    console.error('Failed to initialize MCP Browser Tools:', error);
    return null;
  }
}

/**
 * Get the browser tools instance if already initialized
 */
export function getBrowserToolsInstance(): BrowserToolsInstance | null {
  return browserToolsInstance;
}

/**
 * Manually track an error using browser tools
 */
export function trackError(error: Error, additionalInfo?: Record<string, any>): void {
  if (browserToolsInstance) {
    try {
      browserToolsInstance.trackError(error, additionalInfo);
    } catch (e) {
      console.error('Error tracking with browser tools:', e);
    }
  } else {
    // Fallback to console if browser tools not available
    console.error('Error tracked (no browser tools):', error, additionalInfo);
  }
}

/**
 * Manually track a console message
 */
export function trackConsoleMessage(
  level: 'log' | 'info' | 'warn' | 'error', 
  message: string,
  data?: any
): void {
  if (browserToolsInstance) {
    try {
      browserToolsInstance.trackConsoleMessage(level, message, data);
    } catch (e) {
      console.error('Error logging message with browser tools:', e);
    }
  } else {
    // Fallback to console if browser tools not available
    console[level]('Message tracked (no browser tools):', message, data);
  }
}

/**
 * Clear all logs in the browser tools
 */
export function clearLogs(): void {
  if (browserToolsInstance) {
    try {
      browserToolsInstance.clearLogs();
    } catch (e) {
      console.error('Error clearing logs with browser tools:', e);
    }
  }
}

// Export the module for direct use
export default { 
  initializeMCPBrowserTools,
  getBrowserToolsInstance,
  trackError,
  trackConsoleMessage,
  clearLogs
}; 