/**
 * Type definitions for the MCP Browser Tools
 */

// Console message structure
export interface ConsoleMessage {
  id: string;
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error';
  content: string;
  data?: any;
  source?: string;
}

// Network request structure
export interface NetworkRequest {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  duration?: number;
  size?: number;
  type?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  error?: Error;
}

// UI options for the browser tools panel
export interface UIOptions {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme?: 'light' | 'dark' | 'system';
  initiallyOpen?: boolean;
  shortcutKey?: string;
  width?: number;
  height?: number;
}

// Filter functions for console and network logs
export interface FilterFunctions {
  consoleFilter?: (message: ConsoleMessage) => boolean;
  networkFilter?: (request: NetworkRequest) => boolean;
}

// Options for initializing browser tools
export interface BrowserToolsOptions {
  captureConsoleErrors?: boolean;
  captureNetworkErrors?: boolean;
  trackConsoleMessages?: boolean;
  trackNetworkRequests?: boolean;
  maxLogEntries?: number;
  filterFunctions?: FilterFunctions;
}

// Browser tools instance interface
export interface BrowserToolsInstance {
  // Core methods
  trackError: (error: Error, additionalInfo?: Record<string, any>) => void;
  trackConsoleMessage: (level: 'log' | 'info' | 'warn' | 'error', message: string, data?: any) => void;
  trackNetworkRequest: (request: Partial<NetworkRequest>) => void;
  clearLogs: () => void;
  
  // Event handlers
  onError: (callback: (error: Error, info: Record<string, any>) => void) => void;
  onConsoleMessage: (callback: (message: ConsoleMessage) => void) => void;
  onNetworkRequest: (callback: (request: NetworkRequest) => void) => void;
  
  // UI methods
  injectUI: (options?: UIOptions) => void;
  removeUI: () => void;
  
  // Configuration
  updateOptions: (options: Partial<BrowserToolsOptions>) => void;
  
  // State
  isInitialized: () => boolean;
  getConsoleMessages: () => ConsoleMessage[];
  getNetworkRequests: () => NetworkRequest[];
}

// Declare global window interface extension
declare global {
  interface Window {
    __BROWSER_TOOLS_MCP__?: {
      initializeBrowserTools: (options?: BrowserToolsOptions) => BrowserToolsInstance;
    };
  }
} 