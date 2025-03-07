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

    // Set loading state
    setLoading(true);

    // Force a complete player reset
    setCurrentStream('');
    setKey(0);

    // Use a timeout to ensure the component has fully unmounted
    setTimeout(() => {
      // Generate a completely new key - use a truly unique value
      const newKey = Date.now() + Math.floor(Math.random() * 10000);
      console.log('Creating new player with key:', newKey);

      // First set the key to ensure proper mounting
      setKey(newKey);

      // Then set stream URL after another short delay
      setTimeout(() => {
        setCurrentStream(url);
        setLoading(false);
      }, 200);
    }, 200);
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
    setLoading(true);

    // STEP 1: Completely unmount player by clearing stream and key
    setCurrentStream('');
    setKey(0);

    // STEP 2: Wait for unmount to complete
    setTimeout(() => {
      console.log('Player unmounted, preparing new connection');

      // Get clean base URL by stripping parameters
      const baseUrl = currentStream.split('?')[0];

      // Add enhanced cache busting parameters
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const freshUrl = `${baseUrl}?_=${uniqueId}&forceReload=true&allowStale=false&nocache=true&r=${Math.random()}`;

      console.log('Prepared reconnection URL:', freshUrl);

      // STEP 3: Generate new key and set it
      const newKey = Date.now() + Math.floor(Math.random() * 100000);
      console.log('Setting new player key:', newKey);
      setKey(newKey);

      // STEP 4: After key change has processed, set the stream URL
      setTimeout(() => {
        console.log('Applying new stream URL');
        setCurrentStream(freshUrl);

        // STEP 5: Finally, mark loading as complete
        setTimeout(() => {
          setLoading(false);
          console.log('Force reconnect complete');
        }, 300);
      }, 300);
    }, 500); // Longer delay to ensure complete unmount

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