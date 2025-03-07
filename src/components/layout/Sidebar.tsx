import React, { useState, useEffect, useCallback } from 'react';
import { IChannel, IPlaylist, db } from '../../db';
import GroupsPanel from '../groups/GroupsPanel';
import ChannelsPanel from '../channels/ChannelsPanel';
import SearchPanel from '../channels/SearchPanel';
import { debounce } from '../../utils/debounce';

interface SidebarProps {
  playlistName: string;
  selectedPlaylist: IPlaylist | null;
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  onChangePlaylist: () => void;
  onUpdatePlaylist: () => void;
  selectedGroup: string;
  groups: string[];
  channels: IChannel[];
  onGroupSelect: (group: string) => void;
  groupChannelCounts: { [key: string]: number };
  favoritesCount: number;
  onSortGroups: () => void;
  onDragEnd: (sourceIndex: number, destinationIndex: number) => void;
  selectedChannel: IChannel | null;
  onChannelSelect: (channel: IChannel | null) => void;
  currentPage: number;
  totalPages: number;
  totalChannelsInGroup: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  loading: boolean;
  playlistUrl: string;
  isUpdating: boolean;
  startHideTimer: () => void;
  clearHideTimer: () => void;
}

/**
 * Sidebar component that toggles between groups and channels views
 */
const Sidebar: React.FC<SidebarProps> = ({
  playlistName,
  selectedPlaylist,
  visible,
  onVisibilityChange,
  onChangePlaylist,
  onUpdatePlaylist,
  selectedGroup,
  groups,
  channels,
  onGroupSelect,
  groupChannelCounts,
  favoritesCount,
  onSortGroups,
  onDragEnd,
  selectedChannel,
  onChannelSelect,
  currentPage,
  totalPages,
  totalChannelsInGroup,
  onNextPage,
  onPrevPage,
  loading,
  playlistUrl,
  isUpdating,
  startHideTimer,
  clearHideTimer
}) => {
  const [showGroupsPanel, setShowGroupsPanel] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Search specific states
  const [searchResults, setSearchResults] = useState<IChannel[]>([]);
  const [searchCurrentPage, setSearchCurrentPage] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [channelFavoriteStatus, setChannelFavoriteStatus] = useState<{[key: string]: boolean}>({});

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string, playlistId?: number, page = 0) => {
      if (!term.trim()) {
        setIsSearchMode(false);
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        // Search only within the current playlist with pagination
        const { results, total } = await db.searchChannels(term, playlistId, page, 100);
        
        // Update search state
        setSearchResults(results);
        setSearchTotalResults(total);
        
        // Calculate total pages
        const pages = Math.ceil(total / 100);
        setSearchTotalPages(pages);
        
        // Update search mode state
        setIsSearchMode(true);
      } catch (error) {
        console.error('Error performing search:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Function to handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSearchCurrentPage(0); // Reset to first page on new search
    
    if (term.trim()) {
      setIsSearching(true);
      // Always show search results when searching
      setIsSearchMode(true);
      
      // Execute the debounced search
      debouncedSearch(term, selectedPlaylist?.id, 0);
    } else {
      debouncedSearch(term); // Will handle the empty case
    }
  };

  // Function to clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setIsSearchMode(false);
    setSearchResults([]);
    
    // When clearing search, return to groups panel
    setShowGroupsPanel(true);
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
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [channelFavoriteStatus, selectedPlaylist]);

  // Load favorite statuses for search results
  useEffect(() => {
    const loadFavoriteStatuses = async (channelList: IChannel[]) => {
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
    };
    
    if (searchResults.length > 0) {
      loadFavoriteStatuses(searchResults);
    }
  }, [searchResults, selectedPlaylist]);

  return (
    <aside
      className={`channel-sidebar floating-sidebar ${visible ? 'visible' : 'hidden'}`}
      onMouseEnter={() => {
        onVisibilityChange(true);
        clearHideTimer();
      }}
      onMouseLeave={() => {
        // Start hide timer when mouse leaves the sidebar
        startHideTimer();
      }}
    >
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <h2>{playlistName || 'IPTV Channels'}</h2>
          <button
            className="close-sidebar-button"
            onClick={() => {
              onVisibilityChange(false);
            }}
            title="Hide channels"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="sidebar-controls">
          <button
            onClick={onChangePlaylist}
            className="upload-new-button"
          >
            Change Playlist
          </button>
          {playlistUrl && (
            <button
              onClick={onUpdatePlaylist}
              className="update-button"
              disabled={isUpdating}
              title="Update playlist from URL"
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-panels-container">
        {/* Always visible search input */}
        <div className="search-input-container">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search channels and groups..."
            className="search-input"
          />
          {searchTerm && (
            <button
              className="clear-search-button"
              onClick={handleClearSearch}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Show search results when in search mode */}
        {isSearchMode ? (
          <SearchPanel
            searchTerm={searchTerm}
            onSearchChange={handleSearch}
            onClearSearch={handleClearSearch}
            searchResults={searchResults}
            selectedChannel={selectedChannel}
            favoriteStatus={channelFavoriteStatus}
            onChannelSelect={onChannelSelect}
            onToggleFavorite={toggleFavorite}
            isSearching={isSearching}
            searchCurrentPage={searchCurrentPage}
            searchTotalPages={searchTotalPages}
            searchTotalResults={searchTotalResults}
            onNextSearchPage={loadNextSearchPage}
            onPrevSearchPage={loadPrevSearchPage}
          />
        ) : (
          /* Show either groups panel or channels panel when not searching */
          showGroupsPanel ? (
            <GroupsPanel 
              groups={groups}
              selectedGroup={selectedGroup}
              onGroupSelect={(group) => {
                onGroupSelect(group);
                setShowGroupsPanel(false);
              }}
              groupChannelCounts={groupChannelCounts}
              favoritesCount={favoritesCount}
              onSortGroups={onSortGroups}
              onDragEnd={onDragEnd}
              onSearch={handleSearch}
              searchTerm={searchTerm}
              onClearSearch={handleClearSearch}
            />
          ) : (
            <ChannelsPanel 
              selectedGroup={selectedGroup}
              selectedPlaylist={selectedPlaylist}
              onBackToGroups={() => setShowGroupsPanel(true)}
              channels={channels}
              selectedChannel={selectedChannel}
              onChannelSelect={onChannelSelect}
              currentPage={currentPage}
              totalPages={totalPages}
              totalChannelsInGroup={totalChannelsInGroup}
              onNextPage={onNextPage}
              onPrevPage={onPrevPage}
              loading={loading}
              initialSearchTerm=""  // No need to pass search term, as we handle it at Sidebar level
              onSearchTermChange={setSearchTerm}
              onClearSearch={handleClearSearch}
            />
          )
        )}
      </div>
    </aside>
  );
};

export default Sidebar;