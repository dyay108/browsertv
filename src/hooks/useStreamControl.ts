import { useState, useCallback, useEffect } from 'react';

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
    
    // Then update key after a tiny delay to ensure state batching
    setTimeout(() => {
      setKey(newKey);
      
      // Clear loading states after the change is complete
      setTimeout(() => {
        setLoading(false);
        console.log('Stream change completed');
      }, 1500);
    }, 10);
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

    // Update stream URL and force player component to remount
    setCurrentStream(newUrl);
    setKey(prevKey => prevKey + 1);
    setLoading(false);

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
    
    // Apply URL change first
    setCurrentStream(freshUrl);
    
    // Then update key after a tiny delay to ensure proper state batching
    setTimeout(() => {
      setKey(newKey);
      
      // Clear loading states after the change is complete
      setTimeout(() => {
        setLoading(false);
        console.log('Force reconnect complete');
      }, 1500);
    }, 10);
  }, [currentStream]);

  // Clear the current stream
  const clearStream = useCallback(() => {
    setCurrentStream('');
    setKey(0);
    setLoading(false); // Reset loading state too
  }, []);

  // When initialStream changes from outside, update currentStream
  useEffect(() => {
    if (initialStream !== currentStream) {
      setCurrentStream(initialStream);
    }
  }, [initialStream, currentStream]);

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