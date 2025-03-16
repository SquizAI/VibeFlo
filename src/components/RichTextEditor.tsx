import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { 
  Bold, Italic, List, ListChecks, Link as LinkIcon, 
  Heading, Code, Quote, Undo, Redo, X 
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  minHeight?: string;
  maxHeight?: string;
  readOnly?: boolean;
  showToolbar?: boolean;
  onBlur?: () => void;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Write something...',
  autoFocus = false,
  minHeight = '100px',
  maxHeight = '500px',
  readOnly = false,
  showToolbar = true,
  onBlur,
  className = ''
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur: onBlur,
    editable: !readOnly,
    autofocus: autoFocus,
  });

  useEffect(() => {
    // Update content if it changes externally
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl || '');

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={`rich-text-editor ${className}`}>
      {showToolbar && (
        <div className="rich-text-toolbar">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            type="button"
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            type="button"
            title="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            type="button"
            title="Heading"
          >
            <Heading size={16} />
          </button>
          <span className="toolbar-divider"></span>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            type="button"
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={editor.isActive('taskList') ? 'is-active' : ''}
            type="button"
            title="Task List"
          >
            <ListChecks size={16} />
          </button>
          <button
            onClick={setLink}
            className={editor.isActive('link') ? 'is-active' : ''}
            type="button"
            title="Link"
          >
            <LinkIcon size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editor.isActive('codeBlock') ? 'is-active' : ''}
            type="button"
            title="Code Block"
          >
            <Code size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            type="button"
            title="Quote"
          >
            <Quote size={16} />
          </button>
          <span className="toolbar-divider"></span>
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            type="button"
            title="Undo"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            type="button"
            title="Redo"
          >
            <Redo size={16} />
          </button>
          {editor.isActive('link') && (
            <button
              onClick={() => editor.chain().focus().unsetLink().run()}
              type="button"
              title="Remove Link"
              className="remove-link-btn"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
      <div 
        className="editor-content"
        style={{ 
          minHeight, 
          maxHeight,
          overflowY: 'auto',
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}; 