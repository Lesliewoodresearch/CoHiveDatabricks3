import { useState, useEffect } from 'react';
import ProcessWireframe from "./components/ProcessWireframe";
import { Login } from "./components/Login";
import gemIcon from "figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png";

export default function App() {
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