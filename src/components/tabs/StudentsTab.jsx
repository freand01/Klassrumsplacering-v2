import React, { useState } from 'react';
import { Users, ListPlus, ClipboardList, Edit2, UserMinus, X, Plus, Trash2 } from 'lucide-react';
import Button from '../Button';
import Input from '../Input';
import { useApp, ACTIONS } from '../../contexts/AppContext';

const StudentsTab = ({ onEditStudent, onShowPasteModal, onDeleteClass, showNotification }) => {
  const { state, dispatch } = useApp();
  const { data, currentClassId } = state;

  const [newStudentName, setNewStudentName] = useState('');
  const [studentAttr, setStudentAttr] = useState({ front: false, wall: false, solo: false });
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkList, setBulkList] = useState([{ id: '1', name: '', front: false, wall: false, solo: false }]);

  const getStudents = () => data.students.filter(s => s.classId === currentClassId).sort((a, b) => a.name.localeCompare(b.name));

  const addStudent = () => {
    if (!newStudentName.trim()) { showNotification('Ange ett elevnamn', 'warning'); return; }
    dispatch({
      type: ACTIONS.ADD_STUDENT,
      payload: { id: crypto.randomUUID(), classId: currentClassId, name: newStudentName.trim(), needsFront: studentAttr.front, needsWall: studentAttr.wall, needsSolo: studentAttr.solo, createdAt: Date.now() }
    });
    setNewStudentName(''); setStudentAttr({ front: false, wall: false, solo: false });
    showNotification('Elev tillagd', 'success');
  };

  const saveBulkList = () => {
    const validStudents = bulkList.filter(s => s.name.trim() !== '').map(s => ({
      id: crypto.randomUUID(), classId: currentClassId, name: s.name.trim(), needsFront: s.front, needsWall: s.wall, needsSolo: s.solo, createdAt: Date.now()
    }));
    if (validStudents.length > 0) {
      dispatch({ type: ACTIONS.ADD_STUDENTS_BULK, payload: validStudents });
      setBulkList([{ id: crypto.randomUUID(), name: '', front: false, wall: false, solo: false }]);
      setIsBulkMode(false);
      showNotification(`${validStudents.length} elever tillagda`, 'success');
    }
  };

  if (!currentClassId) return null;

  return (
    <div className="space-y-6 print:hidden">
      {!isBulkMode ? (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold flex gap-2 items-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              <Users size={22} className="text-indigo-600" /> Lägg till elev
            </h3>
            <div className="flex gap-4 items-center">
              <button onClick={() => setIsBulkMode(true)} className="text-sm text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-700">
                <ListPlus size={16} /> Lägg till flera...
              </button>
              <button onClick={onShowPasteModal} className="text-sm text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-700">
                <ClipboardList size={16} /> Klistra in lista
              </button>
              <button onClick={() => onDeleteClass(currentClassId)} className="text-xs text-red-400 font-medium hover:text-red-600 ml-4">
                Ta bort klass
              </button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-grow">
              <Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Namn..." />
            </div>
            <div className="flex gap-4 mb-2 text-sm text-gray-700">
              <label className="flex gap-2 cursor-pointer items-center"><input type="checkbox" checked={studentAttr.front} onChange={e => setStudentAttr({...studentAttr, front: e.target.checked})} /> Nära tavlan</label>
              <label className="flex gap-2 cursor-pointer items-center"><input type="checkbox" checked={studentAttr.wall} onChange={e => setStudentAttr({...studentAttr, wall: e.target.checked})} /> Vid vägg</label>
              <label className="flex gap-2 cursor-pointer items-center"><input type="checkbox" checked={studentAttr.solo} onChange={e => setStudentAttr({...studentAttr, solo: e.target.checked})} /> Ensam</label>
            </div>
            <Button onClick={addStudent}>Lägg till</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 relative">
          <button onClick={() => setIsBulkMode(false)} className="absolute top-4 right-4 text-gray-400"><X size={20} /></button>
          <h3 className="font-semibold flex gap-2 mb-4 text-lg"><ListPlus size={24} className="text-blue-600" /> Lägg till flera elever</h3>
          <div className="space-y-3 mb-6">
            <div className="flex gap-2 text-xs font-bold text-gray-500 uppercase px-1">
              <div className="flex-grow">Namn</div><div className="w-16 text-center">Tavla</div><div className="w-16 text-center">Vägg</div><div className="w-16 text-center">Ensam</div><div className="w-8"></div>
            </div>
            {bulkList.map((item, idx) => (
              <div key={item.id} className="flex gap-2 items-center">
                <div className="flex-grow"><Input value={item.name} onChange={e => setBulkList(prev => prev.map(p => p.id === item.id ? {...p, name: e.target.value} : p))} placeholder={`Elev ${idx + 1}`} autoFocus={idx===0} /></div>
                <label className="w-16 flex justify-center"><input type="checkbox" className="w-5 h-5" checked={item.front} onChange={e => setBulkList(prev => prev.map(p => p.id === item.id ? {...p, front: e.target.checked} : p))} /></label>
                <label className="w-16 flex justify-center"><input type="checkbox" className="w-5 h-5" checked={item.wall} onChange={e => setBulkList(prev => prev.map(p => p.id === item.id ? {...p, wall: e.target.checked} : p))} /></label>
                <label className="w-16 flex justify-center"><input type="checkbox" className="w-5 h-5" checked={item.solo} onChange={e => setBulkList(prev => prev.map(p => p.id === item.id ? {...p, solo: e.target.checked} : p))} /></label>
                <button onClick={() => setBulkList(prev => prev.length > 1 ? prev.filter(p => p.id !== item.id) : prev)} className="w-8 text-gray-300 hover:text-red-500 flex justify-center"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t pt-4">
            <Button variant="ghost" onClick={() => setBulkList([...bulkList, { id: crypto.randomUUID(), name: '', front: false, wall: false, solo: false }])}><Plus size={16} /> Lägg till rad</Button>
            <div className="flex gap-2"><Button variant="secondary" onClick={() => setIsBulkMode(false)}>Avbryt</Button><Button onClick={saveBulkList}>Spara alla</Button></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {getStudents().map((s) => (
          <div key={s.id} onClick={() => onEditStudent(s)} className="bg-white p-4 rounded-xl border-2 border-gray-100 flex justify-between items-center cursor-pointer hover:border-indigo-300 hover:shadow-lg transition-all group">
            <div>
              <div className="font-semibold text-gray-800 group-hover:text-indigo-700 flex items-center gap-2">
                {s.name} <Edit2 size={13} className="opacity-0 group-hover:opacity-100 text-indigo-400" />
              </div>
              <div className="flex gap-2 mt-2">
                {s.needsFront && <span className="text-[10px] font-semibold bg-yellow-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Tavla</span>}
                {s.needsWall && <span className="text-[10px] font-semibold bg-green-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Vägg</span>}
                {s.needsSolo && <span className="text-[10px] font-semibold bg-blue-100 text-sky-700 px-2 py-0.5 rounded-full border border-sky-200">Ensam</span>}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); dispatch({ type: ACTIONS.REMOVE_STUDENT, payload: s.id }); showNotification('Elev borttagen', 'info'); }} className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50"><UserMinus size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentsTab;