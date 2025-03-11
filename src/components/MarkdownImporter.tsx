import React, { useState, useRef } from 'react';
import { FileText, FolderOpen, UploadCloud, Loader2, X } from 'lucide-react';
import { Note as NoteType } from '../types';
import { useNoteStore } from '../store/noteStore';

interface MarkdownImporterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MarkdownImporter({ isOpen, onClose }: MarkdownImporterProps) {
  const { addNote } = useNoteStore();
  const [importedFiles, setImportedFiles] = useState<File[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available colors
  const colors = ['blue', 'green', 'pink', 'yellow', 'purple', 'orange', 'teal', 'red'];

  // Function to handle file selection for import
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Convert FileList to array and filter for .md files
    const mdFiles = Array.from(files).filter(file => 
      file.name.toLowerCase().endsWith('.md')
    );
    
    if (mdFiles.length === 0) {
      alert('No Markdown files (.md) found. Please select Markdown files.');
      return;
    }
    
    setImportedFiles(mdFiles);
    console.log(`Selected ${mdFiles.length} Markdown files for import`);
  };

  // Handle folder selection
  const handleSelectFolder = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    // Add non-standard attributes for directory selection
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    
    input.onchange = (e) => handleFileSelect(e as any);
    input.click();
  };

  // Parse Markdown content to extract tasks and structure
  const parseMarkdown = async (content: string): Promise<{
    title: string;
    sections: { heading: string; content: string; level: number }[];
    tasks: { text: string; checked: boolean }[];
  }> => {
    // Extract title from first heading or first line
    const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Imported Note';
    
    // Extract sections (headings and their content)
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const sections: { heading: string; content: string; level: number }[] = [];
    
    let lastIndex = 0;
    let lastLevel = 0;
    let lastHeading = '';
    
    // Find all headings and their content
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const heading = match[2].trim();
      const startIndex = match.index;
      
      // Add the previous section if there is one
      if (lastHeading) {
        const sectionContent = content.slice(lastIndex, startIndex).trim();
        sections.push({
          heading: lastHeading,
          content: sectionContent,
          level: lastLevel
        });
      }
      
      lastIndex = startIndex + match[0].length;
      lastLevel = level;
      lastHeading = heading;
    }
    
    // Add the last section
    if (lastHeading) {
      const sectionContent = content.slice(lastIndex).trim();
      sections.push({
        heading: lastHeading,
        content: sectionContent,
        level: lastLevel
      });
    }
    
    // If no sections were found, add the entire content as one section
    if (sections.length === 0 && content.trim()) {
      sections.push({
        heading: title,
        content: content.trim(),
        level: 1
      });
    }
    
    // Extract tasks from content
    const taskRegex = /- \[([ x])\] (.+)$/gm;
    const tasks: { text: string; checked: boolean }[] = [];
    
    while ((match = taskRegex.exec(content)) !== null) {
      const checked = match[1] === 'x';
      const text = match[2].trim();
      tasks.push({ text, checked });
    }
    
    return { title, sections, tasks };
  };

  // Create notes from Markdown files
  const createNotesFromMarkdown = async () => {
    if (importedFiles.length === 0) return;
    
    setIsImporting(true);
    setImportStatus(`Preparing to process ${importedFiles.length} file(s)...`);
    
    // Track new notes to be added
    const newNotes: NoteType[] = [];
    
    // Process all files first to understand content
    const processedFiles: {
      mainNote: NoteType;
      sectionNotes: NoteType[];
      metadata: {
        primaryCategory?: string;
        isTaskHeavy: boolean;
        complexity: number; // 1-10 scale based on sections, tasks, etc.
      }
    }[] = [];
    
    for (let i = 0; i < importedFiles.length; i++) {
      const file = importedFiles[i];
      setImportStatus(`Processing ${i+1}/${importedFiles.length}: ${file.name}`);
      
      try {
        // Read the file content
        const content = await file.text();
        
        // Parse the Markdown
        const { title, sections, tasks } = await parseMarkdown(content);
        
        // Analysis to determine primary category and complexity
        const primaryCategory = detectCategory(content, title);
        const complexity = calculateComplexity(sections, tasks);
        const isTaskHeavy = tasks.length > 5 || (tasks.length > 0 && tasks.length > sections.length);
        
        // Create task objects for the note
        const noteTasks = tasks.map(task => ({
          id: crypto.randomUUID(),
          text: task.text,
          done: task.checked,
          category: primaryCategory || 'Imported' // Tag imported tasks
        }));
        
        // Create main note (without position yet)
        const mainNote: NoteType = {
          id: crypto.randomUUID(),
          type: tasks.length > 0 ? 'task' : 'sticky',
          content: title,
          position: { x: 0, y: 0 }, // Position will be calculated later
          color: colors[Math.floor(Math.random() * colors.length)],
          tasks: noteTasks,
          expanded: true // Set expanded to true by default
        };
        
        // Process sections into separate notes if appropriate
        const sectionNotes: NoteType[] = [];
        
        // Only create additional notes for substantial sections in complex documents
        if (sections.length > 1 && complexity > 5) {
          // Only create additional notes for main sections (level 1 or 2)
          const mainSections = sections.filter(s => s.level <= 2 && s.content.length > 100);
          
          if (mainSections.length > 0) {
            for (let j = 0; j < mainSections.length; j++) {
              const section = mainSections[j];
              // Extract tasks from this section
              const sectionTaskRegex = /- \[([ x])\] (.+)$/gm;
              const sectionTasks: { text: string; checked: boolean }[] = [];
              
              let taskMatch;
              while ((taskMatch = sectionTaskRegex.exec(section.content)) !== null) {
                const checked = taskMatch[1] === 'x';
                const text = taskMatch[2].trim();
                sectionTasks.push({ text, checked });
              }
              
              // Create note for this section (without position yet)
              const sectionNote: NoteType = {
                id: crypto.randomUUID(),
                type: sectionTasks.length > 0 ? 'task' : 'sticky',
                content: section.heading,
                position: { x: 0, y: 0 }, // Position will be calculated later
                color: colors[Math.floor(Math.random() * colors.length)],
                tasks: sectionTasks.map(task => ({
                  id: crypto.randomUUID(),
                  text: task.text,
                  done: task.checked,
                  category: 'Section'
                })),
                expanded: true // Set expanded to true by default
              };
              
              sectionNotes.push(sectionNote);
            }
          }
        }
        
        // Store processed file data for layout calculation
        processedFiles.push({
          mainNote,
          sectionNotes,
          metadata: {
            primaryCategory,
            isTaskHeavy,
            complexity
          }
        });
        
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setImportStatus(`Error processing ${file.name}: ${error}`);
      }
    }
    
    // Calculate layout based on all processed files
    const { organizedNotes, layout } = calculateLayout(processedFiles);
    setImportStatus(`Organizing ${organizedNotes.length} notes with ${layout} layout...`);
    
    // Add all the new notes
    if (organizedNotes.length > 0) {
      setImportStatus(`Creating ${organizedNotes.length} notes...`);
      organizedNotes.forEach(note => {
        addNote(note);
      });
      
      setImportStatus(`Successfully imported ${importedFiles.length} file(s) into ${organizedNotes.length} notes using ${layout} layout.`);
    } else {
      setImportStatus('No notes were created. The files may not contain valid Markdown content.');
    }
    
    setTimeout(() => {
      setIsImporting(false);
      onClose();
      setImportedFiles([]);
      setImportStatus('');
    }, 2000);
  };

  // Detect the primary category of content
  const detectCategory = (content: string, title: string): string | undefined => {
    // Simple but effective category detection
    const categories = [
      { name: 'Project Management', keywords: ['project', 'milestone', 'deadline', 'team', 'schedule', 'plan'] },
      { name: 'Technical', keywords: ['code', 'algorithm', 'function', 'api', 'database', 'server', 'client', 'programming'] },
      { name: 'Meeting', keywords: ['meeting', 'discussion', 'agenda', 'attendees', 'minutes', 'call'] },
      { name: 'Research', keywords: ['research', 'analysis', 'study', 'findings', 'data', 'review'] },
      { name: 'Personal', keywords: ['personal', 'home', 'family', 'shopping', 'appointment', 'reminder'] }
    ];
    
    // Count keyword matches for each category
    const matches = categories.map(category => {
      const regex = new RegExp(`\\b(${category.keywords.join('|')})\\b`, 'gi');
      const count = (content.match(regex) || []).length;
      
      // Add bonus for keywords in title
      const titleRegex = new RegExp(`\\b(${category.keywords.join('|')})\\b`, 'gi');
      const titleCount = (title.match(titleRegex) || []).length * 3; // Title matches are weighted higher
      
      return { category: category.name, count: count + titleCount };
    });
    
    // Find the category with the most matches
    const bestMatch = matches.reduce((prev, current) => 
      (current.count > prev.count) ? current : prev, { category: '', count: 0 });
    
    // Only return category if we have meaningful matches
    return bestMatch.count > 2 ? bestMatch.category : undefined;
  };

  // Calculate complexity score (1-10) based on content structure
  const calculateComplexity = (sections: any[], tasks: any[]): number => {
    // Factors that increase complexity
    const sectionDepth = Math.min(3, sections.reduce((max, s) => Math.max(max, s.level || 0), 0));
    const sectionCount = Math.min(10, sections.length);
    const taskCount = Math.min(20, tasks.length);
    const contentLength = Math.min(10, sections.reduce((sum, s) => sum + (s.content?.length || 0), 0) / 1000);
    
    // Calculate weighted score (1-10)
    const complexityScore = (
      (sectionDepth * 1) + 
      (sectionCount * 0.5) + 
      (taskCount * 0.3) + 
      (contentLength * 0.2)
    ) / 2;
    
    return Math.min(10, Math.max(1, Math.round(complexityScore)));
  };

  // Calculate layout positions based on all notes
  const calculateLayout = (processedFiles: any[]): { organizedNotes: NoteType[], layout: string } => {
    const allNotes: NoteType[] = [];
    
    // Determine the best layout strategy based on the content
    const totalNotes = processedFiles.reduce((sum, file) => 
      sum + 1 + file.sectionNotes.length, 0);
    
    const projectNotes = processedFiles.filter(f => 
      f.metadata.primaryCategory === 'Project Management').length;
    
    const taskHeavyNotes = processedFiles.filter(f => f.metadata.isTaskHeavy).length;
    
    let layoutStrategy: 'grid' | 'hierarchy' | 'workflow' | 'cluster';
    
    // Choose layout based on content analysis
    if (projectNotes > processedFiles.length / 3) {
      layoutStrategy = 'workflow';
    } else if (taskHeavyNotes > processedFiles.length / 2) {
      layoutStrategy = 'hierarchy';
    } else if (totalNotes > 10) {
      layoutStrategy = 'cluster';
    } else {
      layoutStrategy = 'grid';
    }
    
    // Apply the selected layout strategy
    switch (layoutStrategy) {
      case 'grid':
        applyGridLayout(processedFiles, allNotes);
        break;
      case 'hierarchy':
        applyHierarchyLayout(processedFiles, allNotes);
        break;
      case 'workflow':
        applyWorkflowLayout(processedFiles, allNotes);
        break;
      case 'cluster':
        applyClusterLayout(processedFiles, allNotes);
        break;
    }
    
    return { organizedNotes: allNotes, layout: layoutStrategy };
  };

  // Calculate grid layout (evenly spaced grid)
  const applyGridLayout = (processedFiles: any[], allNotes: NoteType[]) => {
    const GRID_COLS = 3;
    const NOTE_WIDTH = 280;
    const NOTE_HEIGHT = 220;
    const SPACING = 30;
    
    // Center the grid in the viewport
    const startX = window.innerWidth / 2 - ((GRID_COLS * (NOTE_WIDTH + SPACING)) / 2);
    const startY = window.innerHeight / 2 - 100;
    
    let index = 0;
    
    processedFiles.forEach(file => {
      // Position main note in grid
      const col = index % GRID_COLS;
      const row = Math.floor(index / GRID_COLS);
      
      file.mainNote.position = {
        x: startX + (col * (NOTE_WIDTH + SPACING)),
        y: startY + (row * (NOTE_HEIGHT + SPACING))
      };
      
      allNotes.push(file.mainNote);
      index++;
      
      // Add section notes in smaller grid
      if (file.sectionNotes.length > 0) {
        file.sectionNotes.forEach((note: NoteType, i: number) => {
          const col = index % GRID_COLS;
          const row = Math.floor(index / GRID_COLS);
          
          note.position = {
            x: startX + (col * (NOTE_WIDTH + SPACING)),
            y: startY + (row * (NOTE_HEIGHT + SPACING))
          };
          
          allNotes.push(note);
          index++;
        });
      }
    });
  };

  // Calculate hierarchical layout (parent-child relationships)
  const applyHierarchyLayout = (processedFiles: any[], allNotes: NoteType[]) => {
    const NOTE_WIDTH = 280;
    const NOTE_HEIGHT = 220;
    const HORIZONTAL_SPACING = 50;
    const VERTICAL_SPACING = 150;
    const SECTION_INDENT = 80;
    
    // Start positioning near the center
    let startY = window.innerHeight / 2 - ((processedFiles.length * (NOTE_HEIGHT + VERTICAL_SPACING)) / 2);
    const startX = window.innerWidth / 2 - (NOTE_WIDTH / 2);
    
    processedFiles.forEach((file, fileIndex) => {
      // Position main note
      file.mainNote.position = {
        x: startX,
        y: startY + (fileIndex * (NOTE_HEIGHT + VERTICAL_SPACING))
      };
      
      allNotes.push(file.mainNote);
      
      // Position section notes in a hierarchical pattern
      if (file.sectionNotes.length > 0) {
        file.sectionNotes.forEach((note: NoteType, i: number) => {
          note.position = {
            x: startX + SECTION_INDENT + (Math.floor(i / 3) * HORIZONTAL_SPACING),
            y: startY + (fileIndex * (NOTE_HEIGHT + VERTICAL_SPACING)) + 
               NOTE_HEIGHT + 50 + ((i % 3) * (NOTE_HEIGHT / 2))
          };
          
          allNotes.push(note);
        });
      }
    });
  };

  // Calculate workflow layout (left to right process flow)
  const applyWorkflowLayout = (processedFiles: any[], allNotes: NoteType[]) => {
    const NOTE_WIDTH = 280;
    const NOTE_HEIGHT = 220;
    const HORIZONTAL_SPACING = 350;
    const VERTICAL_SPACING = 50;
    
    // Start from left side flowing right
    const startX = Math.max(100, window.innerWidth / 2 - ((processedFiles.length * (NOTE_WIDTH + HORIZONTAL_SPACING)) / 2));
    const startY = window.innerHeight / 2 - (NOTE_HEIGHT / 2);
    
    processedFiles.forEach((file, fileIndex) => {
      // Position main note in a left-to-right flow
      file.mainNote.position = {
        x: startX + (fileIndex * (NOTE_WIDTH + HORIZONTAL_SPACING)),
        y: startY
      };
      
      allNotes.push(file.mainNote);
      
      // Position section notes below main note
      if (file.sectionNotes.length > 0) {
        file.sectionNotes.forEach((note: NoteType, i: number) => {
          note.position = {
            x: startX + (fileIndex * (NOTE_WIDTH + HORIZONTAL_SPACING)) + (i % 2) * 50,
            y: startY + NOTE_HEIGHT + VERTICAL_SPACING + Math.floor(i / 2) * (NOTE_HEIGHT + VERTICAL_SPACING / 2)
          };
          
          allNotes.push(note);
        });
      }
    });
  };

  // Calculate cluster layout (grouped by category)
  const applyClusterLayout = (processedFiles: any[], allNotes: NoteType[]) => {
    const NOTE_WIDTH = 280;
    const NOTE_HEIGHT = 220;
    const SPACING = 40;
    const CLUSTER_SPACING = 150;
    
    // Group by category
    const categories = [...new Set(processedFiles
      .map(file => file.metadata.primaryCategory)
      .filter(Boolean))];
    
    // Add "Uncategorized" for files without category
    categories.push("Uncategorized");
    
    // Calculate center position
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Arrange category clusters in a circle around center
    const radius = Math.max(300, Math.min(centerX, centerY) - 200);
    
    categories.forEach((category, categoryIndex) => {
      // Calculate cluster position on the circle
      const angle = (categoryIndex / categories.length) * Math.PI * 2;
      const clusterX = centerX + Math.cos(angle) * radius;
      const clusterY = centerY + Math.sin(angle) * radius;
      
      // Get files for this category
      const categoryFiles = processedFiles.filter(file => 
        category === "Uncategorized" 
          ? !file.metadata.primaryCategory 
          : file.metadata.primaryCategory === category
      );
      
      // Arrange files in a mini-grid within the cluster
      const MINI_GRID_COLS = 2;
      
      categoryFiles.forEach((file, fileIndex) => {
        const col = fileIndex % MINI_GRID_COLS;
        const row = Math.floor(fileIndex / MINI_GRID_COLS);
        
        file.mainNote.position = {
          x: clusterX + (col - 0.5) * (NOTE_WIDTH + SPACING),
          y: clusterY + (row - 0.5) * (NOTE_HEIGHT + SPACING)
        };
        
        allNotes.push(file.mainNote);
        
        // Add section notes close to their parent
        if (file.sectionNotes.length > 0) {
          file.sectionNotes.forEach((note: NoteType, i: number) => {
            const angle = (i / file.sectionNotes.length) * Math.PI / 2 + Math.PI / 4;
            const distance = 180;
            
            note.position = {
              x: file.mainNote.position.x + Math.cos(angle) * distance,
              y: file.mainNote.position.y + Math.sin(angle) * distance
            };
            
            allNotes.push(note);
          });
        }
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-card-bg rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-border-light">
        <div className="p-4 border-b border-border-light bg-gradient-to-r from-accent-blue/10 to-transparent">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-text-primary">Import Markdown</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-card-bg-hover">
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
          <p className="text-text-secondary text-sm mt-1">
            Import notes from Markdown files (.md)
          </p>
        </div>
        
        <div className="p-6">
          {isImporting ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin mb-4">
                <Loader2 size={32} className="text-accent-blue" />
              </div>
              <p className="text-text-secondary text-center">{importStatus}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="p-4 border border-dashed border-border-light rounded-lg bg-card-bg-hover flex flex-col items-center justify-center gap-3">
                  <div className="p-3 bg-accent-blue/10 rounded-full">
                    <FileText className="w-6 h-6 text-accent-blue" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-medium text-text-primary mb-1">Select Markdown Files</h4>
                    <p className="text-text-secondary text-sm">
                      Choose individual .md files to import
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 py-2 px-4 bg-card-bg border border-border-light rounded-md text-text-primary hover:bg-card-bg-hover text-sm"
                  >
                    Select Files
                  </button>
                </div>
                
                <div className="p-4 border border-dashed border-border-light rounded-lg bg-card-bg-hover flex flex-col items-center justify-center gap-3">
                  <div className="p-3 bg-accent-green/10 rounded-full">
                    <FolderOpen className="w-6 h-6 text-accent-green" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-medium text-text-primary mb-1">Select Folder</h4>
                    <p className="text-text-secondary text-sm">
                      Import all Markdown files from a folder
                    </p>
                  </div>
                  <button
                    onClick={handleSelectFolder}
                    className="mt-2 py-2 px-4 bg-card-bg border border-border-light rounded-md text-text-primary hover:bg-card-bg-hover text-sm"
                  >
                    Select Folder
                  </button>
                </div>
              </div>
              
              {importedFiles.length > 0 && (
                <div>
                  <h4 className="font-medium text-text-primary mb-2">Selected Files:</h4>
                  <div className="max-h-40 overflow-y-auto p-3 bg-card-bg-hover rounded-md">
                    {importedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 py-1">
                        <FileText className="w-4 h-4 text-text-tertiary" />
                        <span className="text-sm text-text-secondary">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-border-light flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-border-light text-text-secondary hover:bg-card-bg-hover"
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            onClick={createNotesFromMarkdown}
            className="px-4 py-2 rounded-md bg-accent-blue text-white hover:bg-accent-blue/90 flex items-center gap-2"
            disabled={isImporting || importedFiles.length === 0}
          >
            <UploadCloud className="w-4 h-4" />
            Import {importedFiles.length} File{importedFiles.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
} 