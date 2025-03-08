import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import PlaylistManager from './components/playlists/PlaylistManager';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProtectedRoute from './components/auth/ProtectedRoute';

/**
 * Main App component that serves as the application root
 */
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route 
              path="/playlists" 
              element={
                <ProtectedRoute>
                  <PlaylistManager />
                </ProtectedRoute>
              } 
            />
            
            {/* Redirect root to playlists or login based on auth status */}
            <Route path="/" element={<Navigate to="/playlists" />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;