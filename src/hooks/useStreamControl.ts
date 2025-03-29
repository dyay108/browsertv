import { useState, useCallback, useEffect } from 'react';

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    _streamSwitchTimeoutId?: number;
    _loadingClearTimeoutId?: number;
  }
}

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

/**
 * Custom hook to manage video stream loading, retrying and reconnecting
 * 
 * @param initialStream Optional initial stream URL
 * @returns Object containing stream state and control functions
 */
export function useStreamControl(initialStream = ''): StreamControlHookResult {
  const [currentStream, setCurrentStream] = useState(initialStream);
  const [key, setKey] = useState(0); // Used to force re-render of the video player
  const [loading, setLoading] = useState(false);

  // Play a new stream with proper unloading/loading sequence
  const playStream = useCallback((url: string) => {
    if (!url.trim()) return;

    console.log('playStream called with URL:', url);
    
    // Set states to indicate loading
    setLoading(true);

    // Make sure we have a unique key that's never 0
    const newKey = Date.now();
    console.log('Setting player key:', newKey);

    // Apply the stream URL immediately
    setCurrentStream(url);
    
    // Cancel any prior unfinished playStream operations
    if (window._streamSwitchTimeoutId) {
      clearTimeout(window._streamSwitchTimeoutId);
      clearTimeout(window._loadingClearTimeoutId);
    }
    
    // Then update key after a tiny delay to ensure state batching
    window._streamSwitchTimeoutId = setTimeout(() => {
      setKey(newKey);
      
      // Clear loading states after the change is complete
      window._loadingClearTimeoutId = setTimeout(() => {
        setLoading(false);
        console.log('Stream change completed');
      }, 2000); // Increased from 1500ms to 2000ms to give more time for stream to initialize
    }, 100); // Increased from 10ms to 100ms for better stability during rapid changes
  }, []);

  // Retry current stream with cache-busting
  const retryStream = useCallback(() => {
    if (!currentStream) return;

    setLoading(true);

    // Add a random query parameter to bypass cache
    const timestamp = Date.now();
    let newUrl = currentStream;

    // Add cache-busting parameter
    if (newUrl.includes('?')) {
      newUrl = `${newUrl}&_=${timestamp}`;
    } else {
      newUrl = `${newUrl}?_=${timestamp}`;
    }

    // Cancel any prior unfinished operations
    if (window._streamSwitchTimeoutId) {
      clearTimeout(window._streamSwitchTimeoutId);
      clearTimeout(window._loadingClearTimeoutId);
    }

    // Update stream URL
    setCurrentStream(newUrl);
    
    // Generate a new key
    const newKey = Date.now();
    
    // Update key after a delay to ensure proper state batching
    window._streamSwitchTimeoutId = setTimeout(() => {
      setKey(newKey);
      
      // Clear loading states after the change is complete
      window._loadingClearTimeoutId = setTimeout(() => {
        setLoading(false);
        console.log('Retry stream complete');
      }, 2000);
    }, 100);

    console.log('Retrying stream with cache-busting:', newUrl);
  }, [currentStream]);

  // Force reconnect with aggressive parameters
  const forceReconnect = useCallback(() => {
    if (!currentStream) return;

    console.log('Force reconnect initiated');
    
    // Set states to indicate loading
    setLoading(true);

    // Get clean base URL by stripping parameters
    const baseUrl = currentStream.split('?')[0];

    // Add enhanced cache busting parameters
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const freshUrl = `${baseUrl}?_=${uniqueId}&forceReload=true&allowStale=false&nocache=true&r=${Math.random()}`;

    console.log('Prepared reconnection URL:', freshUrl);

    // Generate new key using timestamp only for stability
    const newKey = Date.now();
    console.log('Setting new player key:', newKey);
    
    // Cancel any prior unfinished operations
    if (window._streamSwitchTimeoutId) {
      clearTimeout(window._streamSwitchTimeoutId);
      clearTimeout(window._loadingClearTimeoutId);
    }
    
    // Apply URL change first
    setCurrentStream(freshUrl);
    
    // Then update key after a delay to ensure proper state batching
    window._streamSwitchTimeoutId = setTimeout(() => {
      setKey(newKey);
      
      // Clear loading states after the change is complete
      window._loadingClearTimeoutId = setTimeout(() => {
        setLoading(false);
        console.log('Force reconnect complete');
      }, 2000); // Increased to 2000ms for consistency
    }, 100); // Increased to 100ms for stability
  }, [currentStream]);

  // Clear the current stream
  const clearStream = useCallback(() => {
    // Cancel any pending operations
    if (window._streamSwitchTimeoutId) {
      clearTimeout(window._streamSwitchTimeoutId);
      clearTimeout(window._loadingClearTimeoutId);
    }
    
    setCurrentStream('');
    setKey(0);
    setLoading(false); // Reset loading state too
  }, []);

  // When initialStream changes from outside, update currentStream
  // But avoid including currentStream in dependencies to prevent circular updates
  useEffect(() => {
    // First mount initialization
    if (initialStream && !currentStream) {
      setCurrentStream(initialStream);
    }
  }, []); // Empty deps - only run on mount
  
  // Handle external changes to initialStream
  useEffect(() => {
    // Skip if this is the initial value or empty value
    if (initialStream && initialStream !== currentStream) {
      console.log('External initialStream change detected:', initialStream);
      // Use playStream instead of direct state update to ensure proper key handling
      playStream(initialStream);
    }
  }, [initialStream]); // Only depend on initialStream

  return {
    currentStream,
    key,
    loading,
    setCurrentStream,
    retryStream,
    forceReconnect,
    clearStream,
    playStream
  };
}