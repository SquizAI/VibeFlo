/**
 * Simple process polyfill for browser environment
 * This is needed because the browser-tools-mcp package uses Node.js process
 * but doesn't properly polyfill it for browser environments
 */

// Create a minimal process object that the library might need
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {
      NODE_ENV: import.meta.env.MODE,
      // Add other environment variables that might be needed
      BROWSER: true
    },
    browser: true,
    version: [], // Browsers don't have a Node.js version
    platform: navigator.platform,
    cwd: () => '/',
    nextTick: (fn: Function) => setTimeout(fn, 0)
  };
}

export default {}; 