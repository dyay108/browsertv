import React from 'react';
import './App.css';
import PlaylistManager from './components/playlists/PlaylistManager';
import { StreamProvider } from './contexts/streamContext';

/**
 * Main App component that serves as the application root
 */
function App() {
  return (
    <StreamProvider>
      <PlaylistManager />
    </StreamProvider>
  );
}

export default App;