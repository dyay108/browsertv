import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <div className="not-found-actions">
          <button 
            className="primary-button"
            onClick={() => navigate('/playlists')}
          >
            Back to Home
          </button>
          <button 
            className="secondary-button"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;