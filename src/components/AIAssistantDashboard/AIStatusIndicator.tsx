import React from 'react';

interface AIStatusIndicatorProps {
  status: 'idle' | 'processing' | 'success' | 'error';
  className?: string;
}

const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({ status, className = '' }) => {
  // Define the appearance based on status
  const getIndicatorStyles = () => {
    switch (status) {
      case 'idle':
        return 'bg-gray-400';
      case 'processing':
        return 'bg-blue-500 animate-pulse';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getIndicatorStyles()}`}></div>
      {status !== 'idle' && (
        <span className="ml-1 text-xs">
          {status === 'processing' && 'Processing...'}
          {status === 'success' && 'Complete'}
          {status === 'error' && 'Error'}
        </span>
      )}
    </div>
  );
};

export default AIStatusIndicator; 