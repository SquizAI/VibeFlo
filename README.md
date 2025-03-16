# Project Manager

A modern, visual project management tool with AI-powered features for note-taking, task management, and project organization.

## Features

- **Visual Note Management**: Create, edit, and organize notes on a canvas-like workspace
- **Task Management**: Add and manage tasks within notes
- **Voice Dictation**: Create notes using voice input (requires API keys)
- **AI Analysis**: Automatically categorize and analyze content (requires API keys)
- **Customization**: Change note colors, resize, and arrange your workspace
- **Workspace Management**: Create and switch between different project workspaces

## Tech Stack

- React + TypeScript
- Vite
- Zustand for state management
- React DnD for drag-and-drop functionality
- OpenAI API for content analysis
- Deepgram API for speech-to-text conversion

## Setup and Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/project-manager.git
cd project-manager
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the project root with your API keys:
```
VITE_OPENAI_API_KEY=your_actual_openai_key_here
VITE_DEEPGRAM_API_KEY=your_actual_deepgram_key_here
VITE_GOOGLE_AI_API_KEY=your_actual_google_ai_key_here
```

4. Start the development server:
```bash
npm run dev
```

## Usage

### Creating Notes
- Click on the canvas to create a new note
- Double-click a note to edit its content
- Drag notes to reposition them on the canvas

### Managing Tasks
- Add tasks within notes using the checkbox format
- Mark tasks as completed by clicking the checkbox
- Edit tasks inline

### Voice Dictation
1. Click the microphone icon in the toolbar
2. Grant microphone permissions when prompted
3. Speak clearly to dictate your note
4. Review the transcribed content before creating the note

### AI Analysis
The application can automatically:
- Categorize content
- Extract key points
- Create task lists from natural language

### Workspace Management
- Create new workspaces for different projects
- Switch between workspaces using the dropdown menu

## Project Structure

```
src/
├── components/      # UI components
├── hooks/           # Custom React hooks
├── store/           # State management
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── lib/             # External integrations
├── App.tsx          # Main application component
└── main.tsx         # Application entry point
```

## Development Notes

- Path aliases are configured in both `tsconfig.app.json` and `vite.config.ts` for cleaner imports
- Netlify deployment configuration is available in `netlify.toml`
- Check `CHECKLIST.md` for current implementation status of features
- See `DEPLOYMENT.md` for detailed deployment instructions

## License

MIT

## Contact

For questions or support, please open an issue on the GitHub repository. 