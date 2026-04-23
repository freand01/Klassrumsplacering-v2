import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Lock, Unlock, X, RotateCcw, AlertCircle } from 'lucide-react';
import { DESIGN_BRUSH_TYPES } from '../utils/constants';

const DESK_TYPES = {
  [DESIGN_BRUSH_TYPES.SINGLE]: { width: 80, height: 60, capacity: 1, label: 'Singel', color: 'from-blue-500 to-blue-600' },
  [DESIGN_BRUSH_TYPES.PAIR]: { width: 160, height: 60, capacity: 2, label: 'Dubbel', color: 'from-purple-500 to-purple-600' },
  [DESIGN_BRUSH_TYPES.TRIPLE]: { width: 240, height: 60, capacity: 3, label: 'Trippel', color: 'from-cyan-500 to-cyan-600' },
  [DESIGN_BRUSH_TYPES.GROUP_4]: { width: 160, height: 120, capacity: 4, label: 'Grupp 4', color: 'from-pink-500 to-pink-600' },
  [DESIGN_BRUSH_TYPES.GROUP_5]: { width: 200, height: 140, capacity: 5, label: 'Grupp 5', color: 'from-orange-500 to-orange-600' },
  [DESIGN_BRUSH_TYPES.GROUP_6]: { width: 200, height: 140, capacity: 6, label: 'Grupp 6', color: 'from-amber-500 to-amber-600' }
};

const DeskItem = ({
  desk, onDragStart, onDelete, onToggleLock, onRotate, lockedSeats, isSelected, selectedStudentIndex, onClick, onStudentClick, students = [], isDesignMode, historyConflictText, printBw
}) => {
  if (!desk) return null;
  const config = DESK_TYPES[desk.type];
  if (!config) return null; 

  const rotation = desk.rotation || 0;
  const safeStudents = Array.isArray(students) ? students : [];

  const renderContent = () => {
    if (isDesignMode) return <div className={`font-semibold text-xs pointer-events-none text-white ${printBw ? 'print:!text-black' : ''}`}>{config.label || 'Bänk'}</div>;
    
    if (config.capacity === 1) {
      const student = safeStudents[0];
      const isStudentSelected = isSelected && selectedStudentIndex === 0;
      const isSeatLocked = lockedSeats?.has ? lockedSeats.has(`${desk.id}-0`) : false;
      return (
        <div
          className={`w-full h-full relative flex items-center justify-center font-bold text-sm px-2 text-center break-words transition-all text-white ${printBw ? 'print:!text-black' : ''} ${!isDesignMode ? 'cursor-pointer hover:bg-white/10' : ''} ${isStudentSelected ? 'bg-green-500/40 scale-105 ring-2 ring-green-300 rounded' : ''} ${isSeatLocked ? 'ring-2 ring-purple-300 rounded bg-purple-500/30' : ''}`}
          onClick={(e) => { if (!isDesignMode) { e.stopPropagation(); onStudentClick?.(desk, 0); } }}
        >
          {student ? (
            <>
              <span className="truncate">{student.name}</span>
              {/* Prickarna har nu print:hidden så de inte skrivs ut! */}
              {student.needsFront && <div className="w-2 h-2 rounded-full bg-yellow-400 absolute top-1 right-1 print:hidden" title="Nära tavlan" />}
              {student.needsWall && <div className="w-2 h-2 rounded-full bg-green-400 absolute top-1 left-1 print:hidden" title="Vid vägg" />}
              <button className={`absolute bottom-1 right-1 p-0.5 rounded transition-all hover:scale-110 z-10 print:hidden ${isSeatLocked ? 'text-purple-200' : 'text-white/30 hover:text-white/80'}`} onClick={(e) => { e.stopPropagation(); onToggleLock(desk.id, 0); }}>
                {isSeatLocked ? <Lock size={12} fill="currentColor" /> : <Unlock size={12} />}
              </button>
            </>
          ) : <span className={`text-xs ${printBw ? 'print:!text-gray-400' : 'text-white/40'}`}>Ledigt</span>}
        </div>
      );
    }
    
    return (
      <div className="grid gap-1 p-2 w-full h-full" style={{ gridTemplateColumns: config.capacity <= 3 ? `repeat(${config.capacity}, 1fr)` : 'repeat(2, 1fr)' }}>
        {Array.from({ length: config.capacity }).map((_, idx) => {
          const student = safeStudents[idx];
          const isStudentSelected = isSelected && selectedStudentIndex === idx;
          const isSeatLocked = lockedSeats?.has ? lockedSeats.has(`${desk.id}-${idx}`) : false;
          
          return (
            <div
              key={idx}
              className={`relative text-[10px] font-semibold text-center rounded px-1 flex items-center justify-center transition-all text-white bg-white/20 ${printBw ? 'print:!bg-transparent print:!text-black print:border print:border-gray-400' : ''} ${!isDesignMode ? 'cursor-pointer hover:bg-white/30' : ''} ${isStudentSelected ? 'bg-green-500/60 ring-2 ring-green-300 scale-110' : ''} ${isSeatLocked ? 'ring-1 ring-purple-300 bg-purple-500/40' : ''}`}
              onClick={(e) => { if (!isDesignMode) { e.stopPropagation(); onStudentClick?.(desk, idx); } }}
            >
              {student ? (
                <>
                  <span className="truncate px-1 pb-1">
                    {student.name}
                    {/* Prickarna har nu print:hidden så de inte skrivs ut! */}
                    {student.needsFront && <span className="text-yellow-400 ml-0.5 print:hidden" title="Nära tavlan">●</span>}
                    {student.needsWall && <span className="text-green-400 ml-0.5 print:hidden" title="Vid vägg">●</span>}
                  </span>
                  <button className={`absolute bottom-0.5 right-0.5 p-0.5 rounded transition-all hover:scale-110 z-10 print:hidden ${isSeatLocked ? 'text-purple-200' : 'text-white/30 hover:text-white/80'}`} onClick={(e) => { e.stopPropagation(); onToggleLock(desk.id, idx); }}>
                    {isSeatLocked ? <Lock size={10} fill="currentColor" /> : <Unlock size={10} />}
                  </button>
                </>
              ) : <span className={printBw ? 'print:!text-gray-400' : 'text-white/40'}>-</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`absolute rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center bg-gradient-to-br ${config.color} ${isDesignMode ? 'cursor-move' : 'cursor-default'} ${isSelected ? 'ring-4 ring-green-400 z-50' : 'hover:shadow-xl'} ${historyConflictText && !isDesignMode ? 'ring-4 ring-orange-500 animate-pulse-slow' : ''} ${printBw ? 'print:!bg-none print:!bg-white print:border-2 print:border-black print:shadow-none' : ''}`}
      style={{ left: (desk.x || 0) + 'px', top: (desk.y || 0) + 'px', width: config.width + 'px', height: config.height + 'px', transform: `rotate(${rotation}deg)` }}
      onMouseDown={(e) => { if (isDesignMode) onDragStart(desk, e); }}
      onClick={(e) => { if (isDesignMode) { e.stopPropagation(); onClick(desk); } }}
    >
      {renderContent()}
      
      {historyConflictText && !isDesignMode && (
        <div className="absolute -top-3 -right-3 bg-orange-500 text-white p-1 rounded-full border-2 border-white shadow-lg animate-bounce cursor-help print:hidden" title={historyConflictText}>
          <AlertCircle size={14} />
        </div>
      )}

      {isDesignMode && (
        <>
          <button className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md z-10 print:hidden" onClick={(e) => { e.stopPropagation(); onDelete(desk.id); }}><X size={14} /></button>
          <button className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-md z-10 print:hidden cursor-grab active:cursor-grabbing" onMouseDown={(e) => onRotate(desk, e)}><RotateCcw size={14} /></button>
        </>
      )}
    </div>
  );
};

const FreePositioningCanvas = ({ isDesignMode, currentBrush, desks = [], onDesksChange, lockedSeats = new Set(), onToggleLock, selectedDesk, onDeskSelect, historyConflicts = {}, printBw = false }) => {
  const canvasRef = useRef(null);
  const [draggedDesk, setDraggedDesk] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [nextDeskId, setNextDeskId] = useState(0);
  const [rotatingDesk, setRotatingDesk] = useState(null);
  const [rotationStart, setRotationStart] = useState(null);

  const safeDesks = Array.isArray(desks) ? desks : [];

  useEffect(() => {
    if (safeDesks.length > 0) setNextDeskId(Math.max(...safeDesks.map(d => d?.id || 0)) + 1);
  }, [safeDesks]);

  const handleCanvasClick = (e) => {
    if (!isDesignMode || !currentBrush || currentBrush === 'eraser') return;
    if (e.target.closest('.desk-item')) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const config = DESK_TYPES[currentBrush];
    if (!config) return; 
    const x = e.clientX - rect.left - config.width / 2;
    const y = Math.max(e.clientY - rect.top - config.height / 2, 80);
    onDesksChange([...safeDesks, { id: nextDeskId, type: currentBrush, x, y, capacity: config.capacity, students: [] }]);
    setNextDeskId(nextDeskId + 1);
  };

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;
    if (draggedDesk) {
      let newX = Math.max(0, e.clientX - dragOffset.x);
      let newY = Math.max(80, e.clientY - dragOffset.y);
      onDesksChange(safeDesks.map(d => d.id === draggedDesk.id ? { ...d, x: newX, y: newY } : d));
    }
    if (rotatingDesk && rotationStart) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const currentAngle = Math.atan2(mouseY - rotationStart.centerY, mouseX - rotationStart.centerX) * (180 / Math.PI);
      let newRotation = ((rotationStart.initialRotation + (currentAngle - rotationStart.startAngle)) % 360 + 360) % 360;
      onDesksChange(safeDesks.map(d => d.id === rotatingDesk.id ? { ...d, rotation: Math.round(newRotation) } : d));
    }
  }, [draggedDesk, dragOffset, rotatingDesk, rotationStart, safeDesks, onDesksChange]);

  const handleMouseUp = useCallback(() => { setDraggedDesk(null); setRotatingDesk(null); }, []);

  useEffect(() => {
    if (draggedDesk || rotatingDesk) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    }
  }, [draggedDesk, rotatingDesk, handleMouseMove, handleMouseUp]);

  let dynamicHeight = 700; 
  let dynamicWidth = '100%';

  if (safeDesks.length > 0) {
    const maxBottom = Math.max(...safeDesks.map(d => {
      if (!d) return 0;
      const config = DESK_TYPES[d.type] || { height: 60 };
      const maxDim = Math.max(config.width || 80, config.height || 60); 
      return (d.y || 0) + maxDim;
    }));
    dynamicHeight = Math.max(700, maxBottom + 150); 
    
    const maxRight = Math.max(...safeDesks.map(d => {
      if (!d) return 0;
      const config = DESK_TYPES[d.type] || { width: 80 };
      const maxDim = Math.max(config.width || 80, config.height || 60); 
      return (d.x || 0) + maxDim;
    }));
    
    if (maxRight > 850) {
        dynamicWidth = `${maxRight + 150}px`;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-6 justify-center bg-white p-4 rounded-xl border border-gray-100 print:hidden shadow-sm">
        <div className="text-center"><div className="text-2xl font-bold text-indigo-600">{safeDesks.length}</div><div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Bänkar</div></div>
        <div className="text-center"><div className="text-2xl font-bold text-purple-600">{safeDesks.reduce((s, d) => s + (d && DESK_TYPES[d.type]?.capacity ? DESK_TYPES[d.type].capacity : 0), 0)}</div><div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Platser</div></div>
        <div className="text-center"><div className="text-2xl font-bold text-green-600">{safeDesks.reduce((s, d) => s + (d && Array.isArray(d.students) ? d.students.filter(Boolean).length : 0), 0)}</div><div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Placerade</div></div>
      </div>
      <div ref={canvasRef} className={`relative bg-white rounded-2xl shadow-xl overflow-auto transition-all ${printBw ? 'print:border-0 print:shadow-none' : 'border-2 border-gray-200'}`} style={{ height: `${dynamicHeight}px`, width: dynamicWidth }} onClick={handleCanvasClick}>
        <div className={`absolute top-0 left-0 right-0 h-16 flex items-center justify-center font-bold text-lg tracking-widest shadow-lg z-10 min-w-full ${printBw ? 'print:!bg-none print:!bg-white print:!text-black print:border-b-2 print:border-black print:shadow-none' : 'bg-gradient-to-b from-gray-800 to-gray-700 text-white border-b-4 border-gray-900'}`}>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-3 print:hidden"></div>WHITEBOARD<div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-3 print:hidden"></div>
        </div>
        <svg className="absolute inset-0 pointer-events-none opacity-10 print:hidden min-w-full min-h-full" style={{ zIndex: 1 }}><defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="gray" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" /></svg>
        <div className="absolute inset-0 min-w-full z-5">
          {safeDesks.filter(Boolean).map(desk => (
            <DeskItem 
              key={desk.id} 
              desk={desk} 
              onDragStart={(d, e) => { setDraggedDesk(d); setDragOffset({ x: e.clientX - d.x, y: e.clientY - d.y }); }} 
              onDelete={(id) => onDesksChange(safeDesks.filter(d => d.id !== id))} 
              onRotate={(d, e) => { const conf = DESK_TYPES[d.type]; if(!conf) return; const cx = d.x + conf.width / 2; const cy = d.y + conf.height / 2; const rect = canvasRef.current.getBoundingClientRect(); setRotatingDesk(d); setRotationStart({ startAngle: Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * (180 / Math.PI), initialRotation: d.rotation || 0, centerX: cx, centerY: cy }); }} 
              onToggleLock={onToggleLock} 
              lockedSeats={lockedSeats} 
              isSelected={selectedDesk?.deskId === desk.id} 
              selectedStudentIndex={selectedDesk?.deskId === desk.id ? selectedDesk.studentIndex : -1} 
              onClick={(d) => onDeskSelect?.(d)} 
              onStudentClick={onDeskSelect} 
              students={desk.students || []} 
              isDesignMode={isDesignMode} 
              historyConflictText={historyConflicts[desk.id]}
              printBw={printBw} // Skickar ner utskriftsläget
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FreePositioningCanvas;