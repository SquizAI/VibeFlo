import React, { useState, createContext, useContext } from 'react';

interface TabsContextType {
  activeTab: string;
  changeTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
}

export function Tabs({ 
  defaultValue, 
  className = '', 
  children,
  onValueChange
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  const changeTab = (value: string) => {
    setActiveTab(value);
    if (onValueChange) {
      onValueChange(value);
    }
  };
  
  return (
    <TabsContext.Provider value={{ activeTab, changeTab }}>
      <div className={`tabs ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`tabs-list ${className}`}>
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsTrigger must be used within a Tabs component');
  }
  
  const isActive = context.activeTab === value;
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={`tabs-trigger ${isActive ? 'active' : ''} ${className}`}
      onClick={() => context.changeTab(value)}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsContent must be used within a Tabs component');
  }
  
  const isActive = context.activeTab === value;
  
  if (!isActive) return null;
  
  return (
    <div 
      role="tabpanel"
      className={`tabs-content ${className}`}
    >
      {children}
    </div>
  );
} 