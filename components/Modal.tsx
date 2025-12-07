
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = '4xl' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };

  const widthClass = sizeClasses[size] || 'max-w-4xl';

  return (
    <div className="fixed inset-0 bg-yellow-400 bg-opacity-90 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
        {/* Halftone overlay for modal bg */}
        <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
                backgroundImage: 'radial-gradient(#000 20%, transparent 20%)',
                backgroundSize: '10px 10px'
            }}
        ></div>

      <div className={`relative bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full ${widthClass} max-h-[90vh] flex flex-col`}>
        <div className="flex justify-between items-center p-4 border-b-4 border-black bg-white">
          <h2 className="text-2xl font-black italic uppercase text-black transform -skew-x-6">{title}</h2>
          <button onClick={onClose} className="text-black hover:text-pink-600 transition-colors bg-white border-2 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
