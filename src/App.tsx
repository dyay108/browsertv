import React from 'react';
import './App.css';
import PlaylistManager from './components/playlists/PlaylistManager';

/**
 * Main App component that serves as the application root
 */
function App() {
  return (
    <div className="App">
      <PlaylistManager />
    </div>
  );
}

export default App;