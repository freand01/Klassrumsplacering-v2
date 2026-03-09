import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose }) => {
  const typeStyles = {
    success: 'bg-gradient-to-r from-emerald-500 to-green-500 shadow-emerald-500/40',
    error: 'bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/40',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/40',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/40'
  };

  const icons = {
    success: <CheckCircle size={22} />,
    error: <AlertCircle size={22} />,
    warning: <AlertTriangle size={22} />,
    info: <Info size={22} />
  };

  return (
    <div
      className={`fixed top-6 right-6 p-5 rounded-2xl shadow-2xl ${typeStyles[type]} text-white z-50 flex items-center gap-4 min-w-[320px] max-w-md backdrop-blur-sm print:hidden border border-white/20`}
      role="alert"
    >
      <div className="flex-shrink-0 animate-pulse">
        {icons[type]}
      </div>
      <div className="flex-grow">
        <p className="text-sm font-semibold">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:bg-white/20 rounded-lg p-1.5 transition-all hover:scale-110"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Toast;