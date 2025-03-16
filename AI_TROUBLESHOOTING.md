# AI Features Troubleshooting Guide

This document provides solutions for common issues with the AI-powered features in the Project Manager application, including voice dictation and AI analysis.

## API Authentication Issues

The most common issues with AI features are related to API authentication:

### 401 Unauthorized Errors

If you see errors like:
- "401 Incorrect API key provided: your_ope************here"
- "401 Unauthorized" with "INVALID_AUTH" and "Invalid credentials"

**Solution:**
1. Open your `.env.local` file
2. Replace the placeholder API keys with your actual keys:
   ```
   VITE_OPENAI_API_KEY=your_actual_openai_key_here
   VITE_DEEPGRAM_API_KEY=your_actual_deepgram_key_here
   VITE_GOOGLE_AI_API_KEY=your_actual_google_ai_key_here
   ```
3. Ensure there are no extra spaces or quotes around the keys
4. Restart the application (stop and run `npm run dev` again)

### Obtaining Valid API Keys

1. **OpenAI API Key**:
   - Sign up/login at [OpenAI Platform](https://platform.openai.com/)
   - Navigate to API Keys section
   - Create a new API key
   - Make sure your account has credits or a valid payment method

2. **Deepgram API Key**:
   - Create an account at [Deepgram Console](https://console.deepgram.com/)
   - Create a new project
   - Generate a new API key with "Speech Recognition" permission
   - Choose the key type "Admin" for full access

3. **Google AI API Key** (for enhanced features):
   - Sign up at [Google AI Studio](https://ai.google.dev/)
   - Navigate to API Keys section
   - Create a new API key

## Voice Dictation Issues

### Microphone Not Working

If the microphone isn't recording:

1. Check browser permissions:
   - Click the lock/info icon in your browser's address bar
   - Ensure microphone access is allowed for the site
   
2. Verify microphone hardware:
   - Test your microphone in another application
   - Check if your microphone is selected as the default input device

3. Check browser compatibility:
   - Use Chrome, Edge, or Firefox for best compatibility
   - Safari has limited support for some audio features

### Transcription Problems

If recording works but transcription fails:

1. Check console for specific API errors
2. Verify your Deepgram API key is valid and has sufficient credits
3. Ensure you're speaking clearly and your microphone is picking up audio
4. Try recording in a quieter environment

## AI Analysis Issues

If AI analysis features aren't working:

1. Verify OpenAI API key is correct and has available credits
2. Check the browser console for specific error messages
3. Ensure you have a stable internet connection
4. Try with shorter text first to test functionality

### Rate Limit Errors

If you encounter rate limit errors:

1. Wait a few minutes before trying again
2. Consider upgrading your API plan if you're using the service frequently
3. Implement a retry mechanism or queue if you're doing batch processing

## Testing Your Configuration

To verify your API keys are working:

1. Open your browser's developer tools (F12)
2. Navigate to the Network tab
3. Attempt to use the voice dictation or AI analysis feature
4. Look for API calls to OpenAI or Deepgram
5. Check that the status code is 200 (success) and not an error code

## Environment Variables Not Loading

If your API keys are set correctly but still not working:

1. Make sure your `.env.local` file is in the project root directory
2. Verify that variable names match exactly (VITE_OPENAI_API_KEY, etc.)
3. Restart your development server completely
4. Check that environment variables are being loaded in the build process

## Code-Level Debugging

For developers looking to debug at the code level:

1. Check the implementation in:
   - `/src/components/Canvas.tsx` - Contains dictation handling
   - `/src/lib/api.ts` - Contains API integration logic

2. Add console logs to track the flow of API calls:
   ```typescript
   console.log('API Key:', import.meta.env.VITE_OPENAI_API_KEY.substring(0, 5) + '...');
   console.log('Making API call to:', endpoint);
   ```

3. Use the browser's Network tab to inspect API requests and responses

## Common Error Codes and Solutions

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 401        | Unauthorized | Update API key |
| 403        | Forbidden | Check API key permissions |
| 429        | Too Many Requests | Rate limited, wait and retry |
| 500        | Server Error | Issue with the API provider, try later |

## Still Having Issues?

If you've tried all the solutions above and are still experiencing problems:

1. Check the API provider's status page for outages
2. Look for recent changes to the API documentation
3. File an issue on the project's GitHub repository
4. Try alternative API providers (e.g., Whisper API instead of Deepgram) 