import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Create OpenAI client with API key
// Note: For production, the API key should be stored in environment variables
export const openai = new OpenAI({
  dangerouslyAllowBrowser: true,
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'your_openai_api_key_here',
});

// Initialize Google Generative AI with Gemini 1.5 Flash model
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY || 'your_google_ai_api_key_here');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Deepgram API key for speech-to-text
const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY || 'your_deepgram_api_key_here';

/**
 * Extracts tasks from text and determines if it should be a new note or appended
 * Using GPT-4o for improved accuracy and efficiency
 */
export async function extractTasksFromText(text: string) {
  try {
    // First, determine if this should be a new note or added to an existing one
    const intentCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Analyze the text and determine if it should be a new note or added to an existing note. Return JSON with "action": "new" or "append", and "reason" explaining why.',
        },
        { role: 'user', content: text },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
    });

    const intent = JSON.parse(intentCompletion.choices[0].message.content!);

    // Extract tasks regardless of intent
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Extract tasks from the following text and return them as a JSON array of tasks with "text" and "done" properties.',
        },
        { role: 'user', content: text },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
    });

    return {
      tasks: JSON.parse(completion.choices[0].message.content!).tasks,
      intent: intent.action,
      reason: intent.reason
    };
  } catch (error) {
    console.error('Error in extractTasksFromText:', error);
    throw new Error('Failed to extract tasks from text');
  }
}

/**
 * Advanced task categorization to group similar tasks together
 * Used to identify when tasks should be split into different notes
 */
export async function categorizeTasksAndSuggestNotes(text: string): Promise<{
  tasks: Array<{ text: string; done: boolean; category: string; id?: string }>;
  noteGroups: Array<{ title: string; category: string; taskIndices: number[] }>;
  reasoning: string;
}> {
  try {
    // First extract all tasks from the text
    const completionResult = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Analyze the user's dictation/notes and extract:
1. Tasks that need to be done, with each task having a "text" property and "done" set to false.
2. Categorize each task into logical groups by their purpose, project, or context.
3. Suggest how many separate notes these tasks should be split into.

BE AGGRESSIVE WITH CATEGORIZATION. If tasks appear to belong to different contexts or domains, split them into separate notes even if there are only a few tasks per category. Look for keywords indicating task type, project names, work vs personal, etc.

Return JSON with:
- "tasks": Array of task objects with "text", "done", and "category" properties
- "noteGroups": Array of note groups, each with "title", "category" and "taskIndices" (indices of tasks that belong in this group)
- "reasoning": Brief explanation of why you split the tasks this way

Even if there are just a few mentions that indicate different categories (like "for work", "for home", "shopping", "fitness"), create separate note groups.`,
        },
        { role: 'user', content: text },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.2, // Lower temperature for more consistent categorization
    });

    const result = JSON.parse(completionResult.choices[0].message.content!);
    
    // Make sure we always have at least one note group
    if (!result.noteGroups || result.noteGroups.length === 0) {
      result.noteGroups = [{
        title: 'Tasks',
        category: 'general',
        taskIndices: result.tasks.map((_: any, i: number) => i)
      }];
    }
    
    // Ensure all tasks have valid categories
    result.tasks = result.tasks.map((task: any) => ({
      ...task,
      category: task.category || 'general',
      done: false
    }));
    
    return result;
  } catch (error) {
    console.error('Error in categorizeTasksAndSuggestNotes:', error);
    // Fallback to basic task extraction if advanced categorization fails
    const basicResult = await extractTasksFromText(text);
    return {
      tasks: basicResult.tasks.map((task: any) => ({...task, category: 'general'})),
      noteGroups: [{
        title: 'Tasks',
        category: 'general',
        taskIndices: basicResult.tasks.map((_: any, index: number) => index)
      }],
      reasoning: 'Using basic task extraction as fallback'
    };
  }
}

/**
 * Generate a project summary from a collection of notes
 * Using Gemini 1.5 Flash for improved performance
 */
export async function generateProjectSummary(notes: string[]) {
  try {
    const result = await geminiModel.generateContent({
      contents: [{ 
        role: 'user',
        parts: [{ text: `Analyze these notes and create a project summary:\n${notes.join('\n')}` }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
      }
    });
    
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error in generateProjectSummary:', error);
    throw new Error('Failed to generate project summary');
  }
}

/**
 * Transcribe audio using Deepgram's Nova-3 model for superior accuracy
 * Falls back to browser's transcription if Deepgram fails
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    // Check if we have a valid API key - don't even try the request if we don't
    if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === 'your_deepgram_api_key_here') {
      console.warn('No Deepgram API key provided, skipping Deepgram transcription');
      return ""; // Return empty string to trigger fallback
    }
    
    const arrayBuffer = await audioBlob.arrayBuffer();
    // Using Nova-3 model with additional features like smart formatting & punctuation
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      // Log detailed error for troubleshooting
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error('Deepgram API error details:', errorData);
        if (errorData.error) {
          errorMessage += `: ${errorData.error}`;
        }
      } catch (e) {
        // Failed to parse error JSON, continue with basic error
      }
      
      console.error('Deepgram API error:', errorMessage);
      
      // If we got a 401 error, the API key is invalid
      if (response.status === 401) {
        console.error('Invalid Deepgram API key. Please check your API key in the environment variables.');
      }
      
      return ""; // Return empty string to trigger fallback
    }

    const result = await response.json();
    return result.results?.channels[0]?.alternatives[0]?.transcript || '';
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    return ""; // Return empty string to trigger fallback
  }
}

/**
 * Extract key terms from a collection of notes to improve transcription accuracy
 * Leverages Nova-3's self-serve customization with key term prompting
 */
export async function extractKeyTerms(notes: string[]): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Extract important domain-specific terms, jargon, product names, or technical vocabulary from these notes. Return only a JSON array of strings with the extracted terms. Limit to 50 terms maximum.',
        },
        { role: 'user', content: notes.join('\n') },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
    });

    const keyTermsData = JSON.parse(completion.choices[0].message.content!);
    return keyTermsData.terms || [];
  } catch (error) {
    console.error('Error in extractKeyTerms:', error);
    return [];
  }
}

/**
 * Enhanced transcription with key term prompting
 * Leverages Nova-3's self-serve customization capability
 */
export async function transcribeAudioWithKeyTerms(audioBlob: Blob, keyTerms: string[]): Promise<string> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const keyTermsParam = keyTerms.length > 0 
      ? `&keyterms=${encodeURIComponent(JSON.stringify(keyTerms))}` 
      : '';
      
    const response = await fetch(`https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true${keyTermsParam}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Deepgram API error:', errorData);
      throw new Error(`Failed to transcribe audio with key terms: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.results?.channels[0]?.alternatives[0]?.transcript || '';
  } catch (error) {
    console.error('Error in transcribeAudioWithKeyTerms:', error);
    throw new Error('Failed to transcribe audio with key terms');
  }
}

/**
 * Suggest tasks based on existing tasks and their categories
 * @param existingTasks Array of existing tasks with text and category
 * @param categories Array of categories to generate suggestions for
 * @returns Promise with suggested tasks organized by category
 */
export async function suggestTasks(
  existingTasks: Array<{ text: string; category: string }>,
  categories: string[]
): Promise<{ [category: string]: Array<{ text: string; done: boolean }> }> {
  try {
    // Prepare the list of existing tasks by category
    const tasksByCategory: { [key: string]: string[] } = {};
    
    existingTasks.forEach(task => {
      if (!tasksByCategory[task.category]) {
        tasksByCategory[task.category] = [];
      }
      tasksByCategory[task.category].push(task.text);
    });
    
    // Create prompt content with existing tasks
    let promptContent = "Based on the following existing tasks, suggest 2-3 new related tasks for each category:\n\n";
    
    categories.forEach(category => {
      promptContent += `Category: ${category}\n`;
      const categoryTasks = tasksByCategory[category] || [];
      if (categoryTasks.length > 0) {
        promptContent += "Existing tasks:\n";
        categoryTasks.forEach(task => promptContent += `- ${task}\n`);
      } else {
        promptContent += "No existing tasks yet.\n";
      }
      promptContent += "\n";
    });
    
    // Make OpenAI API call to generate suggestions
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a task suggestion assistant. Generate practical, specific task suggestions based on existing tasks. Tasks should be actionable, concise, and directly relevant to the category. Your response should be a JSON object with categories as keys and arrays of task objects as values. Each task object should have "text" and "done" properties.',
        },
        { role: 'user', content: promptContent },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.7, // Slightly higher temperature for creative suggestions
    });

    const suggestedTasks = JSON.parse(completion.choices[0].message.content!);
    
    // Ensure proper format for all categories
    categories.forEach(category => {
      if (!suggestedTasks[category]) {
        suggestedTasks[category] = [];
      }
      
      // Ensure each task has the required properties
      suggestedTasks[category] = suggestedTasks[category].map((task: any) => ({
        text: typeof task === 'string' ? task : task.text || 'Undefined task',
        done: false
      }));
    });
    
    return suggestedTasks;
  } catch (error) {
    console.error('Error in suggestTasks:', error);
    
    // Return empty suggestions on error
    const emptySuggestions: { [category: string]: Array<{ text: string; done: boolean }> } = {};
    categories.forEach(category => {
      emptySuggestions[category] = [];
    });
    
    return emptySuggestions;
  }
}

/**
 * Enhance transcribed text to make it more natural using GPT-4o
 */
export async function enhanceTranscribedText(text: string): Promise<string> {
  try {
    if (!text || text.trim().length === 0) {
      return text;
    }
    
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a dictation enhancement assistant. Your job is to:
1. Fix grammar, punctuation, and capitalization in the transcribed text
2. Make the text flow naturally while maintaining all original meaning
3. Properly format lists, paragraphs, and sections
4. Keep all key information intact
5. DO NOT add new concepts or remove important details

The output should be the enhanced version of the transcribed text only, with no explanations or comments.`
        },
        { role: 'user', content: text }
      ],
      model: 'gpt-4o',
      temperature: 0.3, // Low temperature for more consistent results
      max_tokens: 1000
    });

    return completion.choices[0].message.content || text;
  } catch (error) {
    console.error('Error enhancing transcribed text:', error);
    // Return original text if enhancement fails
    return text;
  }
}