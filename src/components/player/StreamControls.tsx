import React from 'react';

interface StreamControlsProps {
  onRetry: () => void;
  onForceReconnect: () => void;
  onClear: () => void;
  onReturnToMain?: () => void;
  isDirectStreamMode?: boolean;
  visible: boolean;
  loading: boolean;
}

/**
 * Controls for stream playback (retry, force reconnect, clear)
 */
const StreamControls: React.FC<StreamControlsProps> = ({
  onRetry,
  onForceReconnect,
  onClear,
  onReturnToMain,
  isDirectStreamMode = false,
  visible,
  loading
}) => {
  return (
    <>
      <div className={`stream-controls player-controls top-controls ${visible ? 'visible' : 'hidden'}`}>
        <button
          onClick={onRetry}
          className="retry-button"
          disabled={loading}
          title="Retry with cache-busting"
        >
          Retry Stream
        </button>
        <button
          onClick={onForceReconnect}
          className="force-button"
          disabled={loading}
          title="Force a complete reconnection to the stream"
        >
          Force Reconnect
        </button>
        <button
          onClick={onClear}
          className="clear-button"
          title="Clear current stream"
        >
          Clear Stream
        </button>
      </div>
      
      {/* Close button to return to main view */}
      {isDirectStreamMode && onReturnToMain && (
        <button 
          onClick={onReturnToMain}
          className="close-player-button"
          title="Return to main view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </>
  );
};

export default StreamControls;