import React, { useState, useEffect } from 'react';
import { Note as NoteType } from '../types';
import { Eye, EyeOff, Lock } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface SecureNoteProps {
  note: NoteType;
  onContentChange: (id: string, content: string, isEncrypted?: boolean) => void;
}

// This function will be used to encrypt and decrypt content
const encryptContent = (content: string, password: string): string => {
  return CryptoJS.AES.encrypt(content, password).toString();
};

const decryptContent = (encryptedContent: string, password: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return ''; // Failed to decrypt
  }
};

export const SecureNote: React.FC<SecureNoteProps> = ({ note, onContentChange }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [decryptedContent, setDecryptedContent] = useState('');
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true);
  
  // Check if this note already has encrypted content
  useEffect(() => {
    if (note.content && typeof note.content === 'string' && note.content.startsWith('encrypted:')) {
      setIsPasswordSet(true);
    } else {
      setIsPasswordSet(false);
      setDecryptedContent(typeof note.content === 'string' ? note.content : '');
    }
  }, [note.content]);

  const handleToggleVisibility = () => {
    if (!isVisible && !isLocked) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const handleUnlock = () => {
    if (!isPasswordSet) {
      // Setting password for the first time
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      // Encrypt the content with the new password
      const encrypted = encryptContent(decryptedContent || '', password);
      onContentChange(note.id, `encrypted:${encrypted}`, true);
      setIsPasswordSet(true);
      setIsLocked(false);
      setError('');
    } else {
      // Unlock with existing password
      if (note.content && typeof note.content === 'string' && note.content.startsWith('encrypted:')) {
        const encryptedContent = note.content.substring(10); // Remove 'encrypted:' prefix
        const decrypted = decryptContent(encryptedContent, password);
        
        if (decrypted) {
          setDecryptedContent(decrypted);
          setIsLocked(false);
          setError('');
        } else {
          setError('Incorrect password');
        }
      }
    }
  };

  const handleLock = () => {
    if (password) {
      const encryptedText = encryptContent(decryptedContent, password);
      onContentChange(note.id, `encrypted:${encryptedText}`, true);
      setIsLocked(true);
      setShowPasswordPrompt(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDecryptedContent(e.target.value);
    
    // We only update the parent when the note is finally locked
    if (!isLocked) {
      onContentChange(note.id, e.target.value, false);
    }
  };

  return (
    <div className="secure-note">
      {isLocked ? (
        <div className="secure-note-locked">
          <div className="lock-icon">
            <Lock size={24} />
          </div>
          <h3>Secure Note</h3>
          <p>This note is protected with a password.</p>
          
          <div className="password-form">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="password-input"
            />
            
            {!isPasswordSet && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="password-input"
              />
            )}
            
            {error && <div className="password-error">{error}</div>}
            
            <button 
              className="unlock-button"
              onClick={handleUnlock}
            >
              {isPasswordSet ? 'Unlock' : 'Set Password'}
            </button>
          </div>
        </div>
      ) : (
        <div className="secure-note-content">
          <div className="secure-note-controls">
            <button 
              className="visibility-toggle-btn"
              onClick={handleToggleVisibility}
            >
              {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              {isVisible ? 'Hide' : 'Show'}
            </button>
            
            <button 
              className="lock-button"
              onClick={handleLock}
            >
              <Lock size={16} />
              Lock
            </button>
          </div>
          
          <div className="secure-note-editor">
            {isVisible ? (
              <textarea
                value={decryptedContent}
                onChange={handleContentChange}
                placeholder="Type secure content here..."
                className="secure-note-textarea"
              />
            ) : (
              <div className="hidden-content">
                Content hidden for security
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureNote; 