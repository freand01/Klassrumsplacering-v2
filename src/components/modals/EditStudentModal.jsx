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
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100">
        <h3 className="text-xl font-bold mb-5 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          <Edit2 size={22} className="text-indigo-600" /> Redigera Elev
        </h3>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Namn</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:border-amber-300 transition-all duration-200">
              <input type="checkbox" checked={front} onChange={e => setFront(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
              <span className="font-medium text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-400"></span>
                Måste sitta nära tavlan
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:border-emerald-300 transition-all duration-200">
              <input type="checkbox" checked={wall} onChange={e => setWall(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
              <span className="font-medium text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-400"></span>
                Måste sitta vid vägg
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 hover:border-blue-300 transition-all duration-200">
              <input type="checkbox" checked={solo} onChange={e => setSolo(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
              <span className="font-medium text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-sky-400"></span>
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