import React, { useState, useCallback, useEffect } from 'react';
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
  // Search state
  const [searchTerm, setLocalSearchTerm] = useState(initialSearchTerm);
  const [searchResults, setSearchResults] = useState<Channel[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(!!initialSearchTerm.trim());
  const [searchCurrentPage, setSearchCurrentPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(!!initialSearchTerm.trim());
  
  // Favorites state
  const [favoriteChannels, setFavoriteChannels] = useState<Channel[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [favoriteCurrentPage, setFavoriteCurrentPage] = useState(1);
  const [favoriteTotalPages, setFavoriteTotalPages] = useState(0);
  const [channelsPerPage] = useState(100);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string, playlistId?: string, page = 1) => {
      if (!term.trim()) {
        setIsSearchMode(false);
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        const { results, total } = await channelService.searchChannels(term, playlistId, page, channelsPerPage);
        setSearchResults(results);
        setSearchTotalResults(total);
        setSearchTotalPages(Math.ceil(total / channelsPerPage));
      } catch (error) {
        console.error('Error performing search:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [channelsPerPage]
  );
  
  // Update search term and notify parent
  const setSearchTerm = (term: string) => {
    setLocalSearchTerm(term);
    if (onSearchTermChange) {
      onSearchTermChange(term);
    }
  };
  
  // Search pagination
  const loadNextSearchPage = useCallback(() => {
    if (searchCurrentPage < searchTotalPages) {
      const nextPage = searchCurrentPage + 1;
      setSearchCurrentPage(nextPage);
      debouncedSearch(searchTerm, selectedPlaylist?.id, nextPage);
    }
  }, [searchCurrentPage, searchTotalPages, searchTerm, selectedPlaylist, debouncedSearch]);

  const loadPrevSearchPage = useCallback(() => {
    if (searchCurrentPage > 1) {
      const prevPage = searchCurrentPage - 1;
      setSearchCurrentPage(prevPage);
      debouncedSearch(searchTerm, selectedPlaylist?.id, prevPage);
    }
  }, [searchCurrentPage, searchTerm, selectedPlaylist, debouncedSearch]);
  
  // Toggle favorite status for a channel
  const toggleFavorite = useCallback(async (channel: Channel) => {
    if (!selectedPlaylist?.id) return;
    
    try {
      const isFavorite = channel.favorite;
      
      if (isFavorite) {
        await favoriteService.removeFromFavorites(channel.id);
      } else {
        await favoriteService.addToFavorites(channel.id, selectedPlaylist.id);
      }
      
      // Update the channel object directly
      channel.favorite = !isFavorite;
      
      // If we're viewing favorites, refresh the list
      if (selectedGroup === 'Favorites') {
        loadFavoriteChannels();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [selectedPlaylist, selectedGroup]);
  
  // Load favorite channels
  const loadFavoriteChannels = useCallback(async () => {
    if (!selectedPlaylist?.id) return;
    
    try {
      setIsSearching(true);
      
      // Get favorite count
      const count = await favoriteService.getFavoriteChannelCount(selectedPlaylist.id);
      setFavoritesCount(count);
      setFavoriteTotalPages(Math.ceil(count / channelsPerPage));
      
      // Get favorites for current page
      const favorites = await favoriteService.getFavoriteChannels(
        selectedPlaylist.id,
        favoriteCurrentPage,
        channelsPerPage
      );
      
      setFavoriteChannels(favorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsSearching(false);
    }
  }, [favoriteCurrentPage, channelsPerPage, selectedPlaylist?.id]);
  
  // Favorites pagination
  const loadNextFavoritePage = useCallback(() => {
    if (favoriteCurrentPage < favoriteTotalPages) {
      setFavoriteCurrentPage(prev => prev + 1);
    }
  }, [favoriteCurrentPage, favoriteTotalPages]);
  
  const loadPrevFavoritePage = useCallback(() => {
    if (favoriteCurrentPage > 1) {
      setFavoriteCurrentPage(prev => prev - 1);
    }
  }, [favoriteCurrentPage]);
  
  // Effect to load favorites when group changes to 'Favorites'
  useEffect(() => {
    const abortController = new AbortController();
    
    if (selectedGroup === 'Favorites' && selectedPlaylist?.id) {
      loadFavoriteChannels();
    }
    
    return () => {
      abortController.abort();
    };
  }, [selectedGroup, selectedPlaylist, loadFavoriteChannels]);
  
  // Effect to handle favorites pagination
  useEffect(() => {
    if (selectedGroup === 'Favorites' && selectedPlaylist?.id) {
      loadFavoriteChannels();
    }
  }, [favoriteCurrentPage, selectedGroup, selectedPlaylist, loadFavoriteChannels]);
  
  // Effect to trigger search when initialSearchTerm is provided
  useEffect(() => {
    if (initialSearchTerm && initialSearchTerm.trim() && selectedPlaylist?.id) {
      setSearchTerm(initialSearchTerm);
      setIsSearchMode(true);
      setSearchCurrentPage(1);
      debouncedSearch(initialSearchTerm, selectedPlaylist.id, 1);
    }
  }, [initialSearchTerm, selectedPlaylist, debouncedSearch]);
  
  // Determine which view to show
  const isFavoritesMode = selectedGroup === 'Favorites';
  const displayedChannels = isSearchMode ? searchResults : isFavoritesMode ? favoriteChannels : channels;
  
  // Helper function to render channel items
  const renderChannelItem = (channel: Channel) => (
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
        className={`favorite-toggle ${channel.favorite ? 'is-favorite' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(channel);
        }}
        title={channel.favorite ? "Remove from favorites" : "Add to favorites"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={channel.favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </div>
    </div>
  );

  return (
    <div className={`channels-panel ${isSearchMode ? 'search-mode-active' : ''}`}>
      <div className="channel-list-header">
        <button
          className="back-button"
          onClick={() => {
            if (isSearchMode) {
              setSearchTerm('');
              setIsSearchMode(false);
            }
            onBackToGroups();
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
                {searchTotalResults} channels match "{searchTerm}"
                {searchTotalPages > 1 && ` (Page ${searchCurrentPage}/${searchTotalPages})`}
              </span>
            )
          ) : isFavoritesMode ? (
            <span>
              {favoritesCount} favorites
              {favoriteTotalPages > 1 && ` (Page ${favoriteCurrentPage}/${favoriteTotalPages})`}
            </span>
          ) : (
            <>
              {totalChannelsInGroup} channels
              {totalPages > 1 && ` (Page ${currentPage}/${totalPages})`}
            </>
          )}
        </div>
      </div>
      
      <div className="channel-list-container">
        {isSearching && (
          <div className="loading-search" style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
            <div className="loading-spinner"></div>
            <p>Searching...</p>
          </div>
        )}
        
        {displayedChannels.length === 0 ? (
          <div className={isSearchMode ? "no-search-results" : "no-favorites"}>
            {isSearchMode ? (
              <>
                <p>No results found for "{searchTerm}"</p>
                <p>Try a different search term</p>
              </>
            ) : isFavoritesMode ? (
              <>
                <div className="empty-favorites-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <p>No favorite channels yet</p>
                <p className="favorites-help">Click the star icon next to any channel to add it to favorites</p>
              </>
            ) : (
              <p>No channels found</p>
            )}
          </div>
        ) : (
          <div className="channel-list-sidebar">
            {displayedChannels.map(renderChannelItem)}
          </div>
        )}
        
        {/* Pagination controls */}
        {displayedChannels.length > 0 && (
          <div className="pagination-controls">
            {isSearchMode ? (
              searchTotalPages > 1 && (
                <>
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
                </>
              )
            ) : isFavoritesMode ? (
              favoriteTotalPages > 1 && (
                <>
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
                </>
              )
            ) : (
              totalPages > 1 && (
                <>
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
                </>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelsPanel;