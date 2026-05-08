import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PenTool, RefreshCw, Printer, Save, RotateCcw, LayoutTemplate, Users, Magnet, AlignCenter, Circle, Star, Square, MoreHorizontal, EyeOff } from 'lucide-react';
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

const getDeskWidth = (type) => {
  if (type === DESIGN_BRUSH_TYPES?.TRIPLE) return 240;
  if (type === DESIGN_BRUSH_TYPES?.GROUP_6 || type === DESIGN_BRUSH_TYPES?.GROUP_5) return 200;
  if (type === DESIGN_BRUSH_TYPES?.PAIR || type === DESIGN_BRUSH_TYPES?.GROUP_4) return 160;
  return 80;
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
  const [printBw, setPrintBw] = useState(true);
  
  const [ignoreHistoryOnGen, setIgnoreHistoryOnGen] = useState(false);
  const [excludeCurrentFromHistory, setExcludeCurrentFromHistory] = useState(false);

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
    setExcludeCurrentFromHistory(false);
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
    
    data.plans
      .filter(p => p && p.classId === currentClassId && !p.excludeFromHistory)
      .forEach(plan => {
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
    if (!localUnsaved || !Array.isArray(safeDesks) || ignoreHistoryOnGen) return conflicts; 

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
  }, [safeDesks, pastPairs, backupPairs, localUnsaved, ignoreHistoryOnGen]);

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

  const checkRequirementConflict = (student, targetDesk, seatIdx, allDesks) => {
    if (!student) return [];
    const conflicts = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity;
    allDesks.forEach(d => {
      const w = getDeskWidth(d.type);
      if (d.x < minX) minX = d.x;
      if (d.x + w > maxX) maxX = d.x + w;
      if (d.y < minY) minY = d.y;
    });
    const roomWidth = maxX - minX;
    const wallThreshold = Math.max(150, roomWidth * 0.15);
    const frontThreshold = 80;
    if (student.needsFront && targetDesk.y > minY + frontThreshold) conflicts.push(`${student.name} ska sitta längst fram`);
    const deskW = getDeskWidth(targetDesk.type);
    const isWall = (targetDesk.x <= minX + wallThreshold && seatIdx === 0) || ((targetDesk.x + deskW) >= maxX - wallThreshold && seatIdx === targetDesk.capacity - 1);
    if (student.needsWall && !isWall) conflicts.push(`${student.name} ska sitta vid en vägg`);
    if (student.needsSolo) {
      const otherStudentsCount = (targetDesk.students || []).filter((s, i) => i !== seatIdx && s !== null).length;
      if (otherStudentsCount > 0) conflicts.push(`${student.name} ska sitta själv (men hamnar nu bredvid någon)`);
    }
    return conflicts;
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

      const willConflictList = [];
      if (!ignoreHistoryOnGen) {
        if (s1 && s1.id) {
          (Array.isArray(desk.students) ? desk.students : []).forEach((s, idx) => {
            if (idx !== studentIndex && s && s.id && s.id !== s1.id && pastPairs[s1.id]?.has(s.id)) willConflictList.push(`Tidigare grannar: ${s1.name} & ${s.name}`);
          });
        }
        if (s2 && s2.id) {
          (Array.isArray(sdObj.students) ? sdObj.students : []).forEach((s, idx) => {
            if (idx !== selectedDesk.studentIndex && s && s.id && s.id !== s2.id && pastPairs[s2.id]?.has(s.id)) willConflictList.push(`Tidigare grannar: ${s2.name} & ${s.name}`);
          });
        }
      }

      const reqConflicts = [...checkRequirementConflict(s1, desk, studentIndex, safeDesks), ...checkRequirementConflict(s2, sdObj, selectedDesk.studentIndex, safeDesks)];
      const ruleConflicts = [];
      const activeConstraints = Array.isArray(data?.constraints) ? data.constraints.filter(c => c && c.classId === currentClassId) : [];
      const getDeskIdForStudent = (studentId) => {
        for (const d of newDesks) if (d && Array.isArray(d.students) && d.students.some(s => s && s.id === studentId)) return d.id;
        return null;
      };
      activeConstraints.forEach(c => {
        if ((s1 && (c.student1 === s1.id || c.student2 === s1.id)) || (s2 && (c.student1 === s2.id || c.student2 === s2.id))) {
          const desk1 = getDeskIdForStudent(c.student1); const desk2 = getDeskIdForStudent(c.student2);
          if (desk1 !== null && desk2 !== null) {
            const studentObj1 = Array.isArray(data?.students) ? data.students.find(s => s.id === c.student1) : null;
            const studentObj2 = Array.isArray(data?.students) ? data.students.find(s => s.id === c.student2) : null;
            if (c.type === 'pair' && desk1 !== desk2) ruleConflicts.push(`Regel bruten: ${studentObj1?.name || '?'} och ${studentObj2?.name || '?'} SKA sitta tillsammans`);
            else if (c.type === 'avoid' && desk1 === desk2) ruleConflicts.push(`Regel bruten: ${studentObj1?.name || '?'} och ${studentObj2?.name || '?'} får EJ sitta tillsammans`);
          }
        }
      });

      const allWarnings = [...new Set([...willConflictList, ...reqConflicts, ...ruleConflicts])];
      if (allWarnings.length > 0 && !window.confirm(`⚠️ Varning vid flytt!\n\n${allWarnings.map(c => '• ' + c).join('\n')}\n\nVill du ändå genomföra flytten?`)) {
        setSelectedDesk(null); return;
      }

      triggerUnsaved(safeDesks); setDesks(newDesks); setSelectedDesk(null); updateActivePlanInState({ desks: newDesks });
      if (typeof showNotification === 'function') showNotification(s2 ? `${s1?.name || ''} och ${s2?.name || ''} bytte plats` : `${s1?.name || ''} flyttades`, 'success');
    }
  };

  const generateSeating = () => {
    if (safeDesks.length === 0) { showNotification('Möblera klassrummet först!', 'warning'); return; }
    const students = Array.isArray(data?.students) ? data.students.filter(s => s && s.classId === currentClassId) : [];
    if (students.length === 0) { showNotification('Inga elever i klassen.', 'info'); return; }
    
    triggerUnsaved(safeDesks);
    setIsGenerating(true);
    setTimeout(() => {
      const optimizer = new SeatingOptimizer({ 
        students, 
        constraints: Array.isArray(data?.constraints) ? data.constraints.filter(c => c && c.classId === currentClassId) : [], 
        desks: safeDesks, 
        lockedSeats: lockedSeats || new Set(), 
        plans: ignoreHistoryOnGen ? [] : (Array.isArray(data?.plans) ? data.plans.filter(p => p && p.classId === currentClassId && !p.excludeFromHistory) : [])
      });
      const result = optimizer.generateSeating();
      setDesks(result.desks || []); updateActivePlanInState({ desks: result.desks || [] });
      const timeStr = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      setPlanName(`${className} v.${getWeekNumber()} (${timeStr})`);
      setIsGenerating(false); showNotification(ignoreHistoryOnGen ? 'Genererat (utan historik)' : 'Förslag genererat!', 'info');
    }, 100);
  };

  const generateAutoLayout = (type) => {
    if (safeDesks.length > 0 && !window.confirm("Detta kommer radera din nuvarande möblering. Vill du fortsätta?")) return;
    updateUnsavedChanges(true); 
    const count = Array.isArray(data?.students) ? data.students.filter(s => s && s.classId === currentClassId).length : 24;
    let newDesks = []; let deskId = Date.now();
    const CENTER_X = 500; const START_Y = 120; 

    if (type === 'rows') {
      const desksNeeded = Math.ceil(count / 2); const cols = desksNeeded >= 12 ? 3 : (desksNeeded >= 8 ? 4 : 2); 
      const gapX = 220; const DESK_W = 160;
      for (let i = 0; i < desksNeeded; i++) {
        const r = Math.floor(i / cols); const c = i % cols; const dInRow = (r === Math.ceil(desksNeeded / cols) - 1 && desksNeeded % cols !== 0) ? (desksNeeded % cols) : cols;
        const rowWidth = DESK_W + (dInRow - 1) * gapX; const rowStartX = CENTER_X - (rowWidth / 2);
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.PAIR, x: rowStartX + c * gapX, y: START_Y + r * 110, capacity: 2, students: [], rotation: 0 });
      }
    } else if (type === 'islands') {
      const desksNeeded = Math.ceil(count / 4); const cols = desksNeeded >= 6 ? 3 : 2; 
      const gapX = 260; const DESK_W = 160;
      for (let i = 0; i < desksNeeded; i++) {
        const r = Math.floor(i / cols); const c = i % cols; const dInRow = (r === Math.ceil(desksNeeded / cols) - 1 && desksNeeded % cols !== 0) ? (desksNeeded % cols) : cols;
        const rowWidth = DESK_W + (dInRow - 1) * gapX; const rowStartX = CENTER_X - (rowWidth / 2);
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.GROUP_4, x: rowStartX + c * gapX, y: START_Y + r * 180, capacity: 4, students: [], rotation: 0 });
      }
    } else if (type === 'horseshoe') {
      const MAX_BOTTOM = 7; const bottomCount = Math.min(count > 4 ? count - 4 : 0, MAX_BOTTOM);
      const remaining = count - bottomCount; const sideLeft = Math.ceil(remaining / 2); const sideRight = Math.floor(remaining / 2);
      const hWidth = 700; const leftX = CENTER_X - (hWidth / 2); const rightX = CENTER_X + (hWidth / 2) - 80; 
      for (let i = 0; i < sideLeft; i++) newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: leftX, y: START_Y + i * 85, capacity: 1, students: [], rotation: 90 });
      for (let i = 0; i < sideRight; i++) newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: rightX, y: START_Y + i * 85, capacity: 1, students: [], rotation: -90 });
      const bottomY = START_Y + Math.max(sideLeft - 1, sideRight - 1, 0) * 85 + 90;
      const bRowWidth = 80 + Math.max(0, bottomCount - 1) * 85; const bStartX = CENTER_X - (bRowWidth / 2);
      for (let i = 0; i < bottomCount; i++) newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: bStartX + i * 85, y: bottomY, capacity: 1, students: [], rotation: 0 });
    } else if (type === 'circle') {
      const rad = Math.max(160, (count * 95) / (2 * Math.PI)); const cX = Math.max(CENTER_X, rad + 60); const cY = START_Y + rad + 40; 
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * 2 * Math.PI - (Math.PI / 2); 
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: cX + rad * Math.cos(ang) - 40, y: cY + rad * Math.sin(ang) - 30, capacity: 1, students: [], rotation: Math.round((ang * 180 / Math.PI) - 90) });
      }
    } else if (type === 'singles') {
      const cols = count >= 30 ? 6 : (count >= 20 ? 5 : 4); const DESK_W = 80;
      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols); const c = i % cols; const dInRow = (r === Math.ceil(count / cols) - 1 && count % cols !== 0) ? (count % cols) : cols;
        const rowWidth = DESK_W + (dInRow - 1) * 110; const rowStartX = CENTER_X - (rowWidth / 2);
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: rowStartX + c * 110, y: START_Y + r * 100, capacity: 1, students: [], rotation: 0 });
      }
    } else if (type === 'triples') {
      const needed = Math.ceil(count / 3); const cols = needed >= 12 ? 3 : 2; const DESK_W = 240;
      for (let i = 0; i < needed; i++) {
        const r = Math.floor(i / cols); const c = i % cols; const dInRow = (r === Math.ceil(needed / cols) - 1 && needed % cols !== 0) ? (needed % cols) : cols;
        const rowWidth = DESK_W + (dInRow - 1) * 280; const rowStartX = CENTER_X - (rowWidth / 2);
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.TRIPLE, x: rowStartX + c * 280, y: START_Y + r * 110, capacity: 3, students: [], rotation: 0 });
      }
    }
    setDesks(newDesks); updateActivePlanInState({ desks: newDesks }); setLockedSeats(new Set());
    if (typeof showNotification === 'function') showNotification('Layout skapad!', 'success');
  };

  const alignDesks = () => {
    if (safeDesks.length === 0) return;
    updateUnsavedChanges(true);
    const sorted = [...safeDesks].sort((a, b) => { if (Math.abs((a?.y || 0) - (b?.y || 0)) > 50) return (a?.y || 0) - (b?.y || 0); return (a?.x || 0) - (b?.x || 0); });
    const getDim = (t) => {
      if (t === DESIGN_BRUSH_TYPES.GROUP_6 || t === DESIGN_BRUSH_TYPES.GROUP_5) return { w: 200, h: 140 };
      if (t === DESIGN_BRUSH_TYPES.GROUP_4) return { w: 160, h: 120 }; if (t === DESIGN_BRUSH_TYPES.TRIPLE) return { w: 240, h: 60 };
      if (t === DESIGN_BRUSH_TYPES.PAIR) return { w: 160, h: 60 }; return { w: 80, h: 60 }; 
    };
    const cols = sorted.length >= 6 ? 3 : (sorted.length >= 4 ? 2 : Math.min(3, sorted.length)); 
    const newDesks = sorted.map((desk, i) => {
      if (!desk) return desk; const r = Math.floor(i / cols); const c = i % cols; const dim = getDim(desk.type);
      const dInRow = (r === Math.ceil(sorted.length / cols) - 1 && sorted.length % cols !== 0) ? (sorted.length % cols) : cols;
      let gapX = 40; if (dInRow > 1) gapX = Math.min((850 - (dInRow * dim.w)) / (dInRow - 1), 150);
      const rWidth = (dInRow * dim.w) + ((dInRow - 1) * gapX);
      return { ...desk, x: 500 - (rWidth / 2) + c * (dim.w + gapX), y: 140 + r * (dim.h + 80), rotation: 0 };
    });
    setDesks(newDesks); updateActivePlanInState({ desks: newDesks });
    showNotification('Centrerat!', 'success');
  };

  const className = data.classes?.find(c => c.id === currentClassId)?.name || 'Klassen';

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
              <div className="flex items-center gap-4">
                
                {/* NYTT: Tydlig on/off-switch för historik */}
                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border shadow-sm transition-colors border-gray-200">
                  <span className={`text-sm font-bold ${!ignoreHistoryOnGen ? 'text-indigo-600' : 'text-gray-500'}`}>
                    Historik: {!ignoreHistoryOnGen ? 'PÅ' : 'AV'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={!ignoreHistoryOnGen} 
                      onChange={(e) => setIgnoreHistoryOnGen(!e.target.checked)} 
                    />
                    <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>

                <Button onClick={generateSeating} disabled={isGenerating}>{isGenerating ? '...' : 'Generera'} <RefreshCw size={18} /></Button>
                
                <div className="h-8 w-px bg-gray-200"></div>
                
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setPrintBw(!printBw)}>
                  <input type="checkbox" id="bwPrint" checked={printBw} onChange={(e) => setPrintBw(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 pointer-events-none" />
                  <label htmlFor="bwPrint" className="text-sm font-semibold text-gray-700 pointer-events-none">Svartvit utskrift</label>
                </div>
                <Button variant="secondary" onClick={() => window.print()} disabled={safeDesks.length === 0}><Printer size={18} /> Skriv ut</Button>
              </div>
            )}
          </div>
        </div>

        {isDesignMode && (
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex flex-col gap-4">
            <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
              <span className="text-xs font-bold text-purple-900 uppercase block mb-2">Automatiska layouter:</span>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => generateAutoLayout('singles')} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-slate-200"><Square size={16} /> Singelrader</button>
                <button onClick={() => generateAutoLayout('rows')} className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-indigo-200"><LayoutTemplate size={16} /> Traditionella rader</button>
                <button onClick={() => generateAutoLayout('triples')} className="px-3 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-cyan-200"><MoreHorizontal size={16} /> Trippelrader</button>
                <button onClick={() => generateAutoLayout('islands')} className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-pink-200"><Users size={16} /> Gruppöar</button>
                <button onClick={() => generateAutoLayout('horseshoe')} className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-amber-200"><Magnet size={16} className="rotate-180" /> Hästsko</button>
                <button onClick={() => generateAutoLayout('circle')} className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-teal-200"><Circle size={16} /> Ring</button>
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
              <button onClick={alignDesks} className="px-3 py-2 rounded-lg border text-sm font-semibold bg-white text-gray-700 hover:bg-blue-50 border-gray-200 flex items-center gap-1"><AlignCenter size={14} /> Centrera</button>
            </div>
          </div>
        )}
      </div>

      {localUnsaved && !isDesignMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in print:hidden shadow-sm">
          <div className="flex-grow">
            <h3 className="font-bold text-orange-800 flex items-center gap-2">
              <Star size={18} className="text-orange-500 fill-orange-500" /> Förslag på placering
              {Object.keys(historyConflicts).length > 0 && <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full animate-pulse ml-2">⚠️ {Object.keys(historyConflicts).length} krockar</span>}
            </h3>
            <p className="text-sm text-orange-600">Spara i historiken när du är nöjd.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <label className="flex items-center gap-2 cursor-pointer bg-white/50 px-3 py-2 rounded-lg border border-orange-200 hover:bg-white transition-all group">
              <EyeOff size={16} className={excludeCurrentFromHistory ? 'text-orange-600' : 'text-gray-400'} />
              <span className={`text-xs font-semibold ${excludeCurrentFromHistory ? 'text-orange-800' : 'text-gray-500'}`}>Undanta från framtida historik</span>
              <input type="checkbox" className="w-4 h-4 text-orange-600 rounded border-orange-300" checked={excludeCurrentFromHistory} onChange={e => setExcludeCurrentFromHistory(e.target.checked)} />
            </label>

            <Input className="w-full md:w-48 text-sm bg-white border-orange-200" placeholder={`T.ex. Slöjd v.${getWeekNumber()}`} value={planName} onChange={e => setPlanName(e.target.value)} />
            
            <Button variant="ghost" className="bg-orange-100/50 text-orange-800" onClick={() => { if (desksBackup) { setDesks(desksBackup); updateActivePlanInState({ desks: desksBackup }); } setLocalUnsaved(false); updateUnsavedChanges(false); setPlanName(''); }}>Återställ</Button>
            
            <Button className="bg-orange-600 text-white" onClick={() => {
              const finalName = planName || `${className} v.${getWeekNumber()} (Sparad)`;
              dispatch({type: ACTIONS.SAVE_PLAN, payload: {
                id: crypto.randomUUID(), 
                classId: currentClassId, 
                name: finalName, 
                desks: safeDesks, 
                lockedSeats: Array.from(lockedSeats || []), 
                createdAt: Date.now(),
                excludeFromHistory: excludeCurrentFromHistory 
              }});
              setLocalUnsaved(false); updateUnsavedChanges(false); setDesksBackup(null); setPlanName('');
              showNotification('Sparad i historik!', 'success');
            }}>Spara</Button>
          </div>
        </div>
      )}

      <FreePositioningCanvas 
        isDesignMode={isDesignMode} currentBrush={designBrush} desks={safeDesks} onDesksChange={handleDesksChange} lockedSeats={lockedSeats} onToggleLock={handleSeatLockToggle} selectedDesk={selectedDesk} onDeskSelect={handleDeskSelect} historyConflicts={historyConflicts} printBw={printBw} 
      />
    </div>
  );
};

export default LayoutTab;