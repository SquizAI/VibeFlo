import { trackError, trackConsoleMessage } from './mcpBrowserTools';

/**
 * Analyze the Note component syntax error and provide debugging guidance
 */
export function analyzeNoteComponentError(error: Error): void {
  // Track the error with browser tools
  trackError(error, { component: 'Note', source: 'debugNoteComponent' });
  
  // Also log to console directly for visibility
  console.info('Note Component Error Analysis:', {
    errorMessage: error.message,
    possibleCauses: [
      'JSX syntax error - likely unclosed tags or misplaced attributes',
      'Import statement found in the middle of component code',
      'Corrupted file with mixed code blocks',
      'Invalid nesting of JSX elements'
    ],
    recommendedFixes: [
      'Check for unclosed JSX tags or brackets',
      'Move all import statements to the top of the file',
      'Use the modular Note component structure instead',
      'Compare with the backup file to identify corrupted sections'
    ]
  });
  
  // Check if the error is related to the specific issue we're seeing
  if (error.message.includes('Unexpected token') && 
      error.message.includes('import React')) {
    trackConsoleMessage('warn', 'Critical Note Component Issue Detected', {
      issue: 'Import statement found in the middle of JSX code',
      solution: 'The Note.tsx file is corrupted. Consider using the modular version in /components/Note/index.tsx'
    });
    
    console.warn('Critical Note Component Issue Detected:', {
      issue: 'Import statement found in the middle of JSX code',
      solution: 'The Note.tsx file is corrupted. Consider using the modular version in /components/Note/index.tsx'
    });
  }
}

/**
 * Fetch the Note.tsx file content using fetch API to analyze syntax errors
 */
export async function analyzeNoteFile(): Promise<void> {
  try {
    console.info('Attempting to analyze Note.tsx file...');
    
    const response = await fetch('/src/components/Note.tsx.corrupted');
    if (!response.ok) {
      const errorMsg = `Failed to load Note.tsx: ${response.status} ${response.statusText}`;
      trackError(new Error(errorMsg), { operation: 'analyzeNoteFile' });
      console.error(errorMsg);
      return;
    }
    
    const content = await response.text();
    
    // Check for common issues
    const issues = [];
    
    if (content.includes('import React') && !content.startsWith('import')) {
      issues.push('Import statements found in the middle of the file');
    }
    
    const jsxOpenTags = (content.match(/<[a-zA-Z]/g) || []).length;
    const jsxCloseTags = (content.match(/\/>/g) || []).length + (content.match(/<\/[a-zA-Z]/g) || []).length;
    
    if (jsxOpenTags !== jsxCloseTags) {
      issues.push(`Unbalanced JSX tags: ${jsxOpenTags} opening tags, ${jsxCloseTags} closing tags`);
    }
    
    // Log analysis results
    const analysisResults = {
      fileSize: content.length,
      issues,
      recommendation: issues.length > 0 
        ? 'Use the modular Note component instead of the corrupted Note.tsx file'
        : 'File seems structurally sound, look for syntax errors'
    };
    
    trackConsoleMessage('info', 'Note.tsx Analysis Results', analysisResults);
    console.info('Note.tsx Analysis Results:', analysisResults);
    
  } catch (error) {
    trackError(error as Error, { operation: 'analyzeNoteFile' });
    console.error('Failed to analyze Note.tsx file:', error);
  }
}

/**
 * Compare the imports between the old Note.tsx and the new modular structure
 */
export function compareNoteImplementations(): void {
  const comparisonData = {
    oldImplementation: {
      status: 'corrupted',
      file: '/src/components/Note.tsx',
      issues: ['Syntax errors', 'Mixed code blocks', 'Imports in middle of file']
    },
    newImplementation: {
      status: 'working',
      files: [
        '/src/components/Note/index.tsx',
        '/src/components/Note/types.ts',
        '/src/components/Note/NoteHeader.tsx',
        '/src/components/Note/NoteContent.tsx',
        '/src/components/Note/NoteTaskList.tsx',
        '/src/components/Note/ColorPicker.tsx',
        '/src/components/Note/TaskItem.tsx',
        '/src/components/Note/hooks/useTaskOperations.ts',
        '/src/components/Note/hooks/useNoteInteractions.ts'
      ],
      benefits: [
        'Modular structure',
        'Better separation of concerns',
        'Easier to maintain',
        'Type-safe with TypeScript interfaces'
      ]
    },
    recommendation: 'Update all imports to use the new Note component from /components/Note'
  };
  
  trackConsoleMessage('info', 'Note Component Comparison', comparisonData);
  console.info('Note Component Comparison:', comparisonData);
}

export default {
  analyzeNoteComponentError,
  analyzeNoteFile,
  compareNoteImplementations
}; 