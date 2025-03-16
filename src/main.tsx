import React from 'react'
import ReactDOM from 'react-dom/client'
// Import polyfill first to ensure it's available before other imports
import './polyfills/process'

import App from './App.tsx'
import './index.css'
import './styles.css'
import { initializeMCP } from './utils/errorHandler'
import { initializeMCPBrowserTools } from './utils/mcpBrowserTools'
import type { ConsoleMessage } from './types/agentdeskai__browser-tools-mcp'

// Initialize the Master Control Program for error handling
const mcp = initializeMCP({
  logToConsole: true,
  sendToServer: false, // Set to true when you have a server endpoint
  // serverEndpoint: '/api/errors',
  additionalInfo: {
    appVersion: '1.0.0',
    environment: import.meta.env.MODE
  },
  onError: (error, errorInfo) => {
    // Custom error handling logic
    console.log('Error handled by MCP:', errorInfo.message)
  }
})

// Initialize MCP Browser Tools for enhanced debugging, but don't fail if unavailable
if (import.meta.env.DEV) {
  // Wait for dom to be ready
  setTimeout(() => {
    try {
      initializeMCPBrowserTools({
        captureConsoleErrors: true,
        captureNetworkErrors: true,
        trackConsoleMessages: true,
        trackNetworkRequests: true,
        maxLogEntries: 200,
        filterFunctions: {
          // Filter out noisy messages
          consoleFilter: (message: ConsoleMessage) => {
            if (message?.content?.includes('[HMR]') || 
                message?.content?.includes('[vite]') ||
                message?.content?.includes('webpack-dev-server')) {
              return false;
            }
            return true;
          }
        }
      });
      console.log('Browser tools MCP initialized - check the Chrome extension is installed');
    } catch (error) {
      console.warn('MCP Browser Tools could not be initialized. This is not critical - continue using the app normally.');
      console.warn('Error details:', error);
    }
  }, 500);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
