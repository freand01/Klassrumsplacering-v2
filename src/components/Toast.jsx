import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose }) => {
  const typeStyles = {
    success: 'border-emerald-400/30',
    error: 'border-rose-400/30',
    warning: 'border-amber-400/30',
    info: 'border-cyan-400/30'
  };

  const icons = {
    success: <CheckCircle size={22} />,
    error: <AlertCircle size={22} />,
    warning: <AlertTriangle size={22} />,
    info: <Info size={22} />
  };

  return (
    <div
      className={`fixed top-6 right-6 p-4 rounded-2xl z-50 flex items-center gap-4 min-w-[320px] max-w-md print:hidden glass border ${typeStyles[type]}`}
      role="alert"
    >
      <div className="flex-shrink-0 animate-pulse">
        {icons[type]}
      </div>
      <div className="flex-grow">
        <p className="text-sm font-semibold text-text">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:bg-white/10 rounded-lg p-1.5 transition-all"
      >
        <X size={18} className="text-white/80" />
      </button>
    </div>
  );
};

export default Toast;