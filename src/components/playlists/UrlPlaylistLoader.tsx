import React from 'react';

interface UrlPlaylistLoaderProps {
  customPlaylistName: string;
  onNameChange: (name: string) => void;
  playlistUrl: string;
  onUrlChange: (url: string) => void;
  onFetchPlaylist: () => void;
  loading: boolean;
  useCorsProxy: boolean;
  onToggleCorsProxy: () => void;
  corsProxyUrl: string;
  onCorsProxyUrlChange: (url: string) => void;
  processingStatus: string;
}

/**
 * Component for loading M3U playlists from URLs
 */
const UrlPlaylistLoader: React.FC<UrlPlaylistLoaderProps> = ({
  customPlaylistName,
  onNameChange,
  playlistUrl,
  onUrlChange,
  onFetchPlaylist,
  loading,
  useCorsProxy,
  onToggleCorsProxy,
  corsProxyUrl,
  onCorsProxyUrlChange,
  processingStatus
}) => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasError = processingStatus && (
    processingStatus.includes('404') || 
    processingStatus.includes('CORS') || 
    processingStatus.includes('failed')
  );

  return (
    <div className="url-upload-wrapper">
      <h3>Load M3U Playlist from URL</h3>
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
      <div className="url-input-container">
        <input
          type="text"
          value={playlistUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Enter M3U playlist URL"
          className="url-input"
          disabled={loading}
        />
        <button
          onClick={onFetchPlaylist}
          className="load-url-button"
          disabled={loading || !playlistUrl.trim()}
        >
          {loading ? 'Loading...' : 'Load Playlist'}
        </button>
      </div>
      
      <div className="cors-options-playlist">
        <label className="cors-option">
          <input
            type="checkbox"
            checked={useCorsProxy}
            onChange={onToggleCorsProxy}
          />
          <span>Use CORS Proxy for Playlist Fetching</span>
        </label>
        
        <div className="cors-url-input">
          <input
            type="text"
            value={corsProxyUrl}
            onChange={(e) => onCorsProxyUrlChange(e.target.value)}
            placeholder="Enter CORS proxy URL (e.g., https://corsproxy.io/)"
            disabled={!useCorsProxy}
          />
        </div>
      </div>
      
      <div className="upload-info">
        <p>Load an IPTV M3U playlist directly from a URL</p>
        
        {isLocalhost && (
          <div style={{ display: 'block', marginTop: '5px', color: '#009688', fontWeight: 'bold' }}>
            Running on localhost - Use a CORS Proxy if encountering CORS errors.
          </div>
        )}

        {hasError && (
          <div style={{ marginTop: '10px', background: '#ffe0e0', padding: '10px', borderRadius: '4px' }}>
            <p><strong>Error:</strong> {processingStatus}</p>
            {processingStatus.includes('CORS') && !useCorsProxy && (
              <p>Enable the CORS Proxy option above and provide a CORS proxy URL to solve this issue.</p>
            )}
            {processingStatus.includes('CORS') && useCorsProxy && (
              <p>Make sure your CORS proxy URL is correct and the proxy service is working.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UrlPlaylistLoader;