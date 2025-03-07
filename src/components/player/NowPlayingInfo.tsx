import React from 'react';
import { IChannel } from '../../db';

interface NowPlayingInfoProps {
  channel: IChannel;
  visible: boolean;
  onShowSidebar: () => void;
}

/**
 * Displays the currently playing channel information
 */
const NowPlayingInfo: React.FC<NowPlayingInfoProps> = ({
  channel,
  visible,
  onShowSidebar
}) => {
  if (!channel) return null;
  
  return (
    <div
      className={`now-playing-info clickable ${visible ? 'visible' : 'hidden'}`}
      onClick={onShowSidebar}
      title="Click to show channel list"
    >
      <div className="channel-logo-small">
        {channel.logo ? (
          <img 
            src={channel.logo} 
            alt={channel.name} 
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path fill="%23aaa" d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z"/></svg>';
            }}
          />
        ) : (
          <div className="default-logo-small">TV</div>
        )}
      </div>
      <div className="now-playing-text">
        <div className="now-playing-title">Now Playing:</div>
        <div className="now-playing-name">{channel.name}</div>
      </div>
      <div className="channels-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </div>
    </div>
  );
};

export default NowPlayingInfo;