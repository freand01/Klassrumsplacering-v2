import React, { useState, useEffect, useCallback } from 'react';
import { PenTool, RefreshCw, Printer, Save, Eraser, MousePointer2, RotateCcw, Layout, FilePlus, X } from 'lucide-react';
import Button from '../Button';
import Input from '../Input';
import FreePositioningCanvas from '../FreePositioningCanvas';
import { useApp, ACTIONS } from '../../contexts/AppContext';
import { DESIGN_BRUSH_TYPES } from '../../utils/constants';
import { SeatingOptimizer } from '../../utils/seatingAlgorithm';

const LayoutTab = ({ showNotification }) => {
  const { state, dispatch } = useApp();
  const { data, currentClassId } = state;

  const [isDesignMode, setIsDesignMode] = useState(false);
  const [designBrush, setDesignBrush] = useState(DESIGN_BRUSH_TYPES.SINGLE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMsg, setGenerationMsg] = useState('');
  const [planName, setPlanName] = useState('');
  const [layoutName, setLayoutName] = useState('');

  const [desks, setDesks] = useState([]);
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [lockedDesks, setLockedDesks] = useState(new Set());

  useEffect(() => { setSelectedDesk(null); }, [currentClassId]);

  useEffect(() => {
    if (!currentClassId) return;
    const active = data.activePlans?.[currentClassId];
    if (active && active.desks) {
      setDesks(active.desks);
      setLockedDesks(new Set(active.lockedDesks || []));
      setGenerationMsg("");
    } else {
      setDesks([]); setLockedDesks(new Set()); setGenerationMsg(""); setIsDesignMode(true);
    }
  }, [currentClassId, data.activePlans]);

  const updateActivePlanInState = useCallback((updates) => {
    dispatch({ type: ACTIONS.UPDATE_ACTIVE_PLAN, payload: { classId: currentClassId, updates } });
  }, [dispatch, currentClassId]);

  const handleDesksChange = (newDesks) => { setDesks(newDesks); updateActivePlanInState({ desks: newDesks }); };
  const handleDeskLockToggle = (deskId) => {
    const newLocked = new Set(lockedDesks);
    newLocked.has(deskId) ? newLocked.delete(deskId) : newLocked.add(deskId);
    setLockedDesks(newLocked); updateActivePlanInState({ lockedDesks: Array.from(newLocked) });
  };

  const handleDeskSelect = (desk, studentIndex) => {
    if (isDesignMode) return;
    const student = desk.students?.[studentIndex];
    if (!student) return;

    if (!selectedDesk) {
      setSelectedDesk({ deskId: desk.id, studentIndex });
    } else if (selectedDesk.deskId === desk.id && selectedDesk.studentIndex === studentIndex) {
      setSelectedDesk(null);
    } else {
      const sdObj = desks.find(d => d.id === selectedDesk.deskId);
      if (!sdObj) return;
      const s1 = sdObj.students[selectedDesk.studentIndex];
      const s2 = desk.students[studentIndex];

      const newDesks = desks.map(d => {
        if (d.id === selectedDesk.deskId && d.id === desk.id) {
          const arr = [...d.students]; arr[selectedDesk.studentIndex] = s2; arr[studentIndex] = s1; return { ...d, students: arr };
        } else if (d.id === selectedDesk.deskId) {
          const arr = [...d.students]; arr[selectedDesk.studentIndex] = s2; return { ...d, students: arr };
        } else if (d.id === desk.id) {
          const arr = [...d.students]; arr[studentIndex] = s1; return { ...d, students: arr };
        }
        return d;
      });
      setDesks(newDesks); setSelectedDesk(null); updateActivePlanInState({ desks: newDesks });
      showNotification(`${s1.name} och ${s2.name} bytte plats`, 'success');
    }
  };

  const generateSeating = () => {
    if (desks.length === 0) { showNotification('Möblera klassrummet först!', 'warning'); return; }
    const students = data.students.filter(s => s.classId === currentClassId);
    if (students.length === 0) { showNotification('Inga elever i klassen.', 'info'); return; }
    
    setIsGenerating(true); setGenerationMsg("Analyserar...");
    setTimeout(() => {
      const optimizer = new SeatingOptimizer({
        students, constraints: data.constraints.filter(c => c.classId === currentClassId), desks, lockedDesks, plans: data.plans.filter(p => p.classId === currentClassId)
      });
      const result = optimizer.generateSeating();
      setDesks(result.desks); updateActivePlanInState({ desks: result.desks });
      setGenerationMsg(`Klar! ${lockedDesks.size > 0 ? `(Låste ${lockedDesks.size} bänkar)` : ''}`);
      setIsGenerating(false); showNotification('Klass placerad', result.hardConflicts > 0 ? 'warning' : 'success');
    }, 100);
  };

  if (!currentClassId) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 print:hidden">
        <div className="flex justify-between">
          <Button variant={isDesignMode ? "primary" : "outline"} onClick={() => setIsDesignMode(!isDesignMode)}><PenTool size={16} />{isDesignMode ? "Klar med möblering" : "Ändra möblering"}</Button>
          <div className="flex gap-2">
            {!isDesignMode && <><Button onClick={generateSeating} disabled={isGenerating}>{isGenerating ? '...' : 'Generera'} <RefreshCw size={18} /></Button><Button variant="secondary" onClick={() => window.print()} disabled={desks.length === 0}><Printer size={18} /> Skriv ut</Button></>}
          </div>
        </div>

        {isDesignMode && (
          <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-purple-900 uppercase">Möbeltyper:</span>
              {[
                { type: DESIGN_BRUSH_TYPES.SINGLE, label: '🪑 Singel (1)' },
                { type: DESIGN_BRUSH_TYPES.PAIR, label: '🪑🪑 Dubbel (2)' },
                { type: DESIGN_BRUSH_TYPES.GROUP_4, label: '▦ Grupp 4' },
                { type: DESIGN_BRUSH_TYPES.GROUP_5, label: '⬡ Grupp 5' },
                { type: DESIGN_BRUSH_TYPES.GROUP_6, label: '▦ Grupp 6' }
              ].map(t => (
                <button key={t.type} onClick={() => setDesignBrush(t.type)} className={`px-3 py-2 rounded-lg border text-sm font-semibold ${designBrush === t.type ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-purple-900 border-purple-200'}`}>{t.label}</button>
              ))}
              <div className="h-6 w-[1px] bg-purple-200 mx-1"></div>
              <button onClick={() => setDesignBrush(DESIGN_BRUSH_TYPES.ERASER)} className={`px-3 py-2 rounded-lg border text-sm font-semibold ${designBrush === DESIGN_BRUSH_TYPES.ERASER ? 'bg-red-100 text-red-900' : 'bg-white text-gray-700'}`}><Eraser size={14} className="inline mr-1" /> Sudda</button>
            </div>
            
            <div className="flex justify-between items-center mt-2 border-t border-purple-200 pt-3">
              <div className="flex gap-2">
                <select className="p-2 text-sm border rounded-lg" onChange={(e) => { if (e.target.value) { const t = data.roomLayouts.find(l => l.id === e.target.value); if(t) { setDesks(t.desks); setLockedDesks(new Set()); updateActivePlanInState({desks: t.desks}); showNotification('Mall laddad', 'success'); } } }} value=""><option value="" disabled>Ladda mall...</option>{data.roomLayouts.filter(l => l.classId === currentClassId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                <input type="text" placeholder="Namn på mall..." className="p-2 text-sm border rounded-lg w-32" value={layoutName} onChange={e => setLayoutName(e.target.value)} />
                <Button variant="primary" className="text-sm py-1" disabled={!layoutName.trim() || desks.length === 0} onClick={() => { dispatch({type: ACTIONS.SAVE_ROOM_LAYOUT, payload: {id: crypto.randomUUID(), classId: currentClassId, name: layoutName, desks: desks.map(d => ({...d, students: []}))}}); setLayoutName(''); showNotification('Mall sparad', 'success'); }}>Spara mall</Button>
              </div>
              <button onClick={() => { setDesks([]); updateActivePlanInState({ desks: [] }); showNotification('Rensat', 'info'); }} className="text-xs text-red-600 hover:bg-red-50 p-2 rounded flex items-center"><RotateCcw size={12} className="mr-1"/> Rensa rum</button>
            </div>
          </div>
        )}
      </div>

      <FreePositioningCanvas isDesignMode={isDesignMode} currentBrush={designBrush} desks={desks} onDesksChange={handleDesksChange} lockedDesks={lockedDesks} onToggleLock={handleDeskLockToggle} selectedDesk={selectedDesk} onDeskSelect={handleDeskSelect} />

      {!isDesignMode && desks.length > 0 && (
        <div className="mt-8 flex gap-4 justify-center items-end bg-white p-4 rounded-xl border print:hidden">
          <div className="flex-grow max-w-xs">
            <label className="text-xs text-gray-500 ml-1">Spara placering som:</label>
            <Input placeholder="T.ex. Vecka 42..." value={planName} onChange={e => setPlanName(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={() => { dispatch({type: ACTIONS.SAVE_PLAN, payload: {id: crypto.randomUUID(), classId: currentClassId, name: planName || `Placering ${new Date().toLocaleDateString('sv-SE')}`, desks, lockedDesks: Array.from(lockedDesks), createdAt: Date.now()}}); setPlanName(''); showNotification('Sparad', 'success'); }}><Save size={18} /> Spara</Button>
        </div>
      )}
    </div>
  );
};

export default LayoutTab;