import React, { useState } from 'react';

interface LinkPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, text: string) => void;
}

export const LinkPopup: React.FC<LinkPopupProps> = ({ isOpen, onClose, onInsert }) => {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onInsert(url, text || url);
      setUrl('');
      setText('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl w-96 max-w-full">
        <h3 className="text-lg font-medium text-white mb-4">Insert Link</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-1">
              URL
            </label>
            <input
              type="text"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="text" className="block text-sm font-medium text-gray-300 mb-1">
              Display Text (optional)
            </label>
            <input
              type="text"
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link text"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Insert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 