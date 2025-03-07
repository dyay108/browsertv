import React from 'react';
import { IChannel } from '../../db';
import ChannelList from './ChannelList';

interface SearchPanelProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  searchResults: IChannel[];
  selectedChannel: IChannel | null;
  favoriteStatus: {[key: string]: boolean};
  onChannelSelect: (channel: IChannel) => void;
  onToggleFavorite: (channel: IChannel) => void;
  isSearching: boolean;
  searchCurrentPage: number;
  searchTotalPages: number;
  searchTotalResults: number;
  onNextSearchPage: () => void;
  onPrevSearchPage: () => void;
}

/**
 * Search panel with input field and results display
 */
const SearchPanel: React.FC<SearchPanelProps> = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  searchResults,
  selectedChannel,
  favoriteStatus,
  onChannelSelect,
  onToggleFavorite,
  isSearching,
  searchCurrentPage,
  searchTotalPages,
  searchTotalResults,
  onNextSearchPage,
  onPrevSearchPage
}) => {
  return (
    <div className={`search-panel ${searchTerm ? 'active' : ''}`}>
      <div className="search-input-container">
        <input
          type="text"
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search channels and groups..."
          className="search-input"
        />
        {searchTerm && (
          <button
            className="clear-search-button"
            onClick={onClearSearch}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      {searchTerm && (
        <>
          {isSearching ? (
            <div className="loading-search">
              <div className="loading-spinner"></div>
              <p>Searching...</p>
            </div>
          ) : (
            <ChannelList
              channels={searchResults}
              selectedChannel={selectedChannel}
              favoriteStatus={favoriteStatus}
              onChannelSelect={onChannelSelect}
              onToggleFavorite={onToggleFavorite}
              currentPage={searchCurrentPage}
              totalPages={searchTotalPages}
              totalItems={searchTotalResults}
              onNextPage={onNextSearchPage}
              onPrevPage={onPrevSearchPage}
              loading={isSearching}
              emptyMessage={
                <div className="no-search-results">
                  <p>No results found for &quot;{searchTerm}&quot;</p>
                  <p>Try a different search term</p>
                </div>
              }
            />
          )}
        </>
      )}
    </div>
  );
};

export default SearchPanel;