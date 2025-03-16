import OpenAI from 'openai';

// Get the API key from environment
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Check if it's a project API key (starts with sk-proj-)
const isProjectKey = apiKey && typeof apiKey === 'string' && apiKey.startsWith('sk-proj-');

// Initialize the OpenAI client
export const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Only use this in development - in production, use server-side API calls
});

// Helper function to validate API key before making calls
export const validateApiKey = (): { valid: boolean, message: string } => {
  if (!apiKey) {
    return { 
      valid: false, 
      message: 'No OpenAI API key found. Please add VITE_OPENAI_API_KEY to your .env file.' 
    };
  }
  
  if (apiKey === 'your_openai_api_key_here') {
    return { 
      valid: false, 
      message: 'Default API key found. Please replace with your actual OpenAI API key.' 
    };
  }
  
  if (isProjectKey) {
    return { 
      valid: false, 
      message: "Project API keys (starting with sk-proj-) must be used with server-side requests or OpenAI's client libraries. Consider using a standard API key or implementing a proxy server."
    };
  }
  
  return { valid: true, message: 'API key appears valid.' };
}; 