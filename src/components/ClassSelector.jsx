import React, { useState } from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import { useApp, ACTIONS } from '../contexts/AppContext';

const ClassSelector = ({ theme = 'dark', showNotification, onClassSelect }) => {
  const { state, dispatch } = useApp();
  const { data, currentClassId } = state;
  const [newClassName, setNewClassName] = useState('');

  const addClass = () => {
    if (!newClassName.trim()) {
      showNotification('Ange ett klassnamn', 'warning');
      return;
    }
    const newClass = {
      id: crypto.randomUUID(),
      name: newClassName.trim(),
      createdAt: Date.now()
    };
    dispatch({ type: ACTIONS.ADD_CLASS, payload: newClass });
    // Triggar vår navigationshanterare i App.jsx
    onClassSelect(newClass.id);
    setNewClassName('');
    showNotification('Klass skapad!', 'success');
  };

  return (
	<div className="max-w-5xl mx-auto px-4 md:px-0 py-3">
     <div className="glass-strong rounded-2xl p-3 flex flex-col md:flex-row gap-4 items-center justify-between">
     <div className="flex items-center flex-wrap gap-3 w-full md:w-auto">
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <span className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${theme === 'light' ? 'text-muted' : 'text-white/80'}`}>
            <GraduationCap size={18} className="text-primary-2" /> Klass:
          </span>
          {data.classes.map(c => (
            <button
              key={c.id}
              onClick={() => onClassSelect(c.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                currentClassId === c.id
                  ? `bg-white/12 ${theme === 'light' ? 'text-text border-border/70' : 'text-white border-white/15'} shadow-glow`
                  : `${theme === 'light' ? 'bg-black/0 text-text/80 hover:bg-black/5 border border-transparent hover:border-border/60' : 'bg-white/6 text-white/80 hover:bg-white/10 border border-transparent hover:border-white/10'}`
              }`}
            >
              {c.name}
            </button>
          ))}
          {data.classes.length === 0 && (
            <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-dashed ${theme === 'light' ? 'text-muted bg-black/0 border-border/70' : 'text-white/55 bg-white/4 border-white/15'}`}>
              <span className="italic">Skapa din första klass</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="Ny klass..."
            value={newClassName}
            onChange={e => setNewClassName(e.target.value)}
            className="w-full md:w-40 text-sm"
          />
          <Button onClick={addClass} variant="secondary" className="text-sm whitespace-nowrap">
            <Plus size={16} /> Skapa
          </Button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ClassSelector;