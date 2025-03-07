import React, { useState } from 'react';

interface DirectStreamInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
}

/**
 * Component for entering a direct stream URL without loading a playlist
 */
const DirectStreamInput: React.FC<DirectStreamInputProps> = ({
  onSubmit,
  loading
}) => {
  const [streamUrl, setStreamUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamUrl.trim()) return;
    onSubmit(streamUrl);
  };

  return (
    <div className="manual-entry">
      <h3>Or Enter URL To Single Stream</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={streamUrl}
          onChange={(e) => setStreamUrl(e.target.value)}
          placeholder="Enter stream URL (Channel link)"
          className="url-input"
        />
        <button
          type="submit"
          className="play-button"
          disabled={loading || !streamUrl.trim()}
        >
          {loading ? 'Loading...' : 'Play Stream'}
        </button>
      </form>
    </div>
  );
};

export default DirectStreamInput;