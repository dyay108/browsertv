import React, { useState, useCallback, useEffect } from 'react';
import { IChannel, IPlaylist, db } from '../../db';
import { debounce } from '../../utils/debounce';

interface ChannelsPanelProps {
  selectedGroup: string;
  selectedPlaylist: IPlaylist | null;
  onBackToGroups: () => void;
  channels: IChannel[];
  selectedChannel: IChannel | null;
  onChannelSelect: (channel: IChannel) => void;
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
  const [searchResults, setSearchResults] = useState<IChannel[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(!!initialSearchTerm.trim());
  const [searchCurrentPage, setSearchCurrentPage] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(!!initialSearchTerm.trim());
  
  // Favorites handling
  const [channelFavoriteStatus, setChannelFavoriteStatus] = useState<{[key: string]: boolean}>({});
  const [favoriteChannels, setFavoriteChannels] = useState<IChannel[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [favoriteCurrentPage, setFavoriteCurrentPage] = useState(0);
  const [favoriteTotalPages, setFavoriteTotalPages] = useState(0);
  const [channelsPerPage] = useState(100);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    // Use a debounce to avoid excessive DB calls while typing
    debounce(async (term: string, playlistId?: number, page = 0) => {
      if (!term.trim()) {
        setIsSearchMode(false);
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        // Search only within the current playlist with pagination
        const { results, total } = await db.searchChannels(term, playlistId, page, channelsPerPage);
        
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
    if (searchCurrentPage < searchTotalPages - 1) {
      setIsSearching(true);
      const nextPage = searchCurrentPage + 1;
      setSearchCurrentPage(nextPage);
      debouncedSearch(searchTerm, selectedPlaylist?.id, nextPage);
    }
  }, [searchCurrentPage, searchTotalPages, searchTerm, selectedPlaylist, debouncedSearch]);

  // Function to load previous page of search results
  const loadPrevSearchPage = useCallback(() => {
    if (searchCurrentPage > 0) {
      setIsSearching(true);
      const prevPage = searchCurrentPage - 1;
      setSearchCurrentPage(prevPage);
      debouncedSearch(searchTerm, selectedPlaylist?.id, prevPage);
    }
  }, [searchCurrentPage, searchTerm, selectedPlaylist, debouncedSearch]);
  
  // Toggle favorite status for a channel
  const toggleFavorite = useCallback(async (channel: IChannel) => {
    if (!selectedPlaylist?.id) return;
    
    try {
      const isFavorite = channelFavoriteStatus[channel.id] || false;
      
      if (isFavorite) {
        // Remove from favorites
        await db.removeFromFavorites(channel.id, selectedPlaylist.id);
      } else {
        // Add to favorites
        await db.addToFavorites(channel.id, selectedPlaylist.id);
      }
      
      // Update local state
      setChannelFavoriteStatus(prev => ({
        ...prev,
        [channel.id]: !isFavorite
      }));
      
      // If we're viewing favorites, refresh the list
      if (selectedGroup === 'Favorites') {
        loadFavoriteChannels();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [channelFavoriteStatus, selectedPlaylist, selectedGroup]);
  
  // Load favorite channels with pagination
  const loadFavoriteChannels = useCallback(async () => {
    if (!selectedPlaylist?.id) return;
    
    try {
      setIsSearching(true);
      
      // Get favorite count
      const count = await db.getFavoriteChannelCount(selectedPlaylist.id);
      setFavoritesCount(count);
      
      // Calculate pages
      const pages = Math.ceil(count / channelsPerPage);
      setFavoriteTotalPages(pages);
      
      // Get favorites for current page
      const favorites = await db.getFavoriteChannels(
        selectedPlaylist.id,
        favoriteCurrentPage,
        channelsPerPage
      );
      
      setFavoriteChannels(favorites);
      setIsSearching(false);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setIsSearching(false);
    }
  }, [selectedPlaylist, favoriteCurrentPage, channelsPerPage]);
  
  // Function to load next page of favorites
  const loadNextFavoritePage = useCallback(() => {
    if (favoriteCurrentPage < favoriteTotalPages - 1) {
      setFavoriteCurrentPage(prev => prev + 1);
    }
  }, [favoriteCurrentPage, favoriteTotalPages]);
  
  // Function to load previous page of favorites
  const loadPrevFavoritePage = useCallback(() => {
    if (favoriteCurrentPage > 0) {
      setFavoriteCurrentPage(prev => prev - 1);
    }
  }, [favoriteCurrentPage]);
  
  // Load favorite statuses for displayed channels
  const loadFavoriteStatuses = useCallback(async (channelList: IChannel[]) => {
    if (!selectedPlaylist?.id || channelList.length === 0) return;
    
    try {
      const statuses: {[key: string]: boolean} = {};
      
      // Process in batches to avoid excessive DB calls
      const BATCH_SIZE = 50;
      for (let i = 0; i < channelList.length; i += BATCH_SIZE) {
        const batchChannels = channelList.slice(i, i + BATCH_SIZE);
        
        for (const channel of batchChannels) {
          const isFavorite = await db.isChannelFavorite(channel.id, selectedPlaylist.id);
          statuses[channel.id] = isFavorite;
        }
      }
      
      setChannelFavoriteStatus(prev => ({
        ...prev,
        ...statuses
      }));
    } catch (error) {
      console.error('Error loading favorite statuses:', error);
    }
  }, [selectedPlaylist]);
  
  // Load favorites when viewing Favorites group
  useEffect(() => {
    if (selectedGroup === 'Favorites' && selectedPlaylist?.id) {
      loadFavoriteChannels();
    }
  }, [selectedGroup, selectedPlaylist, loadFavoriteChannels]);
  
  // Load favorite statuses for regular channels
  useEffect(() => {
    if (channels.length > 0) {
      loadFavoriteStatuses(channels);
    }
  }, [channels, loadFavoriteStatuses]);
  
  // Load favorite statuses for search results
  useEffect(() => {
    if (searchResults.length > 0) {
      loadFavoriteStatuses(searchResults);
    }
  }, [searchResults, loadFavoriteStatuses]);
  
  // Effect to trigger search when initialSearchTerm is provided on component mount
  useEffect(() => {
    if (initialSearchTerm && initialSearchTerm.trim() && selectedPlaylist?.id) {
      setSearchTerm(initialSearchTerm);
      setIsSearchMode(true);
      setIsSearching(true);
      debouncedSearch(initialSearchTerm, selectedPlaylist.id, 0);
    }
  }, [initialSearchTerm, selectedPlaylist, debouncedSearch, setSearchTerm]);
  
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
                    {' '} (Page {searchCurrentPage + 1}/{searchTotalPages})
                  </span>
                )}
              </span>
            )
          ) : isFavoritesMode ? (
            <span>
              {favoritesCount} favorites
              {favoriteTotalPages > 1 && (
                <span className="pagination-info">
                  {' '} (Page {favoriteCurrentPage + 1}/{favoriteTotalPages})
                </span>
              )}
            </span>
          ) : (
            <>
              {totalChannelsInGroup} channels
              {totalPages > 1 && (
                <span className="pagination-info">
                  {' '} (Page {currentPage + 1}/{totalPages})
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
                  disabled={searchCurrentPage === 0 || isSearching}
                  className="pagination-button prev"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Previous
                </button>
                <span className="pagination-status">
                  {searchCurrentPage + 1} / {searchTotalPages} ({searchTotalResults} results)
                </span>
                <button
                  onClick={loadNextSearchPage}
                  disabled={searchCurrentPage >= searchTotalPages - 1 || isSearching}
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
                      disabled={favoriteCurrentPage === 0}
                      className="pagination-button prev"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                      Previous
                    </button>
                    <span className="pagination-status">
                      {favoriteCurrentPage + 1} / {favoriteTotalPages} ({favoritesCount} favorites)
                    </span>
                    <button
                      onClick={loadNextFavoritePage}
                      disabled={favoriteCurrentPage >= favoriteTotalPages - 1}
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
                      disabled={currentPage === 0}
                      className="pagination-button prev"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                      Previous
                    </button>
                    <span className="pagination-status">
                      {currentPage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={onNextPage}
                      disabled={currentPage >= totalPages - 1}
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