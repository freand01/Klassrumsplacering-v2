import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';
import Button from '../Button';
import Input from '../Input';

const EditStudentModal = ({ student, onClose, onSave }) => {
  const [name, setName] = useState(student.name);
  const [front, setFront] = useState(student.needsFront);
  const [wall, setWall] = useState(student.needsWall);
  const [solo, setSolo] = useState(student.needsSolo || false);

  const handleSave = () => {
    onSave(student.id, { name, needsFront: front, needsWall: wall, needsSolo: solo });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden animate-fade-in">
      <div className="glass rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-xl font-bold mb-5 flex items-center gap-2 text-text">
          <Edit2 size={22} className="text-primary-2" /> Redigera Elev
        </h3>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-white/80 mb-2 block">Namn</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-white/12 rounded-xl cursor-pointer hover:bg-white/6 transition-all duration-200">
              <input type="checkbox" checked={front} onChange={e => setFront(e.target.checked)} className="w-5 h-5 rounded" />
              <span className="font-medium text-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning"></span>
                Måste sitta nära tavlan
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 border border-white/12 rounded-xl cursor-pointer hover:bg-white/6 transition-all duration-200">
              <input type="checkbox" checked={wall} onChange={e => setWall(e.target.checked)} className="w-5 h-5 rounded" />
              <span className="font-medium text-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                Måste sitta vid vägg
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 border border-white/12 rounded-xl cursor-pointer hover:bg-white/6 transition-all duration-200">
              <input type="checkbox" checked={solo} onChange={e => setSolo(e.target.checked)} className="w-5 h-5 rounded" />
              <span className="font-medium text-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary2"></span>
                Ska sitta ensam
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave}>Spara ändringar</Button>
        </div>
      </div>
    </div>
  );
};

export default EditStudentModal;