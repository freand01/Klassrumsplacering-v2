import React, { useState } from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import { useApp, ACTIONS } from '../contexts/AppContext';

const ClassSelector = ({ showNotification, onClassSelect }) => {
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
	<div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
     <div className="flex items-center flex-wrap gap-3 w-full md:w-auto">
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <span className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <GraduationCap size={18} className="text-indigo-600" /> Klass:
          </span>
          {data.classes.map(c => (
            <button
              key={c.id}
              onClick={() => onClassSelect(c.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                currentClassId === c.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
              }`}
            >
              {c.name}
            </button>
          ))}
          {data.classes.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 px-4 py-2 rounded-xl border border-dashed border-gray-300">
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
  );
};

export default ClassSelector;