import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router';
import ProcessWireframe from "./components/ProcessWireframe";
import { Login } from "./components/Login";
import { OAuthCallback } from "./components/OAuthCallback";
import { isAuthenticated as isDatabricksAuthenticated } from './utils/databricksAuth';
import gemIcon from "figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png";

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // Check if user previously logged in (stored in localStorage)
    return localStorage.getItem('cohive_logged_in') === 'true';
  });

  // Set favicon to the gem icon
  useEffect(() => {
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = gemIcon;
    document.head.appendChild(link);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('cohive_logged_in', 'true');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <ProcessWireframe />
    </div>
  );
}

function OAuthCallbackWrapper() {
  const navigate = useNavigate();

  return (
    <OAuthCallback 
      onSuccess={() => {
        console.log('✅ OAuth successful, returning to app...');
        // Ensure user is marked as logged in (since they completed OAuth)
        localStorage.setItem('cohive_logged_in', 'true');
        // Use window.location to ensure a full page reload and state refresh
        window.location.href = '/';
      }}
      onError={(error) => {
        console.error('❌ OAuth error:', error);
        const errorMsg = typeof error === 'string' ? error : (error instanceof Error ? error.message : 'Unknown error');
        alert(`Authentication failed: ${errorMsg}. Please try again.`);
        // Ensure user is marked as logged in even on error (they already clicked Login button earlier)
        localStorage.setItem('cohive_logged_in', 'true');
        // Use window.location to ensure a full page reload
        window.location.href = '/';
      }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* OAuth callback route */}
        <Route path="/oauth/callback" element={<OAuthCallbackWrapper />} />
        
        {/* Main app route */}
        <Route path="*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}