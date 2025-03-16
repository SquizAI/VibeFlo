/**
 * Debug Utilities for MCP Server Errors
 * 
 * This file contains utility functions to help debug MCP server errors
 * and provide better error reporting.
 */

import { trackError, trackConsoleMessage } from './mcpBrowserTools';
import { MasterControlProgram } from './errorHandler';

/**
 * Enhanced error logging with context
 * @param error The error object or message
 * @param context Additional context about where/why the error occurred
 * @param tags Optional tags for categorizing the error
 */
export function logErrorWithContext(
  error: Error | string,
  context: Record<string, any> = {},
  tags: string[] = []
): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  // Add context and tags to the error
  const enhancedContext = {
    ...context,
    tags: tags.join(','),
    timestamp: new Date().toISOString(),
  };
  
  // Log to MCP
  MasterControlProgram.getInstance().logError(errorObj, enhancedContext);
  
  // Also track with browser tools if available
  trackError(errorObj, enhancedContext);
  
  // Log to console with a formatted message
  console.error(
    `[MCP Error] ${errorObj.message}`,
    '\nContext:', enhancedContext,
    '\nStack:', errorObj.stack
  );
}

/**
 * Log MCP server connection errors
 * @param error The error that occurred
 * @param endpoint The endpoint that was being accessed
 * @param requestData The data that was being sent (optional)
 */
export function logMCPServerError(
  error: Error | string,
  endpoint: string,
  requestData?: any
): void {
  logErrorWithContext(
    error,
    {
      type: 'server_error',
      endpoint,
      requestData: requestData ? JSON.stringify(requestData) : undefined,
      statusCode: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : undefined,
    },
    ['mcp', 'server', 'connection']
  );
}

/**
 * Log API errors with detailed information
 * @param error The error that occurred
 * @param apiName Name of the API (e.g., 'OpenAI', 'Google')
 * @param operation The operation being performed (e.g., 'transcribe', 'generate')
 * @param requestData The data that was being sent (optional)
 */
export function logAPIError(
  error: Error | string,
  apiName: string,
  operation: string,
  requestData?: any
): void {
  logErrorWithContext(
    error,
    {
      type: 'api_error',
      api: apiName,
      operation,
      requestData: requestData ? JSON.stringify(requestData) : undefined,
    },
    ['api', apiName.toLowerCase(), operation]
  );
}

/**
 * Log performance issues
 * @param operation The operation that was slow
 * @param durationMs The duration in milliseconds
 * @param threshold The threshold in milliseconds that was exceeded
 * @param details Additional details about the operation
 */
export function logPerformanceIssue(
  operation: string,
  durationMs: number,
  threshold: number,
  details: Record<string, any> = {}
): void {
  if (durationMs > threshold) {
    trackConsoleMessage(
      'warn',
      `Performance issue: ${operation} took ${durationMs}ms (threshold: ${threshold}ms)`,
      { ...details, durationMs, threshold }
    );
    
    console.warn(
      `[MCP Performance] ${operation} took ${durationMs}ms (threshold: ${threshold}ms)`,
      details
    );
  }
}

/**
 * Create a performance measurement wrapper for async functions
 * @param operationName Name of the operation being measured
 * @param thresholdMs Threshold in milliseconds before logging a performance issue
 * @returns A function that wraps another function with performance measurement
 */
export function measurePerformance<T extends (...args: any[]) => Promise<any>>(
  operationName: string,
  thresholdMs: number = 1000
) {
  return (fn: T) => {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const start = performance.now();
      try {
        const result = await fn(...args);
        const duration = performance.now() - start;
        
        logPerformanceIssue(operationName, duration, thresholdMs, {
          args: args.map(arg => 
            typeof arg === 'object' ? '[Object]' : 
            typeof arg === 'function' ? '[Function]' : 
            String(arg)
          ).join(', ')
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        logErrorWithContext(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: operationName,
            duration,
            args: args.map(arg => 
              typeof arg === 'object' ? '[Object]' : 
              typeof arg === 'function' ? '[Function]' : 
              String(arg)
            ).join(', ')
          },
          ['performance', 'error']
        );
        throw error;
      }
    };
  };
}

export default {
  logErrorWithContext,
  logMCPServerError,
  logAPIError,
  logPerformanceIssue,
  measurePerformance
}; 