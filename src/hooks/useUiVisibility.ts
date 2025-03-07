import { useState, useCallback, useRef, useEffect } from 'react';

interface UiVisibilityHookResult {
  controlsVisible: boolean;
  nowPlayingVisible: boolean;
  sidebarVisible: boolean;
  setControlsVisible: (visible: boolean) => void;
  setNowPlayingVisible: (visible: boolean) => void;
  setSidebarVisible: (visible: boolean) => void;
  showUIElements: () => void;
  hideUIElementsWithDelay: () => void;
  showSidebar: () => void;
  startSidebarHideTimer: () => void;
  clearSidebarHideTimer: () => void;
}

/**
 * Custom hook to manage UI element visibility for the video player interface
 * 
 * @param autoHideDelay Delay in ms before hiding UI elements (default: 3000)
 * @returns Object containing visibility states and control functions
 */
export function useUiVisibility(autoHideDelay = 3000): UiVisibilityHookResult {
  // UI visibility states
  const [controlsVisible, setControlsVisible] = useState(true);
  const [nowPlayingVisible, setNowPlayingVisible] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Refs for timeout IDs
  const controlsTimeoutRef = useRef<number | null>(null);
  const nowPlayingTimeoutRef = useRef<number | null>(null);
  const sidebarTimeoutRef = useRef<number | null>(null);

  // Function to clear sidebar timeout
  const clearSidebarHideTimer = useCallback(() => {
    if (sidebarTimeoutRef.current) {
      window.clearTimeout(sidebarTimeoutRef.current);
      sidebarTimeoutRef.current = null;
    }
  }, []);

  // Function to start sidebar hide timer
  const startSidebarHideTimer = useCallback(() => {
    // Clear any existing timeout first
    clearSidebarHideTimer();
    
    // Set new timeout to hide the sidebar after delay
    sidebarTimeoutRef.current = window.setTimeout(() => {
      setSidebarVisible(false);
    }, autoHideDelay);
  }, [autoHideDelay, clearSidebarHideTimer]);

  // Function to hide UI elements after delay
  const hideUIElementsWithDelay = useCallback(() => {
    // Clear any existing timeouts
    clearSidebarHideTimer();
    
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (nowPlayingTimeoutRef.current) {
      window.clearTimeout(nowPlayingTimeoutRef.current);
    }

    // Set new timeouts - except for sidebar which is now handled separately
    controlsTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, autoHideDelay);

    nowPlayingTimeoutRef.current = window.setTimeout(() => {
      setNowPlayingVisible(false);
    }, autoHideDelay);
  }, [autoHideDelay, clearSidebarHideTimer]);

  // Function to show all UI elements
  const showUIElements = useCallback(() => {
    // Clear any existing timeouts
    clearSidebarHideTimer();
    
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    if (nowPlayingTimeoutRef.current) {
      window.clearTimeout(nowPlayingTimeoutRef.current);
      nowPlayingTimeoutRef.current = null;
    }

    // Show all elements
    setSidebarVisible(true);
    setControlsVisible(true);
    setNowPlayingVisible(true);

    // Set new timeout to hide other elements again
    hideUIElementsWithDelay();
  }, [hideUIElementsWithDelay, clearSidebarHideTimer]);

  // Function to show just the sidebar
  const showSidebar = useCallback(() => {
    // Clear any existing timeout for sidebar
    clearSidebarHideTimer();

    // Show the sidebar
    setSidebarVisible(true);
  }, [clearSidebarHideTimer]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (sidebarTimeoutRef.current) {
        window.clearTimeout(sidebarTimeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
      if (nowPlayingTimeoutRef.current) {
        window.clearTimeout(nowPlayingTimeoutRef.current);
      }
    };
  }, []);

  return {
    controlsVisible,
    nowPlayingVisible,
    sidebarVisible,
    setControlsVisible,
    setNowPlayingVisible,
    setSidebarVisible,
    showUIElements,
    hideUIElementsWithDelay,
    showSidebar,
    startSidebarHideTimer,
    clearSidebarHideTimer
  };
}