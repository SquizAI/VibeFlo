/**
 * Master Control Program (MCP) Error Handler
 * A centralized error handling system that intercepts console errors,
 * logs them, and can optionally send them to a server for tracking.
 */

// Types for the error handler
interface ErrorHandlerOptions {
  logToConsole?: boolean;
  sendToServer?: boolean;
  serverEndpoint?: string;
  additionalInfo?: Record<string, any>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  location?: string;
  browserInfo?: {
    userAgent: string;
    language: string;
    platform: string;
  };
  additionalInfo?: Record<string, any>;
}

interface ErrorResponse {
  success: boolean;
  errorId?: string;
  message?: string;
}

// Singleton instance
let _instance: MasterControlProgram | null = null;

export class MasterControlProgram {
  private options: ErrorHandlerOptions;
  private originalConsoleError: (...data: any[]) => void;
  private originalWindowOnError: OnErrorEventHandler | null;
  private originalWindowOnUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null;
  
  private constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      logToConsole: true,
      sendToServer: false,
      serverEndpoint: '/api/errors',
      ...options
    };
    
    // Store original console.error
    this.originalConsoleError = console.error;
    
    // Store original window.onerror
    this.originalWindowOnError = window.onerror;
    
    // Store original window.onunhandledrejection
    this.originalWindowOnUnhandledRejection = window.onunhandledrejection;
    
    // Initialize the error handlers
    this.initializeErrorHandlers();
  }
  
  /**
   * Get the singleton instance of MasterControlProgram
   */
  public static getInstance(options?: ErrorHandlerOptions): MasterControlProgram {
    if (!_instance) {
      _instance = new MasterControlProgram(options);
    }
    return _instance;
  }
  
  /**
   * Initialize all error handlers
   */
  private initializeErrorHandlers(): void {
    this.overrideConsoleError();
    this.setupWindowErrorHandler();
    this.setupPromiseRejectionHandler();
  }
  
  /**
   * Override the console.error method
   */
  private overrideConsoleError(): void {
    console.error = (...args: any[]) => {
      // Create an error info object
      const errorInfo: ErrorInfo = this.createErrorInfo(args[0]);
      
      // Call the original console.error if needed
      if (this.options.logToConsole) {
        this.originalConsoleError.apply(console, args);
      }
      
      // Handle the error
      this.handleError(args[0], errorInfo);
    };
  }
  
  /**
   * Set up window.onerror handler
   */
  private setupWindowErrorHandler(): void {
    window.onerror = (message, source, lineno, colno, error) => {
      const errorInfo: ErrorInfo = this.createErrorInfo(error || new Error(String(message)), {
        location: `${source}:${lineno}:${colno}`
      });
      
      // Handle the error
      this.handleError(error || new Error(String(message)), errorInfo);
      
      // Call the original handler if it exists
      if (this.originalWindowOnError) {
        return this.originalWindowOnError(message, source, lineno, colno, error);
      }
      
      return false;
    };
  }
  
  /**
   * Set up handler for unhandled promise rejections
   */
  private setupPromiseRejectionHandler(): void {
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      const errorInfo: ErrorInfo = this.createErrorInfo(error, {
        type: 'unhandledRejection'
      });
      
      // Handle the error
      this.handleError(error, errorInfo);
      
      // Call the original handler if it exists
      if (this.originalWindowOnUnhandledRejection) {
        this.originalWindowOnUnhandledRejection(event);
      }
    };
  }
  
  /**
   * Create a standardized error info object
   */
  private createErrorInfo(error: any, additionalData: Record<string, any> = {}): ErrorInfo {
    // Convert non-Error objects to Error objects
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    return {
      message: errorObj.message,
      stack: errorObj.stack,
      timestamp: Date.now(),
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      },
      additionalInfo: {
        ...this.options.additionalInfo,
        ...additionalData
      }
    };
  }
  
  /**
   * Handle an error by logging it and/or sending it to the server
   */
  private handleError(error: Error, errorInfo: ErrorInfo): void {
    // Call the onError callback if provided
    if (this.options.onError) {
      try {
        this.options.onError(error, errorInfo);
      } catch (callbackError) {
        this.originalConsoleError('Error in error handler callback:', callbackError);
      }
    }
    
    // Send the error to the server if enabled
    if (this.options.sendToServer) {
      this.sendErrorToServer(errorInfo)
        .catch(sendError => {
          this.originalConsoleError('Failed to send error to server:', sendError);
        });
    }
  }
  
  /**
   * Send an error to the server
   */
  private async sendErrorToServer(errorInfo: ErrorInfo): Promise<ErrorResponse> {
    try {
      const response = await fetch(this.options.serverEndpoint || '/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorInfo)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Log an error manually
   */
  public logError(error: Error | string, additionalInfo?: Record<string, any>): void {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorInfo = this.createErrorInfo(errorObj, additionalInfo);
    
    this.handleError(errorObj, errorInfo);
  }
  
  /**
   * Clean up by restoring original handlers
   */
  public cleanup(): void {
    console.error = this.originalConsoleError;
    window.onerror = this.originalWindowOnError;
    window.onunhandledrejection = this.originalWindowOnUnhandledRejection;
  }
  
  /**
   * Update the options
   */
  public updateOptions(options: Partial<ErrorHandlerOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }
}

// Helper function to initialize the error handler
export function initializeMCP(options?: ErrorHandlerOptions): MasterControlProgram {
  return MasterControlProgram.getInstance(options);
}

export default MasterControlProgram; 