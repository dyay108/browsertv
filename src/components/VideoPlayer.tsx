import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  src: string;
}

// Different playback methods to try
enum PlaybackMethod {
  VideoJS = 'videojs',
  HLS = 'hls.js',
  MPEGTS = 'mpegts.js',
  NATIVE = 'native'
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  // Container reference 
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Player references - all players are created directly, not in nested divs
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

  // Helper to determine if this is a force reconnect
  const isForceReconnect = src.includes('forceReload=true');

  // Create a stable version of key data that won't lead to unnecessary rerenders
  const srcRef = useRef(src);
  
  // Only update ref for logging
  useEffect(() => {
    console.log(`VideoPlayer received new src: ${src}`);
    srcRef.current = src;
  }, [src]);
  
  // Main effect for player management - runs ONCE per mount
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
    
    // Centralized cleanup function
    const cleanup = () => {
      console.log('Cleaning up all players');
      
      // Clean up VideoJS
      if (vjsPlayer.current) {
        try {
          vjsPlayer.current.dispose();
        } catch (e) {
          console.error('Error cleaning up VideoJS:', e);
        }
        vjsPlayer.current = null;
      }
      
      // Clean up HLS.js
      if (hlsInstance.current) {
        try {
          hlsInstance.current.destroy();
        } catch (e) {
          console.error('Error cleaning up HLS.js:', e);
        }
        hlsInstance.current = null;
      }
      
      // Clean up mpegts.js
      if (mpegtsPlayer.current) {
        try {
          mpegtsPlayer.current.destroy();
        } catch (e) {
          console.error('Error cleaning up mpegts.js:', e);
        }
        mpegtsPlayer.current = null;
      }
      
      // Remove video element
      if (videoElement.current && videoElement.current.parentNode) {
        try {
          videoElement.current.pause();
          videoElement.current.removeAttribute('src');
          videoElement.current.load();
          videoElement.current.parentNode.removeChild(videoElement.current);
        } catch (e) {
          console.error('Error removing video element:', e);
        }
      }
      videoElement.current = null;
      
      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      
      // Reset state
      setCurrentMethod(null);
    };

    // Guess stream type
    const getStreamType = (url: string): string => {
      const lowerUrl = url.toLowerCase();
      
      if (lowerUrl.includes('.m3u8') || lowerUrl.includes('playlist.m3u')) {
        return 'hls';
      } else if (lowerUrl.includes('.ts') || lowerUrl.includes('mpeg')) {
        return 'mpegts';
      } else if (lowerUrl.includes('.mp4')) {
        return 'mp4';
      } else if (lowerUrl.includes('rtmp://')) {
        return 'rtmp';
      } else {
        // For IPTV, default to trying mpegts first
        return 'mpegts';
      }
    };

    // Main initialization function - always uses the latest src from ref
    const initializePlayer = () => {
      // Always use the current src from ref
      const currentSrc = srcRef.current;
      if (!containerRef.current) {
        console.error('Container ref not available');
        return;
      }
      
      // Ensure everything is cleaned up
      cleanup();
      
      // Double-check the container is truly empty using the most reliable method
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        console.log('Container emptied completely');
      }
      
      // Determine stream type - use the current src from ref
      const streamType = getStreamType(currentSrc);
      console.log('Detected stream type:', streamType, 'for URL:', currentSrc);
      
      // Try different playback methods based on stream type
      const tryMethod = (method: string) => {
        switch(method) {
          case 'hls':
            tryHls();
            break;
          case 'mpegts':
            tryMpegts();
            break;
          case 'videojs':
            tryVideoJs();
            break;
          case 'native':
          default:
            tryNative();
            break;
        }
      };
      
      // Initial method selection based on stream type and force flag
      let methods: string[];
      
      // Always try all methods in sequence, regardless of force reconnect
      if (streamType === 'hls') {
        methods = ['hls', 'videojs', 'mpegts', 'native'];
      } else if (streamType === 'mpegts') {
        methods = ['mpegts', 'videojs', 'hls', 'native'];
      } else {
        methods = ['native', 'videojs', 'hls', 'mpegts'];
      }
      
      // Try all methods in sequence with a small delay between attempts
      console.log('Trying all methods in sequence, starting with:', methods[0]);
      
      // Reset success tracker for new sequence
      successRef.current = false;
      
      // Reset methods tried
      methodsTriedRef.current = [];
      
      // Add video event listeners to help detect successful playback
      const setupPlaybackListeners = (method: string) => {
        if (!videoElement.current) return;
        
        // Track when video actually starts playing
        const onPlaying = () => {
          console.log(`VIDEO PLAYING EVENT: ${method} is now playing!`);
          successRef.current = true;
          
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
        
        return () => {
          if (videoElement.current) {
            videoElement.current.removeEventListener('playing', onPlaying);
            videoElement.current.removeEventListener('error', onError);
          }
        };
      };
      
      const tryMethodSequence = (index: number) => {
        // Stop if we've tried all methods or found a successful one
        if (index >= methods.length || successRef.current) {
          console.log('Playback sequence complete, success:', successRef.current);
          return;
        }
        
        const currentMethodName = methods[index];
        console.log(`Trying method ${index + 1}/${methods.length}: ${currentMethodName}`);
        
        // Add to list of tried methods
        methodsTriedRef.current = [...methodsTriedRef.current, currentMethodName];
        
        // Set UI state
        setAttemptingMethod(currentMethodName);
        setError(null);
        
        // Try current method
        tryMethod(currentMethodName);
        
        // Set up event listeners to detect successful playback
        const cleanupListeners = setupPlaybackListeners(currentMethodName);
        
        // Check after delay if this method works
        setTimeout(() => {
          // Clean up listeners from this attempt
          if (cleanupListeners) cleanupListeners();
          
          // If success was detected via event listener, stop sequence
          if (successRef.current) {
            console.log(`Success detected for ${currentMethodName}, stopping sequence`);
            return;
          }
          
          // Additional check for playing state
          const isCurrentMethodActive = currentMethod === PlaybackMethod[currentMethodName.toUpperCase() as keyof typeof PlaybackMethod];
          
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
            return;
          }
          
          // If not successful and not at the end, try next method
          if (index < methods.length - 1 && !successRef.current) {
            console.log(`Method ${currentMethodName} not playing successfully, trying next method`);
            tryMethodSequence(index + 1);
          } else if (!successRef.current) {
            console.log('Reached last method in sequence, no method was successful');
            // If no method was successful after trying all, set an error
            setError('Could not play stream with any available method');
          }
        }, 4000); // Slightly longer timeout to give more chance to detect playback
      };
      
      // Start the sequence with the first method
      tryMethodSequence(0);
      
      // VideoJS implementation
      function tryVideoJs() {
        console.log('Trying VideoJS method');
        cleanup(); // Ensure clean state
        
        if (!containerRef.current) return;
        
        // Ensure container is empty before adding new element
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        
        // Create video element with videojs class
        const video = document.createElement('video');
        video.className = 'video-js vjs-big-play-centered';
        video.controls = true;
        video.autoplay = true;
        
        // Add to container after container is empty
        containerRef.current.appendChild(video);
        videoElement.current = video;
        
        try {
          // Initialize videojs
          vjsPlayer.current = videojs(video, {
            controls: true,
            autoplay: true,
            preload: 'auto',
            fluid: true,
            sources: [{
              src: src,
              type: streamType === 'hls' ? 'application/x-mpegURL' : 
                    streamType === 'mpegts' ? 'video/MP2T' : 
                    'video/mp4'
            }],
            html5: {
              hls: { overrideNative: true },
              nativeAudioTracks: false,
              nativeVideoTracks: false
            }
          });
          
          // Set current method
          setCurrentMethod(PlaybackMethod.VideoJS);
          
          // Error handling
          vjsPlayer.current.on('error', () => {
            console.error('VideoJS error');
            // Log error but don't set global error - let tryMethodSequence handle errors
          });
          
        } catch (e) {
          console.error('Error initializing VideoJS:', e);
          // Only log, don't set global error yet - let tryMethodSequence handle errors
        }
      }
      
      // HLS.js implementation  
      function tryHls() {
        console.log('Trying HLS.js method');
        cleanup(); // Ensure clean state
        
        if (!containerRef.current) return;
        
        // Ensure container is empty
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        
        // Create fresh video element
        const video = document.createElement('video');
        video.id = 'hls-player-' + Date.now();
        video.className = 'video-player hls-player';
        video.controls = true;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.right = '0';
        video.style.bottom = '0';
        video.style.margin = 'auto';
        video.style.maxWidth = '100%';
        video.style.maxHeight = '100%';
        video.style.objectFit = 'contain';
        containerRef.current.appendChild(video);
        videoElement.current = video;
        
        if (!Hls.isSupported()) {
          console.log('HLS.js not supported');
          // Continue with other methods instead of showing error
          return;
        }
        
        try {
          // Create HLS instance
          hlsInstance.current = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            fragLoadingMaxRetry: 5
          });
          
          hlsInstance.current.loadSource(src);
          hlsInstance.current.attachMedia(videoElement.current);
          
          hlsInstance.current.on(Hls.Events.MANIFEST_PARSED, () => {
            if (videoElement.current) {
              videoElement.current.play().catch(e => {
                console.error('HLS play failed:', e);
              });
            }
          });
          
          // Set current method
          setCurrentMethod(PlaybackMethod.HLS);
          
          // Error handling
          hlsInstance.current.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              console.error('HLS.js fatal error:', data);
              // Only log, don't set global error yet
            }
          });
          
        } catch (e) {
          console.error('Error initializing HLS.js:', e);
          // Only log, don't set global error yet
        }
      }
      
      // mpegts.js implementation
      function tryMpegts() {
        console.log('Trying mpegts.js method');
        cleanup(); // Ensure clean state
        
        if (!containerRef.current) return;
        
        // Ensure container is empty
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        
        // Create fresh video element
        const video = document.createElement('video');
        video.id = 'mpegts-player-' + Date.now();
        video.className = 'video-player mpegts-player';
        video.controls = true;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.right = '0';
        video.style.bottom = '0';
        video.style.margin = 'auto';
        video.style.maxWidth = '100%';
        video.style.maxHeight = '100%';
        video.style.objectFit = 'contain';
        containerRef.current.appendChild(video);
        videoElement.current = video;
        
        if (!mpegts.isSupported()) {
          console.log('mpegts.js not supported');
          // Continue with other methods instead of showing error
          return;
        }
        
        try {
          // Create mpegts.js player
          mpegtsPlayer.current = mpegts.createPlayer({
            type: 'mpegts',
            url: src,
            isLive: true,
            cors: true
          });
          
          mpegtsPlayer.current.attachMediaElement(videoElement.current);
          mpegtsPlayer.current.load();
          
          videoElement.current.play().catch(e => {
            console.error('mpegts.js play failed:', e);
          });
          
          // Set current method
          setCurrentMethod(PlaybackMethod.MPEGTS);
          
          // Error handling
          mpegtsPlayer.current.on(mpegts.Events.ERROR, (err) => {
            console.error('mpegts.js error:', err);
            // Only log, don't set global error yet
          });
          
        } catch (e) {
          console.error('Error initializing mpegts.js:', e);
          // Only log, don't set global error yet
        }
      }
      
      // Native video implementation (fallback)
      function tryNative() {
        console.log('Trying native video method');
        cleanup(); // Ensure clean state
        
        if (!containerRef.current) return;
        
        // Ensure container is empty
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        
        // Create fresh video element
        const video = document.createElement('video');
        video.id = 'native-player-' + Date.now();
        video.className = 'video-player native-player';
        video.controls = true;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.right = '0';
        video.style.bottom = '0';
        video.style.margin = 'auto';
        video.style.maxWidth = '100%';
        video.style.maxHeight = '100%';
        video.style.objectFit = 'contain';
        containerRef.current.appendChild(video);
        videoElement.current = video;
        
        try {
          // Set source directly
          videoElement.current.src = src;
          
          // Attempt to play
          videoElement.current.play().catch(e => {
            console.error('Native video play failed:', e);
            // Only log, don't set global error yet
          });
          
          // Set current method
          setCurrentMethod(PlaybackMethod.NATIVE);
          
        } catch (e) {
          console.error('Error with native video:', e);
          // Only log, don't set global error yet
        }
      }
    };
    
    // Timeouts for initialization and cleanup
    let reconnectTimeoutId: NodeJS.Timeout | null = null;
    
    // Use a single approach that respects force reconnect
    const timeoutId = setTimeout(() => {
      console.log(`Initializing player with src: ${srcRef.current}`);
      initializePlayer();
      
      // Turn off reconnecting state after a delay if needed
      if (isForceReconnect) {
        reconnectTimeoutId = setTimeout(() => setReconnecting(false), 2000);
      }
    }, isForceReconnect ? 500 : 0);
    
    // Comprehensive cleanup on unmount
    return () => {
      console.log('VideoPlayer UNMOUNTING, cleaning up resources');
      clearTimeout(timeoutId);
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      cleanup();
    };
  }, []); // Empty dependency array - only run ONCE per mount/unmount

  return (
    <div className="player-wrapper">
      {/* Single container for all player types - fixed size*/}
      <div 
        className="video-container"
        ref={containerRef}
      />
      
      {/* Loading indicator while trying different methods */}
      {!currentMethod && !error && methodsTriedRef.current.length > 0 && (
        <div className="trying-players-overlay">
          <div className="loading-spinner"></div>
          <p>Trying compatible player methods...</p>
          {attemptingMethod && (
            <p className="trying-method">Currently trying: {attemptingMethod}</p>
          )}
        </div>
      )}
      
      {/* Reconnecting overlay */}
      {reconnecting && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Reconnecting to stream...</p>
        </div>
      )}
      
      {/* Player method indicator */}
      {currentMethod && !error && !reconnecting && (
        <div className="player-info">
          Playing with {currentMethod}
        </div>
      )}
      
      {/* Error display - only shown after all methods have been tried */}
      {error && !reconnecting && methodsTriedRef.current.length > 0 && (
        <div className="video-error">
          <p>{error}</p>
          <p>This stream appears to be incompatible after trying all available player methods.</p>
          
          <div className="error-help">
            <h4>Troubleshooting Steps:</h4>
            <ol>
              <li>Try the &quot;Force Reconnect&quot; button which attempts more aggressive connection methods</li>
              <li>Make sure the stream is active and accessible</li>
              <li>Check if the URL requires authentication or has region restrictions</li>
              <li>The stream might use codecs not supported by browsers (works in VLC but not here)</li>
              <li>CORS policy may be blocking browser access to the stream</li>
              <li>Stream may use protocols like RTMP that aren&apos;t fully supported in browsers</li>
            </ol>
          </div>
          
          <p className="error-suggestion">
            <strong>Try:</strong> Using a stream with HLS/m3u8 format from a source that allows CORS
          </p>
          
          <p className="error-suggestion">
            <strong>Note:</strong> Streams that worked previously may stop working due to server-side changes or temporary issues
          </p>
          
          <p className="error-details">
            Tried player methods: {methodsTriedRef.current.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;