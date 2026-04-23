import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PenTool, RefreshCw, Printer, Save, RotateCcw, LayoutTemplate, Users, Magnet, AlignCenter, Circle, Star } from 'lucide-react';
import Button from '../Button';
import Input from '../Input';
import FreePositioningCanvas from '../FreePositioningCanvas';
import { useApp, ACTIONS } from '../../contexts/AppContext';
import { DESIGN_BRUSH_TYPES } from '../../utils/constants';
import { SeatingOptimizer } from '../../utils/seatingAlgorithm';

const getWeekNumber = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

const LayoutTab = ({ showNotification, setHasUnsavedChanges }) => {
  const { state, dispatch } = useApp();
  const { data, currentClassId } = state;

  const [isDesignMode, setIsDesignMode] = useState(false);
  const [designBrush, setDesignBrush] = useState(DESIGN_BRUSH_TYPES.SINGLE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planName, setPlanName] = useState('');
  const [layoutName, setLayoutName] = useState('');
  const [desks, setDesks] = useState([]);
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [lockedSeats, setLockedSeats] = useState(new Set());
  const [localUnsaved, setLocalUnsaved] = useState(false);
  const [desksBackup, setDesksBackup] = useState(null);
  
  // NYTT: State för att hantera utskriftsläget (Färg vs Svartvit)
  const [printBw, setPrintBw] = useState(true);

  const safeDesks = Array.isArray(desks) ? desks : [];

  const updateUnsavedChanges = useCallback((value) => {
    if (typeof setHasUnsavedChanges === 'function') {
      setHasUnsavedChanges(value);
    }
  }, [setHasUnsavedChanges]);

  useEffect(() => { 
    setSelectedDesk(null); 
    updateUnsavedChanges(false); 
    setLocalUnsaved(false); 
    setDesksBackup(null); 
    setPlanName('');
  }, [currentClassId, updateUnsavedChanges]);

  useEffect(() => {
    if (!currentClassId) return;
    const active = data?.activePlans?.[currentClassId];
    if (active && Array.isArray(active.desks)) {
      setDesks(active.desks); 
      setLockedSeats(new Set(Array.isArray(active.lockedSeats) ? active.lockedSeats : []));
    } else {
      setDesks([]); setLockedSeats(new Set()); setIsDesignMode(true);
    }
  }, [currentClassId, data?.activePlans]);

  const pastPairs = useMemo(() => {
    const pairs = {};
    if (!Array.isArray(data?.plans)) return pairs;
    
    data.plans.filter(p => p && p.classId === currentClassId).forEach(plan => {
      if (!Array.isArray(plan.desks)) return;
      plan.desks.filter(Boolean).forEach(desk => {
        const studentIds = Array.isArray(desk.students) ? desk.students.filter(Boolean).map(s => s?.id).filter(Boolean) : [];
        for (let i = 0; i < studentIds.length; i++) {
          for (let j = i + 1; j < studentIds.length; j++) {
            if (!pairs[studentIds[i]]) pairs[studentIds[i]] = new Set();
            if (!pairs[studentIds[j]]) pairs[studentIds[j]] = new Set();
            pairs[studentIds[i]].add(studentIds[j]);
            pairs[studentIds[j]].add(studentIds[i]);
          }
        }
      });
    });
    return pairs;
  }, [data?.plans, currentClassId]);

  const backupPairs = useMemo(() => {
    const pairs = {};
    if (!Array.isArray(desksBackup)) return pairs;
    
    desksBackup.filter(Boolean).forEach(desk => {
      const studentIds = Array.isArray(desk.students) ? desk.students.filter(Boolean).map(s => s?.id).filter(Boolean) : [];
      for (let i = 0; i < studentIds.length; i++) {
        for (let j = i + 1; j < studentIds.length; j++) {
          if (!pairs[studentIds[i]]) pairs[studentIds[i]] = new Set();
          if (!pairs[studentIds[j]]) pairs[studentIds[j]] = new Set();
          pairs[studentIds[i]].add(studentIds[j]);
          pairs[studentIds[j]].add(studentIds[i]);
        }
      }
    });
    return pairs;
  }, [desksBackup]);

  const historyConflicts = useMemo(() => {
    const conflicts = {};
    if (!localUnsaved || !Array.isArray(safeDesks)) return conflicts; 

    safeDesks.filter(Boolean).forEach(desk => {
      const presentStudents = Array.isArray(desk.students) ? desk.students.filter(Boolean) : [];
      const deskConflictMsgs = [];

      for (let i = 0; i < presentStudents.length; i++) {
        for (let j = i + 1; j < presentStudents.length; j++) {
          const s1 = presentStudents[i];
          const s2 = presentStudents[j];
          
          if (!s1 || !s2 || !s1.id || !s2.id) continue;

          const isNewPair = !backupPairs[s1.id]?.has(s2.id);
          
          if (isNewPair && pastPairs[s1.id]?.has(s2.id)) {
            deskConflictMsgs.push(`${s1.name || '?'} & ${s2.name || '?'}`);
          }
        }
      }
      
      if (deskConflictMsgs.length > 0) {
        conflicts[desk.id] = `Tidigare bänkgrannar:\n${deskConflictMsgs.join('\n')}`;
      }
    });
    return conflicts;
  }, [safeDesks, pastPairs, backupPairs, localUnsaved]);

  const updateActivePlanInState = useCallback((updates) => {
    dispatch({ type: ACTIONS.UPDATE_ACTIVE_PLAN, payload: { classId: currentClassId, updates } });
  }, [dispatch, currentClassId]);

  const triggerUnsaved = (currentDesks) => {
    updateUnsavedChanges(true);
    if (!localUnsaved) { setDesksBackup(currentDesks); setLocalUnsaved(true); }
  };

  const handleDesksChange = (newDesks) => { 
    updateUnsavedChanges(true);
    setDesks(newDesks); 
    updateActivePlanInState({ desks: newDesks }); 
  };
  
  const handleSeatLockToggle = (deskId, seatIndex) => {
    updateUnsavedChanges(true);
    const seatKey = `${deskId}-${seatIndex}`;
    const newLocked = new Set(lockedSeats || []);
    newLocked.has(seatKey) ? newLocked.delete(seatKey) : newLocked.add(seatKey);
    setLockedSeats(newLocked); updateActivePlanInState({ lockedSeats: Array.from(newLocked) });
  };

  const handleDeskSelect = (desk, studentIndex) => {
    if (isDesignMode || !desk) return;

    if (!selectedDesk) {
      const student = Array.isArray(desk.students) ? desk.students[studentIndex] : null;
      if (!student) return; 
      setSelectedDesk({ deskId: desk.id, studentIndex });
    } else if (selectedDesk.deskId === desk.id && selectedDesk.studentIndex === studentIndex) {
      setSelectedDesk(null);
    } else {
      const sdObj = safeDesks.find(d => d && d.id === selectedDesk.deskId);
      if (!sdObj || !Array.isArray(sdObj.students)) return;
      
      const s1 = sdObj.students[selectedDesk.studentIndex];
      const s2 = Array.isArray(desk.students) ? desk.students[studentIndex] : null; 

      const willConflictList = [];
      if (s1 && s1.id) {
        (Array.isArray(desk.students) ? desk.students : []).forEach((s, idx) => {
          if (idx !== studentIndex && s && s.id && s.id !== s1.id && pastPairs[s1.id]?.has(s.id)) {
            willConflictList.push(`${s1.name || '?'} & ${s.name || '?'}`);
          }
        });
      }
      if (s2 && s2.id) {
        (Array.isArray(sdObj.students) ? sdObj.students : []).forEach((s, idx) => {
          if (idx !== selectedDesk.studentIndex && s && s.id && s.id !== s2.id && pastPairs[s2.id]?.has(s.id)) {
            willConflictList.push(`${s2.name || '?'} & ${s.name || '?'}`);
          }
        });
      }

      const uniqueConflicts = [...new Set(willConflictList)];

      if (uniqueConflicts.length > 0) {
        if (!window.confirm(`⚠️ Varning!\n\nBytet gör att följande elever hamnar vid samma bänk igen:\n${uniqueConflicts.map(c => '• ' + c).join('\n')}\n\nVill du ändå genomföra bytet?`)) {
          setSelectedDesk(null);
          return;
        }
      }

      triggerUnsaved(safeDesks);
      const newDesks = safeDesks.map(d => {
        if (!d) return d;
        if (d.id === selectedDesk.deskId && d.id === desk.id) {
          const arr = [...(Array.isArray(d.students) ? d.students : [])]; arr[selectedDesk.studentIndex] = s2; arr[studentIndex] = s1; return { ...d, students: arr };
        } else if (d.id === selectedDesk.deskId) {
          const arr = [...(Array.isArray(d.students) ? d.students : [])]; arr[selectedDesk.studentIndex] = s2; return { ...d, students: arr };
        } else if (d.id === desk.id) {
          const arr = [...(Array.isArray(d.students) ? d.students : [])]; arr[studentIndex] = s1; return { ...d, students: arr };
        }
        return d;
      });
      setDesks(newDesks); setSelectedDesk(null); updateActivePlanInState({ desks: newDesks });
      if (typeof showNotification === 'function') {
         showNotification(s2 ? `${s1?.name || ''} och ${s2?.name || ''} bytte plats` : `${s1?.name || ''} flyttades`, 'success');
      }
    }
  };

  const generateSeating = () => {
    if (safeDesks.length === 0) { 
      if (typeof showNotification === 'function') showNotification('Möblera klassrummet först!', 'warning'); 
      return; 
    }
    const students = Array.isArray(data?.students) ? data.students.filter(s => s && s.classId === currentClassId) : [];
    if (students.length === 0) { 
      if (typeof showNotification === 'function') showNotification('Inga elever i klassen.', 'info'); 
      return; 
    }
    
    triggerUnsaved(safeDesks);
    setIsGenerating(true);
    setTimeout(() => {
      const optimizer = new SeatingOptimizer({ 
        students, 
        constraints: Array.isArray(data?.constraints) ? data.constraints.filter(c => c && c.classId === currentClassId) : [], 
        desks: safeDesks, 
        lockedSeats: lockedSeats || new Set(), 
        plans: Array.isArray(data?.plans) ? data.plans.filter(p => p && p.classId === currentClassId) : [] 
      });
      const result = optimizer.generateSeating();
      setDesks(result.desks || []); updateActivePlanInState({ desks: result.desks || [] });
      const timeStr = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      setPlanName(`${className} v.${getWeekNumber()} (${timeStr})`);
      setIsGenerating(false); 
      if (typeof showNotification === 'function') showNotification('Förslag genererat!', 'info');
    }, 100);
  };

  const generateAutoLayout = (type) => {
    if (safeDesks.length > 0 && !window.confirm("Detta kommer radera din nuvarande möblering. Vill du fortsätta?")) return;
    updateUnsavedChanges(true); 
    const studentsInClass = Array.isArray(data?.students) ? data.students.filter(s => s && s.classId === currentClassId).length : 0;
    const count = studentsInClass > 0 ? studentsInClass : 24;

    let newDesks = []; let deskId = Date.now();
    const CANVAS_WIDTH = 800; const START_Y = 120; 

    if (type === 'rows') {
      const desksNeeded = Math.ceil(count / 2); const cols = desksNeeded >= 12 ? 3 : (desksNeeded >= 8 ? 4 : 2); 
      const gapX = 220; const gapY = 110; const totalWidth = (cols - 1) * gapX; const startX = (CANVAS_WIDTH - totalWidth) / 2;
      for (let i = 0; i < desksNeeded; i++) {
        const r = Math.floor(i / cols); const c = i % cols;
        const desksInThisRow = (r === Math.ceil(desksNeeded / cols) - 1 && desksNeeded % cols !== 0) ? (desksNeeded % cols) : cols;
        const rowStartX = startX + ((cols - desksInThisRow) * gapX) / 2;
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.PAIR, x: rowStartX + c * gapX, y: START_Y + r * gapY, capacity: 2, students: [], rotation: 0 });
      }
    } else if (type === 'islands') {
      const desksNeeded = Math.ceil(count / 4); const cols = desksNeeded >= 6 ? 3 : 2; 
      const gapX = 260; const gapY = 180; const totalWidth = (cols - 1) * gapX; const startX = (CANVAS_WIDTH - totalWidth) / 2;
      for (let i = 0; i < desksNeeded; i++) {
        const r = Math.floor(i / cols); const c = i % cols;
        const desksInThisRow = (r === Math.ceil(desksNeeded / cols) - 1 && desksNeeded % cols !== 0) ? (desksNeeded % cols) : cols;
        const rowStartX = startX + ((cols - desksInThisRow) * gapX) / 2;
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.GROUP_4, x: rowStartX + c * gapX, y: START_Y + r * gapY, capacity: 4, students: [], rotation: 0 });
      }
    } else if (type === 'horseshoe') {
      const MAX_BOTTOM = 7; const bottomCount = Math.min(count > 4 ? count - 4 : 0, MAX_BOTTOM);
      const remaining = count - bottomCount; const sideCountLeft = Math.ceil(remaining / 2); const sideCountRight = Math.floor(remaining / 2);
      const GAP = 85; const leftX = 70; const rightX = CANVAS_WIDTH - 70;
      for (let i = 0; i < sideCountLeft; i++) newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: leftX, y: START_Y + i * GAP, capacity: 1, students: [], rotation: 90 });
      for (let i = 0; i < sideCountRight; i++) newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: rightX, y: START_Y + i * GAP, capacity: 1, students: [], rotation: -90 });
      const bottomY = START_Y + Math.max(sideCountLeft - 1, sideCountRight - 1, 0) * GAP + 90;
      const totalBottomWidth = Math.max(0, bottomCount - 1) * GAP; const bottomStartX = (CANVAS_WIDTH - totalBottomWidth) / 2;
      for (let i = 0; i < bottomCount; i++) newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: bottomStartX + i * GAP, y: bottomY, capacity: 1, students: [], rotation: 0 });
    } else if (type === 'circle') {
      const GAP_BETWEEN_DESKS = 95; const circumference = count * GAP_BETWEEN_DESKS; const radius = Math.max(160, circumference / (2 * Math.PI));
      const CANVAS_CENTER_X = Math.max(450, radius + 100); const centerY = START_Y + radius + 40; 
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * 2 * Math.PI - (Math.PI / 2); const x = CANVAS_CENTER_X + radius * Math.cos(angle) - 40; const y = centerY + radius * Math.sin(angle) - 30; const rotation = (angle * 180 / Math.PI) - 90;
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: x, y: y, capacity: 1, students: [], rotation: Math.round(rotation) });
      }
    }
    setDesks(newDesks); updateActivePlanInState({ desks: newDesks }); setLockedSeats(new Set());
    const typeName = type === 'rows' ? 'Rader' : type === 'islands' ? 'Gruppöar' : type === 'horseshoe' ? 'Hästsko' : 'Ring';
    if (typeof showNotification === 'function') showNotification(`${typeName} skapad för ${count} elever!`, 'success');
  };

  const alignDesks = () => {
    if (safeDesks.length === 0) return;
    updateUnsavedChanges(true);
    const sortedDesks = [...safeDesks].sort((a, b) => { if (Math.abs((a?.y || 0) - (b?.y || 0)) > 50) return (a?.y || 0) - (b?.y || 0); return (a?.x || 0) - (b?.x || 0); });
    const CANVAS_CENTER_X = 500; const START_Y = 140; const GAP_Y = 80; 
    const getDeskDim = (type) => {
      if (type === DESIGN_BRUSH_TYPES.GROUP_6) return { w: 200, h: 140 }; if (type === DESIGN_BRUSH_TYPES.GROUP_5) return { w: 200, h: 140 }; 
      if (type === DESIGN_BRUSH_TYPES.GROUP_4) return { w: 160, h: 120 }; if (type === DESIGN_BRUSH_TYPES.TRIPLE) return { w: 240, h: 60 };
      if (type === DESIGN_BRUSH_TYPES.PAIR) return { w: 160, h: 60 }; return { w: 80, h: 60 }; 
    };
    const count = sortedDesks.length; const cols = count >= 6 ? 3 : (count >= 4 ? 2 : Math.min(3, count)); const rows = Math.ceil(count / cols); const TARGET_ROW_WIDTH = 850;
    const newDesks = sortedDesks.map((desk, index) => {
      if (!desk) return desk;
      const r = Math.floor(index / cols); const c = index % cols; const dim = getDeskDim(desk.type);
      const desksInThisRow = (r === rows - 1 && count % cols !== 0) ? (count % cols) : cols;
      let gapX = 40; if (desksInThisRow > 1) { gapX = Math.min((TARGET_ROW_WIDTH - (desksInThisRow * dim.w)) / (desksInThisRow - 1), 150); }
      const rowTotalWidth = (desksInThisRow * dim.w) + ((desksInThisRow - 1) * gapX); const rowStartX = CANVAS_CENTER_X - (rowTotalWidth / 2);
      return { ...desk, x: rowStartX + c * (dim.w + gapX), y: START_Y + r * (dim.h + GAP_Y), rotation: 0 };
    });
    setDesks(newDesks); updateActivePlanInState({ desks: newDesks });
    if (typeof showNotification === 'function') showNotification('Bänkarna har städats upp och centrerats!', 'success');
  };

  const studentCount = Array.isArray(data?.students) ? data.students.filter(s => s && s.classId === currentClassId).length : 0;
  const currentClass = Array.isArray(data?.classes) ? data.classes.find(c => c && c.id === currentClassId) : null;
  const className = currentClass ? currentClass.name : 'Klassen';

  if (!currentClassId) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 print:hidden">
        <div className="flex justify-between items-center">
          <Button variant={isDesignMode ? "primary" : "outline"} onClick={() => setIsDesignMode(!isDesignMode)}>
            <PenTool size={16} />{isDesignMode ? "Klar med möblering" : "Ändra möblering"}
          </Button>
          <div className="flex gap-4 items-center">
            {!isDesignMode && (
              <>
                <Button onClick={generateSeating} disabled={isGenerating}>{isGenerating ? '...' : 'Generera'} <RefreshCw size={18} /></Button>
                
                {/* NYTT: En kryssruta för att slå av och på svartvit utskrift */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setPrintBw(!printBw)}>
                  <input type="checkbox" id="bwPrint" checked={printBw} onChange={(e) => setPrintBw(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer pointer-events-none" />
                  <label htmlFor="bwPrint" className="text-sm font-semibold text-gray-700 cursor-pointer pointer-events-none">Svartvit utskrift</label>
                </div>
                
                <Button variant="secondary" onClick={() => window.print()} disabled={safeDesks.length === 0}><Printer size={18} /> Skriv ut</Button>
              </>
            )}
          </div>
        </div>

        {isDesignMode && (
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex flex-col gap-4">
            <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
              <span className="text-xs font-bold text-purple-900 uppercase block mb-2">Automatiska layouter (För {studentCount || 24} elever):</span>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => generateAutoLayout('rows')} className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-indigo-200"><LayoutTemplate size={16} /> Traditionella rader</button>
                <button onClick={() => generateAutoLayout('islands')} className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-pink-200"><Users size={16} /> Gruppöar (4-grupper)</button>
                <button onClick={() => generateAutoLayout('horseshoe')} className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-amber-200"><Magnet size={16} className="rotate-180" /> Hästsko</button>
                <button onClick={() => generateAutoLayout('circle')} className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-teal-200"><Circle size={16} /> Cirkel i ring</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-purple-900 uppercase">Möbeltyper:</span>
              {[
                { type: DESIGN_BRUSH_TYPES.SINGLE, label: '🪑 Singel' },
                { type: DESIGN_BRUSH_TYPES.PAIR, label: '🪑🪑 Dubbel' },
                { type: DESIGN_BRUSH_TYPES.TRIPLE, label: '🪑🪑🪑 Trippel' },
                { type: DESIGN_BRUSH_TYPES.GROUP_4, label: '▦ Gr. 4' },
                { type: DESIGN_BRUSH_TYPES.GROUP_5, label: '⬡ Gr. 5' },
                { type: DESIGN_BRUSH_TYPES.GROUP_6, label: '▦ Gr. 6' }
              ].map(t => (
                <button key={t.type} onClick={() => setDesignBrush(t.type)} className={`px-3 py-2 rounded-lg border text-sm font-semibold ${designBrush === t.type ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'}`}>{t.label}</button>
              ))}
              <div className="h-6 w-[1px] bg-purple-200 mx-1"></div>
              <button onClick={alignDesks} className="px-3 py-2 rounded-lg border text-sm font-semibold bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-gray-200 hover:border-blue-200 transition-all flex items-center gap-1"><AlignCenter size={14} className="inline" /> Centrera</button>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 border-t border-purple-200 pt-3 gap-3">
              <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                <span className="text-xs font-bold text-purple-900 uppercase">Egna mallar:</span>
                <select className="p-2 text-sm border rounded-lg bg-white" onChange={(e) => { if (e.target.value) { const t = Array.isArray(data?.roomLayouts) ? data.roomLayouts.find(l => l && l.id === e.target.value) : null; if(t) { setDesks(Array.isArray(t.desks) ? t.desks : []); setLockedSeats(new Set()); updateActivePlanInState({desks: Array.isArray(t.desks) ? t.desks : []}); if (typeof showNotification === 'function') showNotification('Mall laddad', 'success'); } } }} value=""><option value="" disabled>Ladda sparad mall...</option>{Array.isArray(data?.roomLayouts) ? data.roomLayouts.filter(l => l && l.classId === currentClassId).map(l => <option key={l.id} value={l.id}>{l.name}</option>) : null}</select>
                <input type="text" placeholder="Namn på ny mall..." className="p-2 text-sm border rounded-lg w-32" value={layoutName} onChange={e => setLayoutName(e.target.value)} />
                <Button variant="primary" className="text-sm py-1.5" disabled={!layoutName.trim() || safeDesks.length === 0} onClick={() => { dispatch({type: ACTIONS.SAVE_ROOM_LAYOUT, payload: {id: crypto.randomUUID(), classId: currentClassId, name: layoutName, desks: safeDesks.map(d => ({...d, students: []}))}}); setLayoutName(''); if (typeof showNotification === 'function') showNotification('Mall sparad', 'success'); }}>Spara</Button>
              </div>
              <button onClick={() => { if(window.confirm('Vill du rensa hela rummet?')) { setDesks([]); updateActivePlanInState({ desks: [] }); if (typeof showNotification === 'function') showNotification('Rensat', 'info'); } }} className="text-xs text-red-600 hover:bg-red-50 p-2 rounded flex items-center font-bold border border-transparent hover:border-red-200 transition-all"><RotateCcw size={14} className="mr-1"/> Rensa rum</button>
            </div>
          </div>
        )}
      </div>

      {localUnsaved && !isDesignMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in print:hidden shadow-sm">
          <div>
            <h3 className="font-bold text-orange-800 flex items-center gap-2">
              <Star size={18} className="text-orange-500 fill-orange-500" /> Förslag på placering
              {Object.keys(historyConflicts).length > 0 && <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full animate-pulse ml-2">⚠️ {Object.keys(historyConflicts).length} historik-krockar</span>}
            </h3>
            <p className="text-sm text-orange-600">Spara i historiken när du är nöjd. Varningsikonen visar elever som suttit ihop förut.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Input className="w-full md:w-48 text-sm bg-white border-orange-200" placeholder={`T.ex. ${className} v.${getWeekNumber()}`} value={planName} onChange={e => setPlanName(e.target.value)} />
            <Button variant="ghost" className="bg-orange-100/50 text-orange-800 hover:bg-orange-200" onClick={() => { if (desksBackup) { setDesks(desksBackup); updateActivePlanInState({ desks: desksBackup }); } setLocalUnsaved(false); updateUnsavedChanges(false); setPlanName(''); }}>Återställ</Button>
            <Button className="bg-orange-600 text-white hover:bg-orange-700" onClick={() => {
              const finalName = planName || `${className} v.${getWeekNumber()} (Sparad)`;
              dispatch({type: ACTIONS.SAVE_PLAN, payload: {id: crypto.randomUUID(), classId: currentClassId, name: finalName, desks: safeDesks, lockedSeats: Array.from(lockedSeats || []), createdAt: Date.now()}});
              setLocalUnsaved(false); updateUnsavedChanges(false); setDesksBackup(null); setPlanName('');
              if (typeof showNotification === 'function') showNotification('Sparad i historiken!', 'success');
            }}>Spara i historik</Button>
          </div>
        </div>
      )}

      <FreePositioningCanvas 
        isDesignMode={isDesignMode} 
        currentBrush={designBrush} 
        desks={safeDesks} 
        onDesksChange={handleDesksChange} 
        lockedSeats={lockedSeats} 
        onToggleLock={handleSeatLockToggle} 
        selectedDesk={selectedDesk} 
        onDeskSelect={handleDeskSelect} 
        historyConflicts={historyConflicts}
        printBw={printBw} // Skickar utskriftsläget ner till Canvasen
      />
    </div>
  );
};

export default LayoutTab;