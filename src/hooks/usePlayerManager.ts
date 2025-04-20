import { useState, useRef, useEffect, useCallback, MutableRefObject } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { 
  PlaybackMethod, 
  getStreamType, 
  getMethodsForStreamType, 
  initVideoJs, 
  initHls, 
  initMpegts, 
  initNative, 
  cleanupPlayers 
} from '../utils/playerUtils';

// Extend Window interface to include global functions and variables
declare global {
  interface Window {
    playerCleanup?: () => void;
    initializePlayer?: () => void;
  }
}

interface PlayerManagerResult {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  currentMethod: PlaybackMethod | null;
  error: string | null;
  reconnecting: boolean;
  attemptingMethod: string | null;
  methodsTried: string[];
}

export function usePlayerManager(src: string): PlayerManagerResult {
  // Container reference
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Player references
  const videoElement = useRef<HTMLVideoElement | null>(null);
  const vjsPlayer = useRef<any>(null);
  const hlsInstance = useRef<Hls | null>(null);
  const mpegtsPlayer = useRef<mpegts.Player | null>(null);
  
  // State
  const [error, setError] = useState<string | null>(null);
  const [currentMethod, setCurrentMethod] = useState<PlaybackMethod | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [attemptingMethod, setAttemptingMethod] = useState<string | null>(null);
  
  // Refs for tracking playback attempts
  const successRef = useRef(false);
  const methodsTriedRef = useRef<string[]>([]);
  const lastSuccessfulMethodRef = useRef<string | null>(null);
  
  // Helper to determine if this is a force reconnect
  const isForceReconnect = src.includes('forceReload=true');
  
  // Create a stable version of key data that won't lead to unnecessary rerenders
  const srcRef = useRef(src);
  
  // Cleanup function - defined early so it can be used across effects
  const cleanup = useCallback(() => {
    console.log('Cleaning up all players');
    
    cleanupPlayers(
      vjsPlayer.current, 
      hlsInstance.current, 
      mpegtsPlayer.current, 
      videoElement.current
    );
    
    // Reset references
    vjsPlayer.current = null;
    hlsInstance.current = null;
    mpegtsPlayer.current = null;
    videoElement.current = null;
    
    // Clear container
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    // Reset state
    setCurrentMethod(null);
  }, []);
  
  // Handle method success
  const handleMethodSuccess = useCallback((method: PlaybackMethod) => {
    setCurrentMethod(method);
    
    // We'll track actual playback through event listeners separately
  }, []);
  
  // Handle method error
  const handleMethodError = useCallback((error: any) => {
    console.error('Player method error:', error);
    // We don't set the global error here, to allow other methods to be tried
  }, []);
  
  // Try the given player method
  const tryMethod = useCallback((methodName: string) => {
    if (!containerRef.current || !srcRef.current) return;
    
    const streamType = getStreamType(srcRef.current);
    
    switch(methodName) {
      case 'hls':
        const hlsResult = initHls(
          containerRef.current, 
          srcRef.current, 
          handleMethodSuccess, 
          handleMethodError
        );
        videoElement.current = hlsResult.videoElement;
        hlsInstance.current = hlsResult.hls;
        break;
        
      case 'mpegts':
        const mpegtsResult = initMpegts(
          containerRef.current, 
          srcRef.current, 
          handleMethodSuccess, 
          handleMethodError
        );
        videoElement.current = mpegtsResult.videoElement;
        mpegtsPlayer.current = mpegtsResult.player;
        break;
        
      case 'videojs':
        const vjsResult = initVideoJs(
          containerRef.current, 
          srcRef.current, 
          streamType,
          handleMethodSuccess, 
          handleMethodError
        );
        videoElement.current = vjsResult.videoElement;
        vjsPlayer.current = vjsResult.player;
        break;
        
      case 'native':
      default:
        const nativeResult = initNative(
          containerRef.current, 
          srcRef.current, 
          handleMethodSuccess, 
          handleMethodError
        );
        videoElement.current = nativeResult.videoElement;
        break;
    }
    
    // Set up event listeners to detect successful playback
    if (videoElement.current) {
      setupPlaybackListeners(methodName);
    }
  }, [handleMethodSuccess, handleMethodError]);
  
  // Set up event listeners for the video element
  const setupPlaybackListeners = useCallback((method: string) => {
    if (!videoElement.current) return;
    
    // Track when video actually starts playing
    const onPlaying = () => {
      console.log(`VIDEO PLAYING EVENT: ${method} is now playing!`);
      successRef.current = true;
      
      // Save this successful method for future stream changes
      lastSuccessfulMethodRef.current = method;
      console.log(`Saved ${method} as last successful method`);
      
      // Clean up event listeners
      if (videoElement.current) {
        videoElement.current.removeEventListener('playing', onPlaying);
        videoElement.current.removeEventListener('error', onError);
      }
    };
    
    // Track when video errors
    const onError = () => {
      console.log(`VIDEO ERROR EVENT: ${method} encountered an error`);
      // We don't set success to false here because we want to try the next method
    };
    
    videoElement.current.addEventListener('playing', onPlaying);
    videoElement.current.addEventListener('error', onError);
    
    // Return cleanup function
    return () => {
      if (videoElement.current) {
        videoElement.current.removeEventListener('playing', onPlaying);
        videoElement.current.removeEventListener('error', onError);
      }
    };
  }, []);
  
  // Try methods in sequence
  const tryMethodSequence = useCallback((methods: string[]) => {
    // Reset trackers
    successRef.current = false;
    methodsTriedRef.current = [];
    
    const attemptNextMethod = (index: number) => {
      // Stop if we've tried all methods or found a successful one
      if (index >= methods.length || successRef.current) {
        console.log('Playback sequence complete, success:', successRef.current);
        
        // If we tried all methods and none worked, show error
        if (index >= methods.length && !successRef.current) {
          setError('Could not play stream with any available method');
        }
        
        return;
      }
      
      const currentMethodName = methods[index];
      console.log(`Trying method ${index + 1}/${methods.length}: ${currentMethodName}`);
      
      // Add to list of tried methods
      const currentTried = methodsTriedRef.current;
      methodsTriedRef.current = [...currentTried, currentMethodName];
      
      // Set UI state
      setAttemptingMethod(currentMethodName);
      setError(null);
      
      // Try current method
      tryMethod(currentMethodName);
      
      // Check after delay if this method works
      setTimeout(() => {
        // If success was detected via event listener, stop sequence
        if (successRef.current) {
          console.log(`Success detected for ${currentMethodName}, stopping sequence`);
          return;
        }
        
        // Additional check for playing state
        const isCurrentMethodActive = 
          currentMethod === PlaybackMethod[currentMethodName.toUpperCase() as keyof typeof PlaybackMethod];
        
        // Define what "playing successfully" means
        const isPlaying = 
          isCurrentMethodActive && 
          videoElement.current && 
          !videoElement.current.error && 
          videoElement.current.readyState >= 3 && 
          !videoElement.current.paused;
        
        console.log(`Method ${currentMethodName} status:`, {
          isCurrentMethodActive,
          hasVideoElement: !!videoElement.current,
          readyState: videoElement.current?.readyState,
          paused: videoElement.current?.paused,
          hasError: !!videoElement.current?.error
        });
        
        if (isPlaying) {
          // This method is working, stop the sequence
          console.log(`Method ${currentMethodName} is successfully playing, stopping sequence`);
          successRef.current = true;
          
          // Save this successful method for future stream changes
          lastSuccessfulMethodRef.current = currentMethodName;
          console.log(`Saved ${currentMethodName} as last successful method`);
          return;
        }
        
        // Try next method if current one failed
        attemptNextMethod(index + 1);
      }, 20000); // Slightly longer timeout to give more chance to detect playback
    };
    
    // Start with the first method
    attemptNextMethod(0);
  }, [currentMethod, tryMethod]);
  
  // Initialize player with the current src
  const initializePlayer = useCallback(() => {
    // Always use the current src from ref
    const currentSrc = srcRef.current;
    
    if (!containerRef.current) {
      console.error('Container ref not available');
      return;
    }
    
    // Ensure everything is cleaned up
    cleanup();
    
    // Determine stream type
    const streamType = getStreamType(currentSrc);
    console.log('Detected stream type:', streamType, 'for URL:', currentSrc);
    
    // Get methods to try based on stream type
    let methods = getMethodsForStreamType(streamType);
    
    // If we have a lastSuccessfulMethod, prioritize it by moving it to the front
    if (lastSuccessfulMethodRef.current) {
      const lastMethod = lastSuccessfulMethodRef.current;
      console.log(`Using last successful method as priority: ${lastMethod}`);
      
      // Remove the method from its current position
      methods = methods.filter(m => m !== lastMethod);
      
      // Add it to the front of the array
      methods.unshift(lastMethod);
    }
    
    // Try all methods in sequence
    console.log('Trying methods in sequence, starting with:', methods[0]);
    tryMethodSequence(methods);
  }, [cleanup, tryMethodSequence]);
  
  // Update the src ref and reinitialize player when src changes
  useEffect(() => {
    console.log(`VideoPlayer received new src: ${src}`);
    srcRef.current = src;
    
    // Skip on first mount as the main effect will handle it
    if (containerRef.current) {
      console.log('Source changed, reinitializing player with new source');
      
      // Store references to avoid closure issues
      const cleanupFn = cleanup;
      const initFn = initializePlayer;
      
      cleanupFn();
      
      // Initialize player with new source after a slight delay to ensure cleanup completes
      setTimeout(() => {
        console.log('Initializing new player after source change');
        initFn();
      }, 100);
    }
  }, [src]); // Only depend on src to avoid unnecessary rerenders
  
  // Main effect - runs once on mount
  useEffect(() => {
    console.log(`VideoPlayer MOUNTED, initializing player`);
    
    // Reset state
    setError(null);
    setCurrentMethod(null);
    methodsTriedRef.current = [];
    successRef.current = false;
    
    if (isForceReconnect) {
      setReconnecting(true);
      console.log('Force reconnect mode activated');
    }
    
    // Initialize the player once at mount time
    console.log(`Initial player initialization with src: ${srcRef.current}`);
    
    // Simple delay for force reconnect
    const initialDelay = isForceReconnect ? 500 : 0;
    
    // Store the initialize function to avoid closure issues
    const initFn = initializePlayer;
    const cleanupFn = cleanup;
    
    // Use timeout for initial setup
    const timeoutId = setTimeout(() => {
      initFn();
      
      // Turn off reconnecting state after initial setup if needed
      if (isForceReconnect) {
        setTimeout(() => setReconnecting(false), 2000);
      }
    }, initialDelay);
    
    // Cleanup on unmount
    return () => {
      console.log('VideoPlayer UNMOUNTING, cleaning up resources');
      clearTimeout(timeoutId);
      cleanupFn();
    };
  }, []); // Empty dependency array - only run once on mount
  
  return {
    containerRef,
    currentMethod,
    error,
    reconnecting,
    attemptingMethod,
    methodsTried: methodsTriedRef.current
  };
}