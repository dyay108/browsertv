import React from 'react';
import { IChannel } from '../../db';

interface ChannelItemProps {
  channel: IChannel;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (channel: IChannel) => void;
  onToggleFavorite: (channel: IChannel) => void;
}

/**
 * Displays a single channel with logo, name, and favorite toggle
 */
const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite
}) => {
  return (
    <div className={`channel-item-sidebar ${isSelected ? 'selected' : ''}`}>
      <div 
        className="channel-content"
        onClick={() => onSelect(channel)}
      >
        <div className="channel-logo-sidebar">
          {channel.logo ? (
            <img 
              src={channel.logo} 
              alt={channel.name} 
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path fill="%23aaa" d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z"/></svg>';
              }}
            />
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
        className={`favorite-toggle ${isFavorite ? 'is-favorite' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(channel);
        }}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill={isFavorite ? "currentColor" : "none"} 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </div>
    </div>
  );
};

export default ChannelItem;