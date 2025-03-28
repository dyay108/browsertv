import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Channel, Playlist } from '../../types/pocketbase-types';
import { debounce } from '../../utils/debounce';
import { channelService, favoriteService } from '../../services';

interface ChannelsPanelProps {
  selectedGroup: string;
  selectedPlaylist: Playlist | null;
  onBackToGroups: () => void;
  channels: Channel[];
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  currentPage: number;
  totalPages: number;
  totalChannelsInGroup: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  loading: boolean;
  initialSearchTerm?: string;  // Search term coming from groups panel
  onSearchTermChange?: (searchTerm: string) => void; // Update search term in parent
  onClearSearch?: () => void; // Clear search in parent
}

/**
 * Panel that displays channels for the selected group with search functionality
 */
const ChannelsPanel: React.FC<ChannelsPanelProps> = ({
  selectedGroup,
  selectedPlaylist,
  onBackToGroups,
  channels,
  selectedChannel,
  onChannelSelect,
  currentPage,
  totalPages,
  totalChannelsInGroup,
  onNextPage,
  onPrevPage,
  initialSearchTerm = '',
  onSearchTermChange
}) => {
  // Search functionality
  const [searchTerm, setLocalSearchTerm] = useState(initialSearchTerm);
  const [searchResults, setSearchResults] = useState<Channel[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(!!initialSearchTerm.trim());
  const [searchCurrentPage, setSearchCurrentPage] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(!!initialSearchTerm.trim());
  
  // Favorites handling
  const [channelFavoriteStatus, setChannelFavoriteStatus] = useState<{[key: string]: boolean}>({});
  const [favoriteChannels, setFavoriteChannels] = useState<Channel[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(1);
  const [favoriteCurrentPage, setFavoriteCurrentPage] = useState(1);
  const [favoriteTotalPages, setFavoriteTotalPages] = useState(0);
  const [channelsPerPage] = useState(100);
  
  // Refs to track previous values
  const prevSelectedPlaylistId = useRef<string | null>(null);
  const prevChannelsRef = useRef<Channel[]>([]);
  const prevSearchResultsRef = useRef<Channel[]>([]);
  const prevSelectedGroupRef = useRef<string | null>(null);
  const prevFavoriteCurrentPageRef = useRef<number>(0);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    // Use a debounce to avoid excessive DB calls while typing
    debounce(async (term: string, playlistId?: string, page = 0) => {
      if (!term.trim()) {
        setIsSearchMode(false);
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        // Search only within the current playlist with pagination
        const { results, total } = await channelService.searchChannels(term, playlistId, page, channelsPerPage);
        
        // Only update state if this is still the active search
        setSearchResults(results);
        setSearchTotalResults(total);
        
        // Calculate total pages
        const pages = Math.ceil(total / channelsPerPage);
        setSearchTotalPages(pages);
      } catch (error) {
        console.error('Error performing search:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300), // 300ms debounce delay
    [channelsPerPage]
  );
  
  // Simple function to update search term
  const setSearchTerm = (term: string) => {
    setLocalSearchTerm(term);
    if (onSearchTermChange) {
      onSearchTermChange(term);
    }
  };
  
  // Function to load next page of search results
  const loadNextSearchPage = useCallback(() => {
    if (searchCurrentPage < searchTotalPages) {
      setIsSearching(true);
      const nextPage = searchCurrentPage + 1;
      setSearchCurrentPage(nextPage);
      debouncedSearch(searchTerm, selectedPlaylist?.id, nextPage);
    }
  }, [searchCurrentPage, searchTotalPages, searchTerm, selectedPlaylist, debouncedSearch]);

  // Function to load previous page of search results
  const loadPrevSearchPage = useCallback(() => {
    if (searchCurrentPage > 1) {
      setIsSearching(true);
      const prevPage = searchCurrentPage - 1;
      setSearchCurrentPage(prevPage);
      debouncedSearch(searchTerm, selectedPlaylist?.id, prevPage);
    }
  }, [searchCurrentPage, searchTerm, selectedPlaylist, debouncedSearch]);
  
  // Toggle favorite status for a channel
  const toggleFavorite = useCallback(async (channel: Channel) => {
    if (!selectedPlaylist?.id) return;
    
    try {
      const isFavorite = channelFavoriteStatus[channel.id] || false;
      
      if (isFavorite) {
        // Remove from favorites
        await favoriteService.removeFromFavorites(channel.id, selectedPlaylist.id);
      } else {
        // Add to favorites
        await favoriteService.addToFavorites(channel.id, selectedPlaylist.id);
      }
      
      // Update local state
      setChannelFavoriteStatus(prev => ({
        ...prev,
        [channel.id]: !isFavorite
      }));
      
      // If we're viewing favorites, refresh the list
      if (selectedGroup === 'Favorites') {
        loadFavoriteChannels(selectedPlaylist.id);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [channelFavoriteStatus, selectedPlaylist, selectedGroup]);
  
  // Load favorite channels with pagination
  const loadFavoriteChannels = useCallback(async (playlistId: string) => {
    if (!playlistId) return;
    
    try {
      setIsSearching(true);
      
      // Get favorite count
      const count = await favoriteService.getFavoriteChannelCount(playlistId);
      setFavoritesCount(count);
      
      // Calculate pages
      const pages = Math.ceil(count / channelsPerPage);
      setFavoriteTotalPages(pages);
      
      // Get favorites for current page
      const favorites = await favoriteService.getFavoriteChannels(
        playlistId,
        favoriteCurrentPage,
        channelsPerPage
      );
      
      setFavoriteChannels(favorites);
      setIsSearching(false);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setIsSearching(false);
    }
  }, [favoriteCurrentPage, channelsPerPage]);
  
  // Function to load next page of favorites
  const loadNextFavoritePage = useCallback(() => {
    if (favoriteCurrentPage < favoriteTotalPages) {
      setFavoriteCurrentPage(prev => prev + 1);
    }
  }, [favoriteCurrentPage, favoriteTotalPages]);
  
  // Function to load previous page of favorites
  const loadPrevFavoritePage = useCallback(() => {
    if (favoriteCurrentPage > 1) {
      setFavoriteCurrentPage(prev => prev - 1);
    }
  }, [favoriteCurrentPage]);
  
  // Load favorite statuses for displayed channels
  const loadFavoriteStatuses = useCallback(async (channelList: Channel[], playlistId: string, abortSignal?: AbortSignal) => {
    if (!playlistId || channelList.length === 0) return;
    
    try {
      const statuses: {[key: string]: boolean} = {};
      
      // Process in batches to avoid excessive DB calls
      const BATCH_SIZE = 50;
      for (let i = 0; i < channelList.length; i += BATCH_SIZE) {
        // Check if operation was aborted before continuing
        if (abortSignal?.aborted) return;
        
        const batchChannels = channelList.slice(i, i + BATCH_SIZE);
        
        // Fetch all favorite statuses in parallel instead of sequentially
        const statusPromises = batchChannels.map(channel => 
          favoriteService.isChannelFavorite(channel.id, playlistId, { signal: abortSignal })
            .then(isFavorite => ({ channelId: channel.id, isFavorite }))
            .catch(error => {
              // Only log error if not aborted
              if (!abortSignal?.aborted) {
                console.error(`Error checking favorite status for channel ${channel.id}:`, error);
              }
              return { channelId: channel.id, isFavorite: false };
            })
        );
        
        const results = await Promise.all(statusPromises);
        
        // Check if operation was aborted after batch completes
        if (abortSignal?.aborted) return;
        
        // Process results
        for (const { channelId, isFavorite } of results) {
          statuses[channelId] = isFavorite;
        }
      }
      
      // Only update state if not aborted
      if (!abortSignal?.aborted) {
        setChannelFavoriteStatus(prev => ({
          ...prev,
          ...statuses
        }));
      }
    } catch (error) {
      if (!abortSignal?.aborted) {
        console.error('Error loading favorite statuses:', error);
      }
    }
  }, []);
  
  // Load favorites when viewing Favorites group
  useEffect(() => {
    // Create abort controller for this effect
    const abortController = new AbortController();
    
    // Only run when the selectedGroup changes to 'Favorites'
    if (selectedGroup === 'Favorites' && 
        selectedPlaylist?.id && 
        (prevSelectedGroupRef.current !== 'Favorites' || 
         prevSelectedPlaylistId.current !== selectedPlaylist.id)) {
      
      // Modify loadFavoriteChannels to accept abort signal
      const loadWithAbort = async () => {
        try {
          if (!selectedPlaylist?.id) return;
          
          setIsSearching(true);
          
          // Get favorite count with abort signal
          const count = await favoriteService.getFavoriteChannelCount(
            selectedPlaylist.id, 
            { signal: abortController.signal }
          );
          
          if (abortController.signal.aborted) return;
          
          setFavoritesCount(count);
          
          // Calculate pages
          const pages = Math.ceil(count / channelsPerPage);
          setFavoriteTotalPages(pages);
          
          // Get favorites for current page with abort signal
          const favorites = await favoriteService.getFavoriteChannels(
            selectedPlaylist.id,
            favoriteCurrentPage,
            channelsPerPage,
            { signal: abortController.signal }
          );
          
          if (abortController.signal.aborted) return;
          
          setFavoriteChannels(favorites);
          setIsSearching(false);
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.error('Error loading favorites:', error);
            setIsSearching(false);
          }
        }
      };
      
      loadWithAbort();
    }
    
    // Update refs
    prevSelectedGroupRef.current = selectedGroup;
    prevSelectedPlaylistId.current = selectedPlaylist?.id || null;
    
    // Cleanup function to abort any pending requests when dependencies change
    return () => {
      abortController.abort();
    };
  }, [selectedGroup, selectedPlaylist, loadFavoriteChannels, favoriteCurrentPage, channelsPerPage]);
  
  // Load favorite statuses for regular channels
  useEffect(() => {
    // Create abort controller for this effect
    const abortController = new AbortController();
    
    // Check if channels have changed by comparing lengths and first channel ID
    const channelsChanged = channels.length !== prevChannelsRef.current.length || 
                          (channels.length > 0 && prevChannelsRef.current.length > 0 && 
                           channels[0].id !== prevChannelsRef.current[0].id);
    
    if (channels.length > 0 && selectedPlaylist?.id && channelsChanged) {
      loadFavoriteStatuses(channels, selectedPlaylist.id, abortController.signal);
      prevChannelsRef.current = channels;
    }
    
    // Cleanup function to abort any pending requests when dependencies change
    return () => {
      abortController.abort();
    };
  }, [channels, loadFavoriteStatuses, selectedPlaylist]);
  
  // Load favorite statuses for search results
  useEffect(() => {
    // Create abort controller for this effect
    const abortController = new AbortController();
    
    // Check if search results have changed
    const searchResultsChanged = searchResults.length !== prevSearchResultsRef.current.length || 
                               (searchResults.length > 0 && prevSearchResultsRef.current.length > 0 && 
                                searchResults[0].id !== prevSearchResultsRef.current[0].id);
    
    if (searchResults.length > 0 && selectedPlaylist?.id && searchResultsChanged) {
      loadFavoriteStatuses(searchResults, selectedPlaylist.id, abortController.signal);
      prevSearchResultsRef.current = searchResults;
    }
    
    // Cleanup function to abort any pending requests when dependencies change
    return () => {
      abortController.abort();
    };
  }, [searchResults, loadFavoriteStatuses, selectedPlaylist]);
  
  // Effect to reload favorite channels when the page changes
  useEffect(() => {
    // Create abort controller for this effect
    const abortController = new AbortController();
    
    if (selectedGroup === 'Favorites' && 
        selectedPlaylist?.id && 
        favoriteCurrentPage !== prevFavoriteCurrentPageRef.current) {
      
      // Use modified version with abort signal
      const loadWithAbort = async () => {
        try {
          if (!selectedPlaylist?.id) return;
          
          setIsSearching(true);
          
          // Get favorite count with abort signal
          const count = await favoriteService.getFavoriteChannelCount(
            selectedPlaylist.id, 
            { signal: abortController.signal }
          );
          
          if (abortController.signal.aborted) return;
          
          setFavoritesCount(count);
          
          // Calculate pages
          const pages = Math.ceil(count / channelsPerPage);
          setFavoriteTotalPages(pages);
          
          // Get favorites for current page with abort signal
          const favorites = await favoriteService.getFavoriteChannels(
            selectedPlaylist.id,
            favoriteCurrentPage,
            channelsPerPage,
            { signal: abortController.signal }
          );
          
          if (abortController.signal.aborted) return;
          
          setFavoriteChannels(favorites);
          setIsSearching(false);
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.error('Error loading favorites:', error);
            setIsSearching(false);
          }
        }
      };
      
      loadWithAbort();
      prevFavoriteCurrentPageRef.current = favoriteCurrentPage;
    }
    
    // Cleanup function to abort any pending requests when dependencies change
    return () => {
      abortController.abort();
    };
  }, [favoriteCurrentPage, selectedGroup, selectedPlaylist, channelsPerPage]);
  
  // Effect to trigger search when initialSearchTerm is provided on component mount
  useEffect(() => {
    // Create abort controller for this effect
    const abortController = new AbortController();
    
    if (initialSearchTerm && 
        initialSearchTerm.trim() && 
        selectedPlaylist?.id && 
        !isSearchMode) {
      
      setSearchTerm(initialSearchTerm);
      setIsSearchMode(true);
      setIsSearching(true);
      setSearchCurrentPage(1); // Reset to first page
      
      // Modify the search function to include abort signal
      const searchWithAbort = async () => {
        try {
          if (!initialSearchTerm.trim()) {
            setIsSearchMode(false);
            setSearchResults([]);
            setIsSearching(false);
            return;
          }

          // Search only within the current playlist with pagination
          const { results, total } = await channelService.searchChannels(
            initialSearchTerm, 
            selectedPlaylist?.id, 
            0, 
            channelsPerPage,
            { signal: abortController.signal }
          );
          
          // Only update state if this is still the active search and not aborted
          if (!abortController.signal.aborted) {
            setSearchResults(results);
            setSearchTotalResults(total);
            
            // Calculate total pages
            const pages = Math.ceil(total / channelsPerPage);
            setSearchTotalPages(pages);
            setIsSearching(false);
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.error('Error performing search:', error);
            setIsSearching(false);
          }
        }
      };
      
      searchWithAbort();
    }
    
    // Cleanup function to abort any pending requests when dependencies change
    return () => {
      abortController.abort();
    };
  }, [initialSearchTerm, selectedPlaylist, isSearchMode, channelsPerPage]);
  
  // Determine which view to show
  const isFavoritesMode = selectedGroup === 'Favorites';
  
  // Add a debug class that clearly indicates search mode
  const panelClasses = `channels-panel ${isSearchMode ? 'search-mode-active' : ''}`;

  return (
    <div className={panelClasses}>
      <div className="channel-list-header">
        <button
          className="back-button"
          onClick={() => {
            if (isSearchMode) {
              // Clear search and go back to groups
              setSearchTerm('');
              setIsSearchMode(false);
              onBackToGroups();
            } else {
              // Normal back to groups behavior
              onBackToGroups();
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back
        </button>
        <h3>
          {isSearchMode 
            ? 'Search Results' 
            : isFavoritesMode 
              ? 'Favorites'
              : selectedGroup === '__ALL_CHANNELS__' 
                ? 'All Channels' 
                : selectedGroup}
        </h3>
        <div className="channel-count">
          {isSearchMode ? (
            isSearching ? (
              <span className="searching-indicator">Searching...</span>
            ) : (
              <span>
                {searchTotalResults} channels match &quot;{searchTerm}&quot;
                {searchTotalPages > 1 && (
                  <span className="pagination-info">
                    {' '} (Page {searchCurrentPage}/{searchTotalPages})
                  </span>
                )}
              </span>
            )
          ) : isFavoritesMode ? (
            <span>
              {favoritesCount} favorites
              {favoriteTotalPages > 1 && (
                <span className="pagination-info">
                  {' '} (Page {favoriteCurrentPage}/{favoriteTotalPages})
                </span>
              )}
            </span>
          ) : (
            <>
              {totalChannelsInGroup} channels
              {totalPages > 1 && (
                <span className="pagination-info">
                  {' '} (Page {currentPage}/{totalPages})
                </span>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="channel-list-container">
        
        {isSearchMode ? (
          <>
            {/* Show loading indicator if searching */}
            {isSearching && (
              <div className="loading-search" style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                <div className="loading-spinner"></div>
                <p>Searching...</p>
              </div>
            )}
            
            {/* Show search results or "no results" message */}
            {searchResults.length === 0 ? (
              <div className="no-search-results">
                <p>No results found for &quot;{searchTerm}&quot;</p>
                <p>Try a different search term</p>
              </div>
            ) : (
              <div className="channel-list-sidebar">
                {searchResults.map(channel => (
                  <div
                    key={channel.id}
                    className={`channel-item-sidebar ${selectedChannel?.id === channel.id ? 'selected' : ''}`}
                  >
                    <div 
                      className="channel-content"
                      onClick={() => onChannelSelect(channel)}
                    >
                      <div className="channel-logo-sidebar">
                        {channel.logo ? (
                          <img src={channel.logo} alt={channel.name} onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path fill="%23aaa" d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z"/></svg>';
                          }} />
                        ) : (
                          <div className="default-logo-sidebar">TV</div>
                        )}
                      </div>
                      <div className="channel-info-sidebar">
                        <div className="channel-name">{channel.name}</div>
                        <div className="channel-group-sidebar">{channel.group}</div>
                      </div>
                    </div>
                    
                    <div 
                      className={`favorite-toggle ${channelFavoriteStatus[channel.id] ? 'is-favorite' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(channel);
                      }}
                      title={channelFavoriteStatus[channel.id] ? "Remove from favorites" : "Add to favorites"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={channelFavoriteStatus[channel.id] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination for search results */}
            {searchResults.length > 0 && searchTotalPages > 1 && (
              <div className="pagination-controls">
                <button
                  onClick={loadPrevSearchPage}
                  disabled={searchCurrentPage === 1 || isSearching}
                  className="pagination-button prev"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Previous
                </button>
                <span className="pagination-status">
                  {searchCurrentPage} / {searchTotalPages} ({searchTotalResults} results)
                </span>
                <button
                  onClick={loadNextSearchPage}
                  disabled={searchCurrentPage >= searchTotalPages || isSearching}
                  className="pagination-button next"
                >
                  Next
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            )}
          </>
        ) : (
          // Regular channels or favorites view
          <>
            {isFavoritesMode ? (
              <>
                {favoriteChannels.length === 0 ? (
                  <div className="no-favorites">
                    <div className="empty-favorites-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </div>
                    <p>No favorite channels yet</p>
                    <p className="favorites-help">Click the star icon next to any channel to add it to favorites</p>
                  </div>
                ) : (
                  <div className="channel-list-sidebar">
                    {favoriteChannels.map(channel => (
                      <div
                        key={channel.id}
                        className={`channel-item-sidebar ${selectedChannel?.id === channel.id ? 'selected' : ''}`}
                      >
                        <div 
                          className="channel-content"
                          onClick={() => onChannelSelect(channel)}
                        >
                          <div className="channel-logo-sidebar">
                            {channel.logo ? (
                              <img src={channel.logo} alt={channel.name} onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path fill="%23aaa" d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z"/></svg>';
                              }} />
                            ) : (
                              <div className="default-logo-sidebar">TV</div>
                            )}
                          </div>
                          <div className="channel-info-sidebar">
                            <div className="channel-name">{channel.name}</div>
                            <div className="channel-group-sidebar">{channel.group}</div>
                          </div>
                        </div>
                        
                        <div 
                          className="favorite-toggle is-favorite"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(channel);
                          }}
                          title="Remove from favorites"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Pagination for favorites */}
                {favoriteChannels.length > 0 && favoriteTotalPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={loadPrevFavoritePage}
                      disabled={favoriteCurrentPage === 1}
                      className="pagination-button prev"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                      Previous
                    </button>
                    <span className="pagination-status">
                      {favoriteCurrentPage} / {favoriteTotalPages} ({favoritesCount} favorites)
                    </span>
                    <button
                      onClick={loadNextFavoritePage}
                      disabled={favoriteCurrentPage >= favoriteTotalPages}
                      className="pagination-button next"
                    >
                      Next
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="channel-list-sidebar">
                  {channels.map(channel => (
                    <div
                      key={channel.id}
                      className={`channel-item-sidebar ${selectedChannel?.id === channel.id ? 'selected' : ''}`}
                    >
                      <div 
                        className="channel-content"
                        onClick={() => onChannelSelect(channel)}
                      >
                        <div className="channel-logo-sidebar">
                          {channel.logo ? (
                            <img src={channel.logo} alt={channel.name} onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path fill="%23aaa" d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z"/></svg>';
                            }} />
                          ) : (
                            <div className="default-logo-sidebar">TV</div>
                          )}
                        </div>
                        <div className="channel-info-sidebar">
                          <div className="channel-name">{channel.name}</div>
                          <div className="channel-group-sidebar">{channel.group}</div>
                        </div>
                      </div>
                      
                      <div 
                        className={`favorite-toggle ${channelFavoriteStatus[channel.id] ? 'is-favorite' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(channel);
                        }}
                        title={channelFavoriteStatus[channel.id] ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={channelFavoriteStatus[channel.id] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination for regular channels */}
                {totalPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={onPrevPage}
                      disabled={currentPage === 1}
                      className="pagination-button prev"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                      Previous
                    </button>
                    <span className="pagination-status">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={onNextPage}
                      disabled={currentPage >= totalPages}
                      className="pagination-button next"
                    >
                      Next
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChannelsPanel;