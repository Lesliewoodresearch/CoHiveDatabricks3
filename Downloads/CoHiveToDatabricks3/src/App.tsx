import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ProcessWireframe from "./components/ProcessWireframe";
import { Login } from "./components/Login";
import { OAuthCallback } from "./components/OAuthCallback";
import gemIcon from "figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png";

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
        console.log('✅ OAuth successful, redirecting to app...');
        navigate('/');
      }}
      onError={(error) => {
        console.error('❌ OAuth error:', error);
        alert(`Authentication failed: ${error.message}`);
        navigate('/');
      }}
    />
  );
}

export default function App() {
  return (
    <Routes>
      {/* OAuth callback route */}
      <Route path="/oauth/callback" element={<OAuthCallbackWrapper />} />
      
      {/* Main app route */}
      <Route path="*" element={<AppContent />} />
    </Routes>
  );
}
