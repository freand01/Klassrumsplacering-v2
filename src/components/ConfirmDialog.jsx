import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

const ConfirmDialog = ({ message, onConfirm, onCancel, confirmText = 'Bekräfta', cancelText = 'Avbryt' }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-glow">
            <AlertTriangle className="text-warning" size={22} />
          </div>
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-text mb-2">Bekräfta åtgärd</h3>
            <p className="text-sm text-muted leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;