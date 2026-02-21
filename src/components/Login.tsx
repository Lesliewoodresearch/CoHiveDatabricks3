import loginImage from 'figma:asset/11e423d80e5ce28fde4173da3dcb80d9f7d0c8fe.png';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Login Button - Top Right */}
      <button
        onClick={onLogin}
        className="fixed top-6 right-6 z-50 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors shadow-lg hover:shadow-xl text-base"
      >
        Login
      </button>

      {/* Large Logo - Center */}
      <div className="flex items-center justify-center max-w-7xl w-full">
        <img 
          src={loginImage} 
          alt="CoHive - Insight into Inspiration" 
          className="w-full h-auto object-contain"
          style={{ maxWidth: '1200px' }}
        />
      </div>
    </div>
  );
}