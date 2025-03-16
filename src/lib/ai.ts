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
 * Cleans grocery item text by removing prefixes like "buy", "get", "purchase", etc.
 */
export function cleanGroceryItemText(text: string): string {
  // First handle prefixes (most common case)
  let cleaned = text.replace(/^(buy|get|purchase|pick up|grab)(\s+)/i, '');
  
  // Handle phrases like "need to buy X", "don't forget to get X", etc.
  cleaned = cleaned.replace(/(need to|don't forget to|remember to|we should|should|have to)\s+(buy|get|purchase|pick up|grab)\s+/i, '');
  
  // Handle "add X to the grocery/shopping list"
  cleaned = cleaned.replace(/^add\s+(.+)\s+to\s+(the\s+)?(grocery|shopping)(\s+list)?$/i, '$1');
  
  // Capitalize first letter if it's lowercase after cleaning
  if (cleaned.length > 0 && cleaned[0] !== cleaned[0].toUpperCase()) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned;
}

/**
 * Test function for grocery item cleaning
 */
export function testGroceryItemCleaning() {
  const testCases = [
    "buy milk",
    "get eggs",
    "purchase bread",
    "pick up cheese",
    "grab apples",
    "Buy cereal",
    "GET yogurt",
    "PURCHASE pasta",
    "milk", // Already clean
    "2 gallons of milk", // No prefix
    "buy 2 gallons of milk" // With quantity
  ];
  
  console.log("Testing grocery item cleaning:");
  testCases.forEach(item => {
    console.log(`Original: "${item}" -> Cleaned: "${cleanGroceryItemText(item)}"`);
  });
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

SPECIAL HANDLING FOR RECIPES:
- If the content appears to be a recipe (contains ingredients, steps, cooking time, etc.), create a dedicated "recipe" note group.
- For recipes, treat each ingredient as a separate task with category "ingredient".
- Treat each preparation/cooking step as a separate task with category "recipe_step".

SPECIAL HANDLING FOR GROCERY LISTS:
- If the content appears to be grocery items or shopping items, create a single "grocery" or "shopping" note group.
- Label each item as category "grocery_item" or "shopping_item".
- DO NOT create multiple grocery or shopping lists unless the user explicitly mentions different stores or shopping trips.
- If the user mentions "add to grocery list" or similar phrases, consider these items as additions to an existing list, not a new list.

BE AGGRESSIVE WITH CATEGORIZATION. If tasks appear to belong to different contexts or domains, split them into separate notes even if there are only a few tasks per category. Look for keywords indicating task type, project names, work vs personal, etc.

Return JSON with:
- "tasks": Array of task objects with "text", "done", and "category" properties
- "noteGroups": Array of note groups, each with "title", "category" and "taskIndices" (indices of tasks that belong in this group)
- "reasoning": Brief explanation of why you split the tasks this way

Even if there are just a few mentions that indicate different categories (like "for work", "for home", "shopping", "fitness", "recipe"), create separate note groups.`,
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
    
    // Ensure all tasks have valid categories and clean grocery items
    result.tasks = result.tasks.map((task: any) => {
      // Clean grocery item text by removing "buy" and similar prefixes
      const cleanedText = task.category === 'grocery_item' || 
                          task.category === 'shopping_item' ? 
                          cleanGroceryItemText(task.text) : task.text;
      
      return {
        ...task,
        text: cleanedText,
        category: task.category || 'general',
        done: false
      };
    });
    
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
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    console.log(`Transcribing audio blob of size ${audioBlob.size} bytes`);
    
    // Check if the audio is too small which might indicate an issue
    if (audioBlob.size < 1000) {
      console.warn('Audio blob is very small, might not contain enough data for transcription');
      throw new Error('Audio recording is too short. Please try speaking for a longer duration.');
    }
    
    const arrayBuffer = await audioBlob.arrayBuffer();
    // Using Nova-3 model with additional features like smart formatting & punctuation
    // Added diarize=true to better handle longer recordings
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true&diarize=true&utterances=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram API error:', response.status, response.statusText, errorText);
      throw new Error(`Failed to transcribe audio: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Full Deepgram response:', JSON.stringify(result, null, 2));
    
    // Extract transcript with better error handling
    if (!result.results || !result.results.channels || !result.results.channels[0] || 
        !result.results.channels[0].alternatives || !result.results.channels[0].alternatives[0]) {
      console.error('Unexpected Deepgram response structure:', result);
      throw new Error('Received invalid response from transcription service');
    }
    
    const transcript = result.results.channels[0].alternatives[0].transcript || '';
    
    console.log(`Transcription complete. Length: ${transcript.length} characters, Snippet: "${transcript.substring(0, 100)}..."`);
    
    // More robust check for incomplete transcripts
    if ((transcript.length < 50 && !transcript.includes('.')) || 
        transcript.includes('please provide') || 
        transcript.endsWith('...') || 
        transcript.endsWith(',')) {
      console.warn('Transcription appears incomplete or cut off');
      
      // If we have utterances, try to use those instead
      if (result.results.utterances && result.results.utterances.length > 0) {
        const utteranceTexts = result.results.utterances.map((u: any) => u.transcript);
        const fullUtteranceText = utteranceTexts.join(' ');
        console.log(`Using utterances instead. Length: ${fullUtteranceText.length}`);
        
        if (fullUtteranceText.length > transcript.length) {
          return fullUtteranceText;
        }
      }
      
      // Add a note about the potential truncation
      return transcript + " [Note: Your dictation may be incomplete. Please review and try again if content is missing.]";
    }
    
    return transcript;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    return 'Failed to transcribe audio. Please try again and speak clearly.';
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
    console.log(`Transcribing audio blob of size ${audioBlob.size} bytes with ${keyTerms.length} key terms`);
    
    // Check if the audio is too small which might indicate an issue
    if (audioBlob.size < 1000) {
      console.warn('Audio blob is very small, might not contain enough data for transcription');
      throw new Error('Audio recording is too short. Please try speaking for a longer duration.');
    }
    
    const arrayBuffer = await audioBlob.arrayBuffer();
    const keyTermsParam = keyTerms.length > 0 
      ? `&keyterms=${encodeURIComponent(JSON.stringify(keyTerms))}` 
      : '';
      
    const response = await fetch(`https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true&diarize=true&utterances=true${keyTermsParam}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram API error:', response.status, response.statusText, errorText);
      
      // If there was an error with key terms, try again without them
      console.log('Trying transcription again without key terms...');
      return await transcribeAudio(audioBlob);
    }

    const result = await response.json();
    console.log('Full Deepgram response with key terms:', JSON.stringify(result, null, 2));
    
    // Extract transcript with better error handling
    if (!result.results || !result.results.channels || !result.results.channels[0] || 
        !result.results.channels[0].alternatives || !result.results.channels[0].alternatives[0]) {
      console.error('Unexpected Deepgram response structure:', result);
      throw new Error('Received invalid response from transcription service');
    }
    
    const transcript = result.results.channels[0].alternatives[0].transcript || '';
    
    console.log(`Transcription with key terms complete. Length: ${transcript.length} characters, Snippet: "${transcript.substring(0, 100)}..."`);
    
    // More robust check for incomplete transcripts
    if ((transcript.length < 50 && !transcript.includes('.')) || 
        transcript.includes('please provide') || 
        transcript.endsWith('...') || 
        transcript.endsWith(',')) {
      console.warn('Transcription appears incomplete or cut off');
      
      // If we have utterances, try to use those instead
      if (result.results.utterances && result.results.utterances.length > 0) {
        const utteranceTexts = result.results.utterances.map((u: any) => u.transcript);
        const fullUtteranceText = utteranceTexts.join(' ');
        console.log(`Using utterances instead. Length: ${fullUtteranceText.length}`);
        
        if (fullUtteranceText.length > transcript.length) {
          return fullUtteranceText;
        }
      }
      
      // Add a note about the potential truncation
      return transcript + " [Note: Your dictation may be incomplete. Please review and try again if content is missing.]";
    }
    
    return transcript;
  } catch (error) {
    console.error('Error in transcribeAudioWithKeyTerms:', error);
    return await transcribeAudio(audioBlob); // Fall back to basic transcription
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

SPECIAL HANDLING FOR RECIPES:
- If the text appears to be a recipe, format it properly with clear sections for:
  * Recipe Title (as a heading)
  * Ingredients (as a bullet-point list)
  * Instructions/Steps (as a numbered list)
  * Any additional notes or tips
- Preserve all measurements, quantities, and cooking times exactly as specified
- Format the recipe in a clean, organized structure

SPECIAL HANDLING FOR GROCERY LISTS:
- If the text appears to be a grocery list, format it as a clean bullet-point list
- Remove prefixes like "buy", "get", "purchase" from each item
- Keep quantities and specific details about each item
- If the user mentions different stores, organize items by store
- Format the grocery list in a clean, organized structure

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

/**
 * Process dictation transcript using AI to extract tasks, categories, and create notes
 */
export async function processDictationTranscript(text: string) {
  try {
    // First, use GPT-4 to analyze the content and suggest organization
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Analyze the following voice dictation transcript and return a structured JSON response with:
          1. Main topics/categories identified
          2. Tasks extracted (with status and priority)
          3. Suggested note organization
          4. Any detected deadlines or important dates
          5. Any detected labels/tags
          Format as: {
            "categories": string[],
            "tasks": Array<{ text: string, priority: "low"|"medium"|"high", deadline?: string }>,
            "noteGroups": Array<{ title: string, content: string, taskIndices: number[], category?: string }>,
            "labels": string[]
          }`
        },
        { role: 'user', content: text }
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content!);
    
    // Use Gemini for additional context and refinement
    const geminiPrompt = `Refine and enhance this note organization:
    ${JSON.stringify(result, null, 2)}
    
    Suggest any improvements or additional categorization.
    Return in the same JSON format.`;
    
    const geminiResult = await geminiModel.generateContent(geminiPrompt);
    const enhancedResult = JSON.parse(geminiResult.response.text());
    
    // Merge insights from both models
    return {
      ...result,
      categories: [...new Set([...result.categories, ...enhancedResult.categories])],
      labels: [...new Set([...result.labels, ...enhancedResult.labels])],
      tasks: result.tasks.map((task: any, index: number) => ({
        ...task,
        priority: enhancedResult.tasks[index]?.priority || task.priority
      })),
      noteGroups: result.noteGroups.map((group: any, index: number) => ({
        ...group,
        category: enhancedResult.noteGroups[index]?.category || group.category
      }))
    };
  } catch (error) {
    console.error('Error processing dictation:', error);
    throw error;
  }
}