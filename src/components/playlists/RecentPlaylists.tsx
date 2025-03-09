import React from 'react';
import { Playlist } from '../../types/pocketbase-types';
import PaginationControls from '../common/PaginationControls';

interface RecentPlaylistsProps {
  playlists: Playlist[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (id: string) => void;
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
}

/**
 * Component to display and manage recent playlists
 */
const RecentPlaylists: React.FC<RecentPlaylistsProps> = ({
  playlists,
  onSelectPlaylist,
  onDeletePlaylist,
  currentPage,
  totalPages,
  onNextPage,
  onPrevPage
}) => {
  if (!playlists || playlists.length === 0) {
    return null;
  }

  return (
    <div className="saved-playlists">
      <h3>Recent Playlists</h3>
      <div className="playlist-list">
        {playlists.map(playlist => (
          <div
            key={playlist.id}
            className="playlist-item"
            onClick={() => onSelectPlaylist(playlist)}
          >
            <div className="playlist-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18v5h-18v-5z"></path>
                <path d="M3 16h18v2h-18v-2z"></path>
                <path d="M3 13h5v3h-5v-3z"></path>
                <path d="M10 13h5v3h-5v-3z"></path>
                <path d="M17 13h4v3h-4v-3z"></path>
              </svg>
            </div>
            <div className="playlist-info">
              <span className="playlist-name">{playlist.name}</span>
              <span className="playlist-date">
                {new Date(playlist.lastUsed).toLocaleDateString()}
              </span>
            </div>
            <button
              className="playlist-delete"
              onClick={(e) => {
                e.stopPropagation();
                if (playlist.id) {
                  onDeletePlaylist(playlist.id);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
      />
    </div>
  );
};

export default RecentPlaylists;