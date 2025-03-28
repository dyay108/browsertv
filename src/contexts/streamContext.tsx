import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useStreamControl } from '../hooks/useStreamControl';

interface StreamControlHookResult {
  currentStream: string;
  key: number;
  loading: boolean;
  setCurrentStream: (url: string) => void;
  retryStream: () => void;
  forceReconnect: () => void;
  clearStream: () => void;
  playStream: (url: string) => void;
}

type StreamContextType = StreamControlHookResult | null;

const StreamContext = createContext<StreamContextType>(null);

interface StreamProviderProps {
  children: ReactNode;
}

export const StreamProvider: React.FC<StreamProviderProps> = ({ children }) => {
  const streamControl = useStreamControl(); 

  return (
    <StreamContext.Provider value={streamControl}>
      {children}
    </StreamContext.Provider>
  );
};

export const useSharedStreamControl = (): StreamControlHookResult => {
  const context = useContext(StreamContext);
  
  if (context === null) {
    throw new Error('useSharedStreamControl must be used within a StreamProvider');
  }
  
  return context; 
};