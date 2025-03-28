import React, { useEffect, useCallback } from 'react';
import VideoPlayer from '../VideoPlayer';
import NowPlayingInfo from './NowPlayingInfo';
import StreamControls from './StreamControls';
import { IChannel } from '../../db';
import { useUiVisibility } from '../../hooks/useUiVisibility';
import { useSharedStreamControl } from '../../contexts/streamContext';

interface VideoPlayerContainerProps {
  selectedChannel: IChannel | null;
  initialStreamUrl: string;
  isDirectStreamMode?: boolean;
  isLoadingChannels: boolean;
  onReturnToMain?: () => void;
  onShowSidebar: () => void;
  onChannelSelect?: (channel: IChannel | null) => void;
}

/**
 * Container component that manages the video player and its controls
 */
const VideoPlayerContainer: React.FC<VideoPlayerContainerProps> = ({
  selectedChannel,
  initialStreamUrl,
  isDirectStreamMode = false,
  isLoadingChannels,
  onReturnToMain,
  onShowSidebar,
  onChannelSelect
}) => {
  // Use custom hooks for stream control and UI visibility
  const { 
    currentStream, 
    key, 
    loading, 
    retryStream, 
    forceReconnect, 
    clearStream: clearStreamHook,
    // setCurrentStream 
  } = useSharedStreamControl();
  
  // Enhanced clear stream function that also clears the selected channel
  const clearStream = useCallback(() => {
    clearStreamHook(); // Clear stream in the hook
    
    // If in direct stream mode and we have onReturnToMain, go back to main view
    if (isDirectStreamMode && onReturnToMain) {
      onReturnToMain();
    } 
    // Otherwise, clear the selected channel and show the sidebar
    else {
      // Clear selected channel if we have a way to communicate this
      if (typeof onChannelSelect === 'function') {
        onChannelSelect(null); // Set selected channel to null
      }
      
      // Show the sidebar for channel selection
      typeof onShowSidebar === 'function' && onShowSidebar();
    }
  }, [clearStreamHook, onReturnToMain, isDirectStreamMode, onShowSidebar, onChannelSelect]);
  
  const {
    controlsVisible,
    nowPlayingVisible,
    hideUIElementsWithDelay,
    showUIElements
  } = useUiVisibility();

  // Track mount/unmount for debugging
  useEffect(() => {
    console.log('VideoPlayerContainer MOUNTED');
    return () => {
      console.log('VideoPlayerContainer UNMOUNTING, state:', { 
        hasCurrentStream: !!currentStream, 
        key, 
        loading
      });
    };
  }, []);

  // Effect to hide UI elements after delay when stream is playing
  useEffect(() => {
    if (currentStream) {
      console.log('Setting up UI control for stream:', currentStream);
      
      // Initial hide after mount
      hideUIElementsWithDelay();
      
      // Add mouse movement event to show controls temporarily
      const handleMouseMove = () => {
        showUIElements();
      };
      
      // Add event listener
      window.addEventListener('mousemove', handleMouseMove);
      
      // Cleanup
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [currentStream, hideUIElementsWithDelay, showUIElements]);

  return (
    <div className="player-fullscreen">
      {/* Loading overlay - show during load */}
      {(isLoadingChannels && !isDirectStreamMode) || loading  ? (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>
            {isLoadingChannels ? "Loading Channels..." :
             "Loading Stream..."}
          </p>
        </div>
      ) : null}
      
      {(currentStream) ? (
        <div className="player-container">
          {selectedChannel && !isDirectStreamMode && (
            <NowPlayingInfo
              channel={selectedChannel}
              visible={nowPlayingVisible}
              onShowSidebar={onShowSidebar}
            />
          )}

          <div className="player-mount-point">
            <VideoPlayer src={currentStream} />
          </div>

          <StreamControls
            onRetry={retryStream}
            onForceReconnect={forceReconnect}
            onClear={clearStream}
            onReturnToMain={onReturnToMain}
            isDirectStreamMode={isDirectStreamMode}
            visible={controlsVisible}
            loading={loading}
          />
        </div>
      ) : (
        <div className="no-player-message">
          Select a channel from the list to start watching
          <div className="no-player-buttons">
            <button
              onClick={onShowSidebar}
              className="show-channels-button"
              title="Show channels list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              Show Channels
            </button>
            {onReturnToMain && (
              <button
                onClick={onReturnToMain}
                className="return-button"
                title="Return to main view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6l-12 12"></path>
                  <path d="M6 6l12 12"></path>
                </svg>
                Return to Main View
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayerContainer;