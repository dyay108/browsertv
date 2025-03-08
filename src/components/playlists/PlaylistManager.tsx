import React, { useState, useEffect, useCallback } from 'react';
import { IChannel, db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { usePlaylistManagement } from '../../hooks/usePlaylistManagement';
import { useStreamControl } from '../../hooks/useStreamControl';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import PlaylistUploader from './PlaylistUploader';
import UrlPlaylistLoader from './UrlPlaylistLoader';
import DirectStreamInput from './DirectStreamInput';
import RecentPlaylists from './RecentPlaylists';
import PlaylistViewer from './PlaylistViewer';

/**
 * Main component that manages playlist selection, file upload, and URL loading
 */
const PlaylistManager: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // State for overall app flow
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [isDirectStreamMode, setIsDirectStreamMode] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<IChannel | null>(null);
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
  const { playStream } = useStreamControl();

  // Fetch recent playlists from database
  const allRecentPlaylists = useLiveQuery(() => db.getRecentPlaylists(), []);
  
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
    if (selectedPlaylist?.id) {
      db.getFavoriteChannelCount(selectedPlaylist.id)
        .then(count => {
          setFavoritesCount(count);
        })
        .catch(error => console.error('Error loading favorites count:', error));
    }
  }, [selectedPlaylist]);

  // Handle direct stream submission
  const handleDirectStreamSubmit = useCallback((url: string) => {
    setIsFileUploaded(true);
    setIsDirectStreamMode(true);
    playStream(url);
  }, [playStream]);

  // Function to return to the main upload view
  const returnToMainView = useCallback(() => {
    // Clear the current stream
    setIsFileUploaded(false);
    setIsDirectStreamMode(false);
    setSelectedChannel(null);
  }, []);

  // Handler for channel selection
  const handleChannelSelect = useCallback((channel: IChannel | null) => {
    setSelectedChannel(channel);
    if (channel) {
      playStream(channel.url);
    }
  }, [playStream]);

  // Handler for deleting a playlist
  const handleDeletePlaylist = useCallback(async (id: number) => {
    try {
      await db.deletePlaylist(id);
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  }, []);

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
              onSelectPlaylist={(playlist) => {
                handleLoadPlaylist(playlist);
                setIsFileUploaded(true);
              }}
              onDeletePlaylist={handleDeletePlaylist}
              currentPage={playlistCurrentPage}
              totalPages={playlistTotalPages}
              onNextPage={() => setPlaylistCurrentPage(prev => prev + 1)}
              onPrevPage={() => setPlaylistCurrentPage(prev => prev - 1)}
            />

            <PlaylistUploader 
              customPlaylistName={customPlaylistName}
              onNameChange={setCustomPlaylistName}
              onFileUpload={(e) => {
                handleFileUpload(e);
                setIsFileUploaded(true);
              }}
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
              onFetchPlaylist={() => {
                fetchPlaylistFromUrl(playlistUrl);
                setIsFileUploaded(true);
              }}
              loading={loading}
              useCorsProxy={useCorsProxy}
              onToggleCorsProxy={() => setUseCorsProxy(!useCorsProxy)}
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