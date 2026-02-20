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
    const loggedIn = localStorage.getItem('cohive_logged_in') === 'true';
    console.log('🔍 App.tsx - isLoggedIn check:', loggedIn);
    return loggedIn;
  });

  // Set favicon to the gem icon
  useEffect(() => {
    console.log('🔍 App.tsx - AppContent mounted');
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = gemIcon;
    document.head.appendChild(link);
  }, []);

  const handleLogin = () => {
    console.log('🔍 App.tsx - handleLogin called');
    setIsLoggedIn(true);
    localStorage.setItem('cohive_logged_in', 'true');
  };

  console.log('🔍 App.tsx - Rendering, isLoggedIn:', isLoggedIn);

  if (!isLoggedIn) {
    console.log('🔍 App.tsx - Rendering Login component');
    return <Login onLogin={handleLogin} />;
  }

  console.log('🔍 App.tsx - Rendering ProcessWireframe');
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
        // Get the path we should return to (defaults to /app if hex page)
        const returnPath = sessionStorage.getItem('oauth_return_path') || '/';
        sessionStorage.removeItem('oauth_return_path');
        navigate(returnPath);
      }}
      onError={(error) => {
        console.error('❌ OAuth error:', error);
        const errorMsg = typeof error === 'string' ? error : (error instanceof Error ? error.message : 'Unknown error');
        alert(`Authentication failed: ${errorMsg}. Please try again.`);
        // Return to app, not landing page
        navigate('/');
      }}
    />
  );
}

export default function App() {
  console.log('🔍 App.tsx - App component rendering');
  
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