import React from 'react';
import { Channel } from '../../types/pocketbase-types';
import ChannelItem from './ChannelItem';
import PaginationControls from '../common/PaginationControls';

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  favoriteStatus: {[key: string]: boolean};
  onChannelSelect: (channel: Channel) => void;
  onToggleFavorite: (channel: Channel) => void;
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  loading: boolean;
  emptyMessage?: React.ReactNode;
}

/**
 * Displays a list of channels with pagination
 */
const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannel,
  favoriteStatus,
  onChannelSelect,
  onToggleFavorite,
  currentPage,
  totalPages,
  totalItems,
  onNextPage,
  onPrevPage,
  loading,
  emptyMessage
}) => {
  if (channels.length === 0 && !loading) {
    return (
      <div className="no-channels">
        {emptyMessage || <p>No channels available</p>}
      </div>
    );
  }

  return (
    <div className="channel-list-container">
      {loading ? (
        <div className="loading-channels">
          <div className="loading-spinner"></div>
          <p>Loading channels...</p>
        </div>
      ) : (
        <>
          <div className="channel-list-sidebar">
            {channels.map(channel => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isSelected={selectedChannel?.id === channel.id}
                isFavorite={favoriteStatus[channel.id] || false}
                onSelect={onChannelSelect}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsName="channels"
            onNextPage={onNextPage}
            onPrevPage={onPrevPage}
            loading={loading}
          />
        </>
      )}
    </div>
  );
};

export default ChannelList;