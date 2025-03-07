import React from 'react';

interface PlaylistUploaderProps {
  customPlaylistName: string;
  onNameChange: (name: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
}

/**
 * Component for uploading M3U files
 */
const PlaylistUploader: React.FC<PlaylistUploaderProps> = ({
  customPlaylistName,
  onNameChange,
  onFileUpload,
  loading
}) => {
  return (
    <div className="file-upload-wrapper">
      <h3>Upload New Playlist</h3>
      <div className="name-input-container">
        <label className="name-input-label">
          <span>Playlist Name (optional):</span>
          <input
            type="text"
            value={customPlaylistName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter a custom name for this playlist"
            className="name-input"
          />
        </label>
      </div>
      <label className="file-upload-button">
        <input
          type="file"
          accept=".m3u,.m3u8,.txt"
          onChange={onFileUpload}
          className="hidden-file-input"
        />
        <span className="upload-button-text">
          {loading ? 'Loading...' : 'Select M3U File'}
        </span>
      </label>
      <p className="upload-info">Choose an IPTV M3U playlist file from your computer</p>
    </div>
  );
};

export default PlaylistUploader;