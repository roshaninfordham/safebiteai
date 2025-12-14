import React from 'react';

interface AvatarProps {
  show: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
        <div className="aspect-video w-full relative">
           <iframe
            src="https://lab.anam.ai/frame/JQJbmEtA7xAW8FjLs7NC6"
            className="w-full h-full absolute inset-0 border-0"
            allow="microphone"
            title="SafeBite Avatar"
          ></iframe>
        </div>
        <button 
          onClick={() => window.location.reload()} // Simple close for demo
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Avatar;
