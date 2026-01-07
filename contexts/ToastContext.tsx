import React, { useState, useCallback, createContext, useContext } from 'react';
import { XIcon } from '../components/Icons';

// --- Toast Notification System ---
type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error';
};

type ToastContextType = {
  addToast: (message: string, type: 'success' | 'error') => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void; }> = ({ message, type, onClose }) => {
  const baseClasses = 'relative w-full max-w-sm p-4 pr-10 rounded-lg shadow-lg flex items-start space-x-3 transition-all duration-300 animate-fade-in-right';
  const typeClasses = {
    success: 'bg-green-50 text-green-800 border border-green-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
  };
  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button onClick={onClose} className="absolute top-1/2 right-2 -translate-y-1/2 text-current opacity-70 hover:opacity-100">
        <XIcon className="h-5 w-5" />
      </button>
      <style>{`
        @keyframes fade-in-right { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const removeToast = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };
  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  }, []);
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
