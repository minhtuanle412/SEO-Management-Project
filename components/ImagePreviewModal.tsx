import React from 'react';
import { XIcon } from './Icons';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, imageUrl, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex justify-center items-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative bg-white p-4 rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full"
        onClick={e => e.stopPropagation()} // Prevent closing modal when clicking on the image/container
      >
        <button 
          onClick={onClose} 
          className="absolute -top-3 -right-3 text-white bg-gray-800 rounded-full p-1 hover:bg-black focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close image preview"
        >
          <XIcon className="h-6 w-6" />
        </button>
        <img 
          src={imageUrl} 
          alt="Preview" 
          className="w-full h-full object-contain max-h-[calc(90vh-2rem)]" // Max height respects padding
        />
      </div>
       <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ImagePreviewModal;
