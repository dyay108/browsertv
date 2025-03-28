import React from 'react';
import { IChannel, IPlaylist } from '../../db';
import VideoPlayerContainer from '../player/VideoPlayerContainer';
import Sidebar from '../layout/Sidebar';
import { useUiVisibility } from '../../hooks/useUiVisibility';
import { useChannelGroups } from '../../hooks/useChannelGroups';

interface PlaylistViewerProps {
  selectedPlaylist: IPlaylist | null;
  playlistName: string;
  playlistUrl: string;
  isUpdating: boolean;
  selectedChannel: IChannel | null;
  onChannelSelect: (channel: IChannel | null) => void;
  onReturnToMainView: () => void;
  onChangePlaylist: () => void;
  onUpdatePlaylist: () => void;
  favoritesCount: number;
  isDirectStreamMode?: boolean;
}

/**
 * Main playlist viewer with sidebar and video player
 */
const PlaylistViewer: React.FC<PlaylistViewerProps> = ({
  selectedPlaylist,
  playlistName,
  playlistUrl,
  isUpdating,
  selectedChannel,
  onChannelSelect,
  onReturnToMainView,
  onChangePlaylist,
  onUpdatePlaylist,
  favoritesCount,
  isDirectStreamMode = false
}) => {
  // Use UI visibility hook for sidebar showing/hiding
  const {
    sidebarVisible,
    setSidebarVisible,
    showSidebar,
    startSidebarHideTimer,
    clearSidebarHideTimer
  } = useUiVisibility();

  // Use channel groups hook for managing group selection and channels
  const {
    groups,
    selectedGroup,
    groupChannelCounts,
    currentPage,
    totalPages,
    totalChannelsInGroup,
    channels,
    handleGroupSelect,
    sortGroupsAlphabetically,
    handleDragEnd,
    loadNextPage,
    loadPrevPage,
    loading
  } = useChannelGroups(selectedPlaylist);

  return (
    <div className="fullscreen-player-container">
      {/* Video Player */}
      <VideoPlayerContainer
        selectedChannel={selectedChannel}
        initialStreamUrl={selectedChannel?.url || ''}
        isDirectStreamMode={isDirectStreamMode}
        onReturnToMain={onReturnToMainView}
        onShowSidebar={showSidebar}
        onChannelSelect={onChannelSelect}
        isLoadingChannels={loading}
      />

      {/* Sidebar */}
      {!isDirectStreamMode && (
        <Sidebar
          playlistName={playlistName}
          selectedPlaylist={selectedPlaylist}
          visible={sidebarVisible}
          onVisibilityChange={setSidebarVisible}
          onChangePlaylist={onChangePlaylist}
          onUpdatePlaylist={onUpdatePlaylist}
          selectedGroup={selectedGroup}
          groups={groups}
          channels={channels}
          onGroupSelect={handleGroupSelect}
          groupChannelCounts={groupChannelCounts}
          favoritesCount={favoritesCount}
          onSortGroups={sortGroupsAlphabetically}
          onDragEnd={handleDragEnd}
          selectedChannel={selectedChannel}
          onChannelSelect={onChannelSelect}
          currentPage={currentPage}
          totalPages={totalPages}
          totalChannelsInGroup={totalChannelsInGroup}
          onNextPage={loadNextPage}
          onPrevPage={loadPrevPage}
          loading={loading}
          playlistUrl={playlistUrl}
          isUpdating={isUpdating}
          startHideTimer={startSidebarHideTimer}
          clearHideTimer={clearSidebarHideTimer}
        />
      )}
    </div>
  );
};

export default PlaylistViewer;