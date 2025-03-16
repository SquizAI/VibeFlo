declare module '@agentdeskai/browser-tools-mcp' {
  export interface ConsoleMessage {
    level: 'log' | 'info' | 'warn' | 'error';
    content: string;
    timestamp: number;
    data?: any;
  }

  export interface NetworkRequest {
    url: string;
    method: string;
    status?: number;
    statusText?: string;
    type: string;
    timestamp: number;
    duration?: number;
    size?: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    error?: Error;
  }

  export interface UIOptions {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    theme?: 'dark' | 'light';
    initiallyOpen?: boolean;
    shortcutKey?: string;
  }

  export interface FilterFunctions {
    consoleFilter?: (message: ConsoleMessage) => boolean;
    networkFilter?: (request: NetworkRequest) => boolean;
  }

  export interface BrowserToolsOptions {
    captureConsoleErrors?: boolean;
    captureNetworkErrors?: boolean;
    trackConsoleMessages?: boolean;
    trackNetworkRequests?: boolean;
    maxLogEntries?: number;
    filterFunctions?: FilterFunctions;
  }

  export interface BrowserToolsInstance {
    trackError: (error: Error, additionalInfo?: Record<string, any>) => void;
    trackConsoleMessage: (level: 'log' | 'info' | 'warn' | 'error', message: string, data?: any) => void;
    clearLogs: () => void;
    injectUI: (options?: UIOptions) => void;
    removeUI: () => void;
    onError: (callback: (error: Error, info: Record<string, any>) => void) => void;
    getConsoleMessages: () => ConsoleMessage[];
    getNetworkRequests: () => NetworkRequest[];
  }

  export function initializeBrowserTools(options?: BrowserToolsOptions): BrowserToolsInstance;
}

// Also export these types directly for local imports
export interface ConsoleMessage {
  level: 'log' | 'info' | 'warn' | 'error';
  content: string;
  timestamp: number;
  data?: any;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  type: string;
  timestamp: number;
  duration?: number;
  size?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  error?: Error;
}

export interface UIOptions {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'dark' | 'light';
  initiallyOpen?: boolean;
  shortcutKey?: string;
}

export interface FilterFunctions {
  consoleFilter?: (message: ConsoleMessage) => boolean;
  networkFilter?: (request: NetworkRequest) => boolean;
}

export interface BrowserToolsOptions {
  captureConsoleErrors?: boolean;
  captureNetworkErrors?: boolean;
  trackConsoleMessages?: boolean;
  trackNetworkRequests?: boolean;
  maxLogEntries?: number;
  filterFunctions?: FilterFunctions;
}

export interface BrowserToolsInstance {
  trackError: (error: Error, additionalInfo?: Record<string, any>) => void;
  trackConsoleMessage: (level: 'log' | 'info' | 'warn' | 'error', message: string, data?: any) => void;
  clearLogs: () => void;
  injectUI: (options?: UIOptions) => void;
  removeUI: () => void;
  onError: (callback: (error: Error, info: Record<string, any>) => void) => void;
  getConsoleMessages: () => ConsoleMessage[];
  getNetworkRequests: () => NetworkRequest[];
} 