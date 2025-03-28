import { useState, useCallback } from 'react';
import { Playlist } from '../types/pocketbase-types';
import { prepareProxyUrl } from '../utils/m3uParser';
import { parseM3UContent, playlistService } from '../services';

interface PlaylistHookResult {
  selectedPlaylist: Playlist | null;
  playlistUrl: string;
  playlistName: string;
  customPlaylistName: string;
  processingStatus: string;
  loading: boolean;
  isUpdating: boolean;
  useCorsProxy: boolean;
  corsProxyUrl: string;
  setCustomPlaylistName: (name: string) => void;
  setPlaylistUrl: (url: string) => void;
  setUseCorsProxy: (use: boolean) => void;
  setCorsProxyUrl: (url: string) => void;
  fetchPlaylistFromUrl: (url: string, playlistId?: string) => Promise<void>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleLoadPlaylist: (playlist: Playlist) => Promise<void>;
  handleUpdatePlaylist: () => Promise<void>;
}

/**
 * Custom hook to manage playlist loading, updating, and related state with PocketBase
 * 
 * @returns Object containing playlist state and management functions
 */
export function usePlaylistManagement(): PlaylistHookResult {
  // Playlist state
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [customPlaylistName, setCustomPlaylistName] = useState('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // CORS proxy settings
  const [useCorsProxy, setUseCorsProxy] = useState(false);
  const [corsProxyUrl, setCorsProxyUrl] = useState('');

  // Timeout for fetching playlists
  const fetchTimeout = 30000; // 30 seconds timeout

  // Process M3U content (used by both file upload and URL fetch)
  const processM3UContent = async (content: string, name: string, existingPlaylistId?: string) => {
    setProcessingStatus('Analyzing content size...');

    try {
      const contentSizeMB = Math.round(content.length / 1024 / 1024 * 10) / 10;
      console.log(`Content size: ${contentSizeMB} MB`);

      // Show file size in the status
      setProcessingStatus(`Parsing ${contentSizeMB} MB of M3U data...`);
      setLoading(true);

      let playlist: Playlist;

      if (existingPlaylistId) {
        // Update existing playlist
        playlist = await playlistService.updatePlaylist(
          existingPlaylistId,
          name || 'Unnamed Playlist',
          playlistUrl || null
        );
        console.log(`Updated existing playlist with ID: ${existingPlaylistId}`);
      } else {
        // Create a new playlist
        playlist = await playlistService.createPlaylist(
          name || 'Unnamed Playlist',
          playlistUrl || null
        );
        console.log(`Created new playlist with ID: ${playlist.id}`);
      }

      // Parse M3U content to extract channels and groups
      await parseM3UContent(content, playlist.id);

      setSelectedPlaylist(playlist);
      
      // Clear status and loading states
      setProcessingStatus('');
      setLoading(false);
      setIsUpdating(false);
      
      return playlist.id;
    } catch (error) {
      console.error('Error processing content:', error);
      setProcessingStatus('Error processing playlist file');
      setLoading(false);
      setIsUpdating(false);
      throw error;
    }
  };

  // Handler for file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setLoading(true);
    setProcessingStatus('Reading file...');

    // Clear URL when loading from file
    setPlaylistUrl('');

    // Use custom name if provided, otherwise use filename without extension
    const fileName = file.name.replace(/\.[^/.]+$/, "");
    const finalName = customPlaylistName.trim() || fileName;
    setPlaylistName(finalName);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        if (content) {
          await processM3UContent(content, finalName);

          // Reset custom name field after successful upload
          setCustomPlaylistName('');
        }
      } catch (error) {
        console.error('Error processing file:', error);
        setProcessingStatus('Error processing file');
        setLoading(false);
      }
    };

    reader.onerror = () => {
      console.error('Error reading file');
      setLoading(false);
    };

    reader.readAsText(file);
  }, [customPlaylistName]);

  // Fetch playlist from URL
  const fetchPlaylistFromUrl = useCallback(async (url: string, playlistId?: string) => {
    if (!url.trim()) {
      setProcessingStatus('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setIsUpdating(true);

    // Prepare final URL with CORS proxy if needed
    let finalUrl = url;
    const alreadyUsingProxy = url.includes(corsProxyUrl);

    if (useCorsProxy && !alreadyUsingProxy && corsProxyUrl) {
      finalUrl = prepareProxyUrl(corsProxyUrl, url);
      setProcessingStatus(`Fetching playlist from URL: ${url} (using CORS proxy)`);
      console.log(`Using CORS proxy for M3U fetch:`, finalUrl);
    } else {
      setProcessingStatus(`Fetching playlist from URL: ${url}`);
    }

    // Set up AbortController for fetch timeout
    const controller = new AbortController();
    let timeoutId: number | undefined;

    try {
      timeoutId = window.setTimeout(() => controller.abort(), fetchTimeout);

      // Fetch the playlist using the potentially proxied URL
      const response = await fetch(finalUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/plain, */*'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Use streaming response for large files
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("Failed to get reader from response");
      }

      let receivedLength = 0;
      let chunks: Uint8Array[] = [];
      const contentLength = response.headers.get('Content-Length');
      const hasContentLength = contentLength && !isNaN(parseInt(contentLength));
      const estimatedSize = hasContentLength ?
        Math.round(parseInt(contentLength) / 1024 / 1024 * 10) / 10 :
        "unknown";

      console.log(`Streaming download started, estimated size: ${hasContentLength ? estimatedSize + ' MB' : 'unknown'}`);

      // Read the response in chunks
      // eslint-disable-next-line
      while (true) {
        try {
          const { done, value } = await reader.read();

          if (done) {
            console.log(`Streaming completed, total received: ${Math.round(receivedLength / 1024 / 1024 * 10) / 10} MB`);
            break;
          }

          chunks.push(value);
          receivedLength += value.length;

          // Update progress about every 5MB or every 10 chunks if size unknown
          if ((hasContentLength && receivedLength % (5 * 1024 * 1024) < 100000) ||
            (!hasContentLength && chunks.length % 10 === 0)) {

            if (hasContentLength) {
              const progress = Math.round((receivedLength / parseInt(contentLength)) * 100);
              setProcessingStatus(`Downloading: ${Math.round(receivedLength / 1024 / 1024 * 10) / 10} MB of ${estimatedSize} MB (${progress}%)`);
            } else {
              setProcessingStatus(`Downloading: ${Math.round(receivedLength / 1024 / 1024 * 10) / 10} MB received...`);
            }
          }
        } catch (readError) {
          console.error("Error during streaming read:", readError);
          // Try to continue reading if possible
          if (chunks.length > 0) {
            setProcessingStatus(`Error during download but continuing with ${chunks.length} chunks received...`);
          } else {
            throw new Error("Error during file streaming: " + (readError instanceof Error ? readError.message : String(readError)));
          }
        }
      }

      // Safety check - if we received nothing, throw error
      if (receivedLength === 0 || chunks.length === 0) {
        throw new Error("Received empty response from server");
      }

      setProcessingStatus(`Processing ${Math.round(receivedLength / 1024 / 1024 * 10) / 10} MB of downloaded data...`);

      // Combine all chunks
      let chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      // Convert to text
      const content = new TextDecoder("utf-8").decode(chunksAll);

      // Free memory
      chunksAll = new Uint8Array(0);
      chunks = [];

      // Validate content
      if (!content || content.trim() === '') {
        setProcessingStatus('Received empty content from URL');
        setLoading(false);
        setIsUpdating(false);
        return;
      }

      // Check if it's a valid M3U file
      if (!content.includes('#EXTM3U')) {
        setProcessingStatus('Invalid M3U file format');
        setLoading(false);
        setIsUpdating(false);
        return;
      }

      // Save the URL for future updates
      setPlaylistUrl(url); // Store the original URL, not the proxy URL

      let name: string;

      if (playlistId) {
        // If we're updating an existing playlist, get its name
        try {
          const existingPlaylist = await playlistService.getPlaylist(playlistId);
          name = existingPlaylist.name;
        } catch (error) {
          name = "Unknown Playlist";
        }
      } else {
        // Extract playlist name from URL if no custom name is set
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, ""); // Last part of path, without extension

        // Use custom name if provided, otherwise use file name from URL, or a default
        name = customPlaylistName.trim() || fileName || 'Playlist from URL';
      }
      
      setPlaylistName(name);

      // Reset custom name field after successful fetch
      setCustomPlaylistName('');

      // Process the content
      await processM3UContent(content, name, playlistId);
      setIsUpdating(false);

    } catch (error) {
      setIsUpdating(false);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      console.error('Error fetching playlist:', error);

      // Handle the error with proper type checking
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setProcessingStatus('Request timed out. Check the URL and try again.');
        }
        else if (error.name === 'TypeError' &&
          (error.message.includes('Failed to fetch') ||
            error.message.includes('Network request failed'))) {
          // This is likely a CORS error
          if (!useCorsProxy) {
            setProcessingStatus(`CORS error detected. Try enabling the CORS Proxy option and providing a valid CORS proxy URL.`);
          } else {
            setProcessingStatus(`Network error occurred. Your CORS proxy may not be working correctly.`);
          }
        }
        else if (error.message.includes('HTTP error! Status: 404')) {
          setProcessingStatus(`Playlist not found (404). Verify the URL is correct and accessible.`);
        }
        else if (error.message.includes('HTTP error! Status: 403')) {
          setProcessingStatus(`Access forbidden (403). The server is refusing access to this resource.`);
        }
        else {
          setProcessingStatus(`Error fetching playlist: ${error.message}`);
        }
      } else {
        // For unknown error types
        setProcessingStatus('An unknown error occurred while fetching the playlist');
      }

      setLoading(false);
      setIsUpdating(false);
    } finally {
      // Ensure we reset state even if some unexpected error occurs
      if (loading || isUpdating) {
        console.log('Cleanup in finally block');
        setLoading(false);
        setIsUpdating(false);
      }
    }
  }, [corsProxyUrl, customPlaylistName, loading, isUpdating, useCorsProxy]);

  // Load a saved playlist
  const handleLoadPlaylist = useCallback(async (playlist: Playlist) => {
    if (!playlist || !playlist.id) return;

    setLoading(true);
    setProcessingStatus('Loading playlist...');

    try {
      // Update the last used timestamp
      await playlistService.updatePlaylistUsage(playlist.id);

      // Set the selected playlist
      setSelectedPlaylist(playlist);

      // Set playlist info
      setPlaylistName(playlist.name);

      // Store the URL if available
      setPlaylistUrl(playlist.url || '');

      console.log(`Loaded playlist: ${playlist.name}${playlist.url ? ` (URL: ${playlist.url})` : ''}`);
    } catch (error) {
      console.error('Error loading playlist:', error);
      setProcessingStatus('Error loading playlist');
    } finally {
      setProcessingStatus('');
      setLoading(false);
    }
  }, []);

  // Update current playlist from its URL
  const handleUpdatePlaylist = useCallback(async () => {
    if (!playlistUrl) {
      setProcessingStatus('No URL available for this playlist');
      return;
    }

    if (!selectedPlaylist || !selectedPlaylist.id) {
      setProcessingStatus('No playlist selected to update');
      return;
    }

    // Re-fetch the playlist from the URL and update the existing playlist
    await fetchPlaylistFromUrl(playlistUrl, selectedPlaylist.id);
  }, [playlistUrl, fetchPlaylistFromUrl, selectedPlaylist]);

  return {
    selectedPlaylist,
    playlistUrl,
    playlistName,
    customPlaylistName,
    processingStatus,
    loading,
    isUpdating,
    useCorsProxy,
    corsProxyUrl,
    setCustomPlaylistName,
    setPlaylistUrl,
    setUseCorsProxy,
    setCorsProxyUrl,
    fetchPlaylistFromUrl,
    handleFileUpload,
    handleLoadPlaylist,
    handleUpdatePlaylist
  };
}