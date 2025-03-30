import React from 'react';
import { usePlayerManager } from '../hooks/usePlayerManager';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  src: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  // Use the player manager hook to handle all player initialization and control
  const {
    containerRef,
    currentMethod,
    error,
    reconnecting,
    attemptingMethod,
    methodsTried
  } = usePlayerManager(src);
  
  return (
    <div className="player-wrapper">
      {/* Single container for all player types */}
      <div 
        className="video-container"
        ref={containerRef}
      />
      
      {/* Loading indicator while trying different methods */}
      {!currentMethod && !error && methodsTried.length > 0 && (
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
      {error && !reconnecting && methodsTried.length > 0 && (
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
            Tried player methods: {methodsTried.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;