import React, { useState, useEffect, useCallback } from 'react';
import { PenTool, RefreshCw, Printer, Save, Eraser, RotateCcw, LayoutTemplate, Users, Magnet, AlignCenter } from 'lucide-react';
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
    } else {
      setDesks([]); setLockedDesks(new Set()); setIsDesignMode(true);
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
    
    setIsGenerating(true);
    setTimeout(() => {
      const optimizer = new SeatingOptimizer({
        students, constraints: data.constraints.filter(c => c.classId === currentClassId), desks, lockedDesks, plans: data.plans.filter(p => p.classId === currentClassId)
      });
      const result = optimizer.generateSeating();
      setDesks(result.desks); updateActivePlanInState({ desks: result.desks });
      setIsGenerating(false); showNotification('Klass placerad', 'success');
    }, 100);
  };

  const generateAutoLayout = (type) => {
    if (desks.length > 0 && !window.confirm("Detta kommer radera din nuvarande möblering. Vill du fortsätta?")) return;

    const studentsInClass = data.students.filter(s => s.classId === currentClassId).length;
    const count = studentsInClass > 0 ? studentsInClass : 24;

    let newDesks = [];
    let deskId = Date.now();

    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 1200; 
    const PADDING_BOTTOM = 100; 
    const START_Y = 120; 

    if (type === 'rows') {
      const desksNeeded = Math.ceil(count / 2); 
      const cols = desksNeeded >= 12 ? 3 : (desksNeeded >= 8 ? 4 : 2); 
      const rows = Math.ceil(desksNeeded / cols);
      
      const gapX = 220;
      const availableHeight = CANVAS_HEIGHT - START_Y - PADDING_BOTTOM;
      const gapY = Math.max(90, availableHeight / Math.max(1, rows - 1));

      const totalWidth = (cols - 1) * gapX;
      const startX = (CANVAS_WIDTH - totalWidth) / 2;

      for (let i = 0; i < desksNeeded; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const desksInThisRow = (r === rows - 1 && desksNeeded % cols !== 0) ? (desksNeeded % cols) : cols;
        const rowStartX = startX + ((cols - desksInThisRow) * gapX) / 2;

        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.PAIR, x: rowStartX + c * gapX, y: START_Y + r * gapY, capacity: 2, students: [], rotation: 0 });
      }
    } else if (type === 'islands') {
      const desksNeeded = Math.ceil(count / 4);
      const cols = desksNeeded >= 6 ? 3 : 2; 
      const rows = Math.ceil(desksNeeded / cols);
      
      const gapX = 250;
      const availableHeight = CANVAS_HEIGHT - START_Y - PADDING_BOTTOM;
      const gapY = Math.max(140, availableHeight / Math.max(1, rows - 1));

      const totalWidth = (cols - 1) * gapX;
      const startX = (CANVAS_WIDTH - totalWidth) / 2;

      for (let i = 0; i < desksNeeded; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const desksInThisRow = (r === rows - 1 && desksNeeded % cols !== 0) ? (desksNeeded % cols) : cols;
        const rowStartX = startX + ((cols - desksInThisRow) * gapX) / 2;

        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.GROUP_4, x: rowStartX + c * gapX, y: START_Y + r * gapY, capacity: 4, students: [], rotation: 0 });
      }
    } else if (type === 'horseshoe') {
      const sideCount = Math.floor(count / 3); 
      const bottomCount = count - (sideCount * 2); 
      const MIN_GAP = 70; 
      const leftX = 70;
      const rightX = CANVAS_WIDTH - 70;

      const availableHeight = CANVAS_HEIGHT - START_Y - PADDING_BOTTOM;
      let gapY = availableHeight / Math.max(1, sideCount - 1);
      gapY = Math.max(MIN_GAP, gapY); 
      
      for (let i = 0; i < sideCount; i++) {
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: leftX, y: START_Y + i * gapY, capacity: 1, students: [], rotation: 90 });
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: rightX, y: START_Y + i * gapY, capacity: 1, students: [], rotation: -90 });
      }
      
      const bottomY = START_Y + (sideCount > 0 ? sideCount - 1 : 0) * gapY + 80;
      const bottomStartX = leftX + 70;
      const bottomEndX = rightX - 70;
      let gapX = (bottomEndX - bottomStartX) / Math.max(1, bottomCount - 1);
      
      let actualBottomStartX = bottomStartX;
      if (gapX < MIN_GAP) {
        gapX = MIN_GAP;
        const totalBottomWidth = (bottomCount - 1) * gapX;
        actualBottomStartX = (CANVAS_WIDTH - totalBottomWidth) / 2;
      }
      
      for (let i = 0; i < bottomCount; i++) {
        newDesks.push({ id: deskId++, type: DESIGN_BRUSH_TYPES.SINGLE, x: actualBottomStartX + i * gapX, y: bottomY, capacity: 1, students: [], rotation: 0 });
      }
    }

    setDesks(newDesks);
    updateActivePlanInState({ desks: newDesks });
    setLockedDesks(new Set());
    showNotification(`${type === 'rows' ? 'Rader' : type === 'islands' ? 'Gruppöar' : 'Hästsko'} skapad för ${count} elever!`, 'success');
  };

  const alignDesks = () => {
    if (desks.length === 0) return;

    // Sortera först bänkarna uppifrån och ner
    const sortedDesks = [...desks].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 50) return a.y - b.y;
      return a.x - b.x;
    });

    // Mittpunkten av canvasen (i pixlar)
    const CANVAS_CENTER_X = 500; 
    const START_Y = 140;
    const GAP_Y = 80;

    const getDeskDim = (type) => {
      if (type === DESIGN_BRUSH_TYPES.GROUP_6) return { w: 200, h: 140 };
      if (type === DESIGN_BRUSH_TYPES.GROUP_5) return { w: 150, h: 150 };
      if (type === DESIGN_BRUSH_TYPES.GROUP_4) return { w: 160, h: 120 };
      if (type === DESIGN_BRUSH_TYPES.PAIR) return { w: 160, h: 60 };
      return { w: 80, h: 60 }; 
    };

    const count = sortedDesks.length;
    const cols = count >= 6 ? 3 : (count >= 4 ? 2 : Math.min(3, count)); 
    const rows = Math.ceil(count / cols);

    // Målbredd för att bänkarna ska breda ut sig snyggt
    const TARGET_ROW_WIDTH = 850;

    const newDesks = sortedDesks.map((desk, index) => {
      const r = Math.floor(index / cols);
      const c = index % cols;
      const dim = getDeskDim(desk.type);

      const desksInThisRow = (r === rows - 1 && count % cols !== 0) ? (count % cols) : cols;
      
      // Räkna ut ett dynamiskt mellanrum (gap) för att sprida ut dem
      let gapX = 40; 
      if (desksInThisRow > 1) {
          gapX = (TARGET_ROW_WIDTH - (desksInThisRow * dim.w)) / (desksInThisRow - 1);
          // Maxgräns så de inte drar iväg till varsin ände om det bara är 2 bänkar
          gapX = Math.min(gapX, 150);
      }

      // Räkna ut var raden ska börja för att bli exakt centrerad
      const rowTotalWidth = (desksInThisRow * dim.w) + ((desksInThisRow - 1) * gapX);
      const rowStartX = CANVAS_CENTER_X - (rowTotalWidth / 2);

      return {
        ...desk,
        x: rowStartX + c * (dim.w + gapX),
        y: START_Y + r * (dim.h + GAP_Y),
        rotation: 0 
      };
    });

    setDesks(newDesks);
    updateActivePlanInState({ desks: newDesks });
    showNotification('Bänkarna har städats upp och centrerats!', 'success');
  };

  const studentCount = data.students.filter(s => s.classId === currentClassId).length;

  if (!currentClassId) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 print:hidden">
        <div className="flex justify-between items-center">
          <Button variant={isDesignMode ? "primary" : "outline"} onClick={() => setIsDesignMode(!isDesignMode)}>
            <PenTool size={16} />{isDesignMode ? "Klar med möblering" : "Ändra möblering"}
          </Button>
          <div className="flex gap-2">
            {!isDesignMode && (
              <>
                <Button onClick={generateSeating} disabled={isGenerating}>{isGenerating ? '...' : 'Generera'} <RefreshCw size={18} /></Button>
                <Button variant="secondary" onClick={() => window.print()} disabled={desks.length === 0}><Printer size={18} /> Skriv ut</Button>
              </>
            )}
          </div>
        </div>

        {isDesignMode && (
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex flex-col gap-4">
            <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
              <span className="text-xs font-bold text-purple-900 uppercase block mb-2">Automatiska layouter (För {studentCount || 24} elever):</span>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => generateAutoLayout('rows')} className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-indigo-200">
                  <LayoutTemplate size={16} /> Traditionella rader
                </button>
                <button onClick={() => generateAutoLayout('islands')} className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-pink-200">
                  <Users size={16} /> Gruppöar (4-grupper)
                </button>
                <button onClick={() => generateAutoLayout('horseshoe')} className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border border-amber-200">
                  <Magnet size={16} className="rotate-180" /> Hästsko
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-purple-900 uppercase">Möbeltyper:</span>
              {[
                { type: DESIGN_BRUSH_TYPES.SINGLE, label: '🪑 Singel' },
                { type: DESIGN_BRUSH_TYPES.PAIR, label: '🪑🪑 Dubbel' },
                { type: DESIGN_BRUSH_TYPES.GROUP_4, label: '▦ Gr. 4' },
                { type: DESIGN_BRUSH_TYPES.GROUP_5, label: '⬡ Gr. 5' },
                { type: DESIGN_BRUSH_TYPES.GROUP_6, label: '▦ Gr. 6' }
              ].map(t => (
                <button key={t.type} onClick={() => setDesignBrush(t.type)} className={`px-3 py-2 rounded-lg border text-sm font-semibold ${designBrush === t.type ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'}`}>{t.label}</button>
              ))}
              <div className="h-6 w-[1px] bg-purple-200 mx-1"></div>
              
              <button onClick={alignDesks} className="px-3 py-2 rounded-lg border text-sm font-semibold bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-gray-200 hover:border-blue-200 transition-all flex items-center gap-1">
                <AlignCenter size={14} className="inline" /> Centrera
              </button>

            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 border-t border-purple-200 pt-3 gap-3">
              <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                <span className="text-xs font-bold text-purple-900 uppercase">Egna mallar:</span>
                <select className="p-2 text-sm border rounded-lg bg-white" onChange={(e) => { if (e.target.value) { const t = data.roomLayouts.find(l => l.id === e.target.value); if(t) { setDesks(t.desks); setLockedDesks(new Set()); updateActivePlanInState({desks: t.desks}); showNotification('Mall laddad', 'success'); } } }} value=""><option value="" disabled>Ladda sparad mall...</option>{data.roomLayouts.filter(l => l.classId === currentClassId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                <input type="text" placeholder="Namn på ny mall..." className="p-2 text-sm border rounded-lg w-32" value={layoutName} onChange={e => setLayoutName(e.target.value)} />
                <Button variant="primary" className="text-sm py-1.5" disabled={!layoutName.trim() || desks.length === 0} onClick={() => { dispatch({type: ACTIONS.SAVE_ROOM_LAYOUT, payload: {id: crypto.randomUUID(), classId: currentClassId, name: layoutName, desks: desks.map(d => ({...d, students: []}))}}); setLayoutName(''); showNotification('Mall sparad', 'success'); }}>Spara</Button>
              </div>
              <button onClick={() => { if(window.confirm('Vill du rensa hela rummet?')) { setDesks([]); updateActivePlanInState({ desks: [] }); showNotification('Rensat', 'info'); } }} className="text-xs text-red-600 hover:bg-red-50 p-2 rounded flex items-center font-bold border border-transparent hover:border-red-200 transition-all"><RotateCcw size={14} className="mr-1"/> Rensa rum</button>
            </div>
          </div>
        )}
      </div>

      <FreePositioningCanvas isDesignMode={isDesignMode} currentBrush={designBrush} desks={desks} onDesksChange={handleDesksChange} lockedDesks={lockedDesks} onToggleLock={handleDeskLockToggle} selectedDesk={selectedDesk} onDeskSelect={handleDeskSelect} />

      {!isDesignMode && desks.length > 0 && (
        <div className="mt-8 flex gap-4 justify-center items-end bg-white p-4 rounded-xl border print:hidden shadow-sm">
          <div className="flex-grow max-w-xs">
            <label className="text-xs text-gray-500 font-bold ml-1 uppercase">Spara placering i historik:</label>
            <Input placeholder="T.ex. Vecka 42..." value={planName} onChange={e => setPlanName(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={() => { dispatch({type: ACTIONS.SAVE_PLAN, payload: {id: crypto.randomUUID(), classId: currentClassId, name: planName || `Placering ${new Date().toLocaleDateString('sv-SE')}`, desks, lockedDesks: Array.from(lockedDesks), createdAt: Date.now()}}); setPlanName(''); showNotification('Sparad i historik', 'success'); }}><Save size={18} /> Spara i historik</Button>
        </div>
      )}
    </div>
  );
};

export default LayoutTab;