import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Channel, Playlist } from '../../types/pocketbase-types';
import { useLiveQuery } from 'dexie-react-hooks';
import { usePlaylistManagement } from '../../hooks/usePlaylistManagement';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import PlaylistUploader from './PlaylistUploader';
import UrlPlaylistLoader from './UrlPlaylistLoader';
import DirectStreamInput from './DirectStreamInput';
import RecentPlaylists from './RecentPlaylists';
import PlaylistViewer from './PlaylistViewer';
import { useSharedStreamControl } from '../../contexts/streamContext';
import { favoriteService, playlistService } from '../../services';

/**
 * Main component that manages playlist selection, file upload, and URL loading
 */
const PlaylistManager: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  // Track if a favorites request is in progress
  const isFetchingFavorites = useRef(false);
  // Track the last playlist ID to prevent duplicate requests
  const lastFetchedPlaylistId = useRef<string | null>(null);
  
  // State for overall app flow
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [isDirectStreamMode, setIsDirectStreamMode] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [favoritesCount, setFavoritesCount] = useState(0);

  // Pagination state for playlists
  const [playlistCurrentPage, setPlaylistCurrentPage] = useState(0);
  const [playlistTotalPages, setPlaylistTotalPages] = useState(0);
  const [playlistsPerPage] = useState(10); // Load 10 playlists at a time

  // Use playlist management hook
  const {
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
  } = usePlaylistManagement();

  // Use stream control hook for direct streaming
  const { playStream, clearStream: clearStreamHook } = useSharedStreamControl(); 

  // Use a basic debounce for the getPlaylists function to prevent multiple calls
  const lastFetchTime = useRef(0);
  const getPlaylistsDebounced = useCallback(() => {
    // Return a promise (required for useLiveQuery)
    return new Promise<Playlist[]>((resolve) => {
      const now = Date.now();
      
      // If we've fetched recently, delay the next fetch
      if (now - lastFetchTime.current < 2000) {
        // Wait a bit before fetching again
        setTimeout(() => {
          // Use .then() instead of async/await in the Promise constructor
          playlistService.getPlaylists()
            .then(playlists => {
              lastFetchTime.current = Date.now();
              resolve(playlists);
            })
            .catch(error => {
              console.error('Error fetching playlists:', error);
              resolve([]); // Resolve with empty array on error
            });
        }, 2000);
      } else {
        // Fetch immediately if it's been a while
        playlistService.getPlaylists()
          .then(playlists => {
            lastFetchTime.current = Date.now();
            resolve(playlists);
          })
          .catch(error => {
            console.error('Error fetching playlists:', error);
            resolve([]); // Resolve with empty array on error
          });
      }
    });
  }, []);
  
  // Fetch recent playlists from database
  const allRecentPlaylists = useLiveQuery(() => getPlaylistsDebounced(), []);
  
  // Calculate playlists for current page
  const recentPlaylists = React.useMemo(() => {
    if (!allRecentPlaylists) return [];
    const start = playlistCurrentPage * playlistsPerPage;
    const end = start + playlistsPerPage;
    return allRecentPlaylists.slice(start, end);
  }, [allRecentPlaylists, playlistCurrentPage, playlistsPerPage]);

  // Update playlist total pages when allRecentPlaylists changes
  useEffect(() => {
    if (allRecentPlaylists) {
      const pages = Math.ceil(allRecentPlaylists.length / playlistsPerPage);
      setPlaylistTotalPages(pages);
    }
  }, [allRecentPlaylists, playlistsPerPage]);

  // Load favorites count
  useEffect(() => {
    // Function to fetch favorites count with debounce
    const fetchFavoritesCount = (playlistId: string) => {
      // Skip if already fetching or if it's the same playlist
      if (isFetchingFavorites.current || playlistId === lastFetchedPlaylistId.current) {
        return;
      }
      
      // Set fetching flag
      isFetchingFavorites.current = true;
      lastFetchedPlaylistId.current = playlistId;
      
      favoriteService.getFavoriteChannelCount(playlistId)
        .then(count => {
          setFavoritesCount(count);
        })
        .catch(error => {
          console.error('Error loading favorites count:', error);
        })
        .finally(() => {
          // Reset fetching flag
          isFetchingFavorites.current = false;
        });
    };
    
    if (selectedPlaylist?.id) {
      // Use a small timeout to handle potential double-invocation in dev mode
      const timeoutId = setTimeout(() => {
        fetchFavoritesCount(selectedPlaylist.id);
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedPlaylist?.id]);

  // Handle direct stream submission
  const handleDirectStreamSubmit = useCallback((url: string) => {
    setIsFileUploaded(true);
    setIsDirectStreamMode(true);
    playStream(url);
  }, [playStream, setIsFileUploaded, setIsDirectStreamMode]);

  // Function to return to the main upload view
  const returnToMainView = useCallback(() => {
    // Clear the current stream
    setIsFileUploaded(false);
    setIsDirectStreamMode(false);
    setSelectedChannel(null);
    clearStreamHook();
  }, []);

  // Handler for channel selection
  const handleChannelSelect = useCallback((channel: Channel | null) => {
    setSelectedChannel(channel);
    if (channel) {
      playStream(channel.url);
    }
  }, [playStream]);

  // Handler for logging out
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Handler for deleting a playlist
  const handleDeletePlaylist = useCallback(async (id: string) => {
    try {
      await playlistService.deletePlaylist(id);
      // Reset the last fetch time to trigger a refresh
      lastFetchTime.current = 0;
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  }, []);

  // Handler for playlist selection
  const handlePlaylistSelection = useCallback((playlist: Playlist) => {
    handleLoadPlaylist(playlist);
    setIsFileUploaded(true);
  }, [handleLoadPlaylist]);

  // Handlers for pagination
  const handleNextPage = useCallback(() => {
    setPlaylistCurrentPage(prev => prev + 1);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPlaylistCurrentPage(prev => prev - 1);
  }, []);

  // Handler for file upload
  const handleUploadFile = useCallback((e: any) => {
    handleFileUpload(e);
    setIsFileUploaded(true);
  }, [handleFileUpload]);

  // Handler for URL playlist fetch
  const handleFetchPlaylist = useCallback(() => {
    fetchPlaylistFromUrl(playlistUrl);
    setIsFileUploaded(true);
  }, [fetchPlaylistFromUrl, playlistUrl]);

  // Handler for CORS proxy toggle
  const handleToggleCorsProxy = useCallback(() => {
    setUseCorsProxy(!useCorsProxy);
  }, [useCorsProxy, setUseCorsProxy]);

  return (
    <main className="App-main">
      {!isFileUploaded ? (
        // Upload/Main View
        <div className="upload-layout">
          <div className="m3u-upload-container">
            <div className="header-with-logout">
              <h2>BrowserTV</h2>
              <button 
                onClick={handleLogout}
                className="upload-logout-button"
                title="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </button>
            </div>

            <RecentPlaylists 
              playlists={recentPlaylists}
              onSelectPlaylist={handlePlaylistSelection}
              onDeletePlaylist={handleDeletePlaylist}
              currentPage={playlistCurrentPage}
              totalPages={playlistTotalPages}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
            />

            <PlaylistUploader 
              customPlaylistName={customPlaylistName}
              onNameChange={setCustomPlaylistName}
              onFileUpload={handleUploadFile}
              loading={loading}
            />

            <DirectStreamInput 
              onSubmit={handleDirectStreamSubmit}
              loading={loading}
            />

            <UrlPlaylistLoader 
              customPlaylistName={customPlaylistName}
              onNameChange={setCustomPlaylistName}
              playlistUrl={playlistUrl}
              onUrlChange={setPlaylistUrl}
              onFetchPlaylist={handleFetchPlaylist}
              loading={loading}
              useCorsProxy={useCorsProxy}
              onToggleCorsProxy={handleToggleCorsProxy}
              corsProxyUrl={corsProxyUrl}
              onCorsProxyUrlChange={setCorsProxyUrl}
              processingStatus={processingStatus}
            />

            <div className="help-text">
              <h3>How to use:</h3>
              <ol>
                <li>Upload an IPTV M3U playlist file using the button above</li>
                <li>Your playlist will be saved automatically for future use</li>
                <li>Browse channels by group and click on a channel to start streaming</li>
                <li>If a stream doesn&apos;t play, try the &quot;Force Reconnect&quot; button</li>
              </ol>
              <p>Note: Your playlists are stored locally in your browser and never uploaded to any server.</p>
            </div>
          </div>
        </div>
      ) : (
        // Playlist View with Player
        <PlaylistViewer 
          selectedPlaylist={selectedPlaylist}
          playlistName={playlistName}
          playlistUrl={playlistUrl}
          isUpdating={isUpdating}
          selectedChannel={selectedChannel}
          onChannelSelect={handleChannelSelect}
          onReturnToMainView={returnToMainView}
          onChangePlaylist={returnToMainView}
          onUpdatePlaylist={handleUpdatePlaylist}
          favoritesCount={favoritesCount}
          isDirectStreamMode={isDirectStreamMode}
        />
      )}
    </main>
  );
};

export default PlaylistManager;