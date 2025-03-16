import React from 'react';
import { ExternalLink } from 'lucide-react';

interface AICapabilityCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
}

const AICapabilityCard: React.FC<AICapabilityCardProps> = ({
  name,
  description,
  icon,
  shortcut,
  onClick
}) => {
  return (
    <div 
      className="bg-[#242424] hover:bg-[#2a2a2a] rounded-lg p-3 cursor-pointer transition-colors duration-200 border border-[#333] hover:border-[#444] relative group"
      onClick={onClick}
    >
      {/* External link button with tooltip */}
      <div 
        className="absolute top-3 right-3 text-gray-400 hover:text-white"
        onClick={(e) => {
          e.stopPropagation();
          console.log(`Open ${name} documentation`);
        }}
      >
        <ExternalLink size={14} />
        
        {/* Tooltip that appears ABOVE the button */}
        <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs bg-black/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[1001]">
          Open documentation
        </span>
      </div>
      
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-3 p-2 bg-blue-500/10 rounded-md text-blue-400">
          {icon}
        </div>
        <div className="flex-1 pr-5">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{name}</h4>
            {shortcut && (
              <span className="text-xs px-2 py-1 bg-[#333] rounded text-gray-300">
                {shortcut}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default AICapabilityCard; 