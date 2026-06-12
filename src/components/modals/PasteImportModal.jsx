import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import Button from '../Button';

const PasteImportModal = ({ onClose, onImport }) => {
  const [text, setText] = useState('');

  const getParsedNames = (inputText) => {
    return inputText.split(/[\n,]+/).map(n => n.trim()).filter(n => n !== '');
  };

  const handleImport = () => {
    const names = getParsedNames(text);
    if (names.length > 0) {
      onImport(names);
      onClose();
    }
  };

  const count = getParsedNames(text).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden animate-fade-in">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-text">
          <ClipboardList size={22} className="text-primary-2" /> Klistra in namn
        </h3>
        <p className="text-sm text-muted mb-5">
          Klistra in din namnlista här. Separera med ny rad eller kommatecken.
        </p>

        <textarea
          className="w-full h-48 p-4 border border-border/60 rounded-xl focus:ring-2 focus:ring-ring/30 focus:border-ring/70 hover:border-border outline-none resize-none mb-5 font-mono text-sm transition-all duration-200 bg-panel/60 text-text placeholder:text-muted/70"
          placeholder={"Anna, Bertil, Cecilia\nDavid\nErika, Fredrik"}
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
        />

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleImport} disabled={!text.trim()}>
            Importera {count > 0 ? `(${count})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PasteImportModal;