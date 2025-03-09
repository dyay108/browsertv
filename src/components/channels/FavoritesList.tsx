import React from 'react';
import { Channel } from '../../types/pocketbase-types';
import ChannelList from './ChannelList';

interface FavoritesListProps {
  favorites: Channel[];
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  onToggleFavorite: (channel: Channel) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  loading: boolean;
}

/**
 * Component to display favorite channels
 */
const FavoritesList: React.FC<FavoritesListProps> = ({
  favorites,
  selectedChannel,
  onChannelSelect,
  onToggleFavorite,
  currentPage,
  totalPages,
  totalItems,
  onNextPage,
  onPrevPage,
  loading
}) => {
  // Create a favorites status object where all channels are favorites
  const favoriteStatus = favorites.reduce((status, channel) => {
    status[channel.id] = true;
    return status;
  }, {} as {[key: string]: boolean});

  const emptyFavoritesMessage = (
    <div className="no-favorites">
      <div className="empty-favorites-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </div>
      <p>No favorite channels yet</p>
      <p className="favorites-help">Click the star icon next to any channel to add it to favorites</p>
    </div>
  );

  return (
    <ChannelList
      channels={favorites}
      selectedChannel={selectedChannel}
      favoriteStatus={favoriteStatus}
      onChannelSelect={onChannelSelect}
      onToggleFavorite={onToggleFavorite}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      onNextPage={onNextPage}
      onPrevPage={onPrevPage}
      loading={loading}
      emptyMessage={emptyFavoritesMessage}
    />
  );
};

export default FavoritesList;