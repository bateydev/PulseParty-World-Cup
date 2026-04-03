import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'from-green-500 to-emerald-600',
    error: 'from-red-500 to-red-600',
    info: 'from-blue-500 to-blue-600',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-slideDown">
      <div className={`bg-gradient-to-r ${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px]`}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
          {icons[type]}
        </div>
        <p className="font-semibold flex-1">{message}</p>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
