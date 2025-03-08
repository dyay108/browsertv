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
          {loading ? (
            <span className="button-loading">
              <svg className="spinner" viewBox="0 0 50 50">
                <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
              </svg>
              Loading...
            </span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Play Stream
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default DirectStreamInput;