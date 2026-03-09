import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Lock, Unlock, X, RotateCcw } from 'lucide-react';
import { DESIGN_BRUSH_TYPES } from '../utils/constants';

const DESK_TYPES = {
  [DESIGN_BRUSH_TYPES.SINGLE]: { width: 80, height: 60, capacity: 1, label: 'Singel', color: 'from-blue-500 to-blue-600' },
  [DESIGN_BRUSH_TYPES.PAIR]: { width: 160, height: 60, capacity: 2, label: 'Dubbel', color: 'from-purple-500 to-purple-600' },
  [DESIGN_BRUSH_TYPES.GROUP_4]: { width: 160, height: 120, capacity: 4, label: 'Grupp 4', color: 'from-pink-500 to-pink-600' },
  [DESIGN_BRUSH_TYPES.GROUP_5]: { width: 150, height: 150, capacity: 5, label: 'Grupp 5', color: 'from-orange-500 to-orange-600' },
  [DESIGN_BRUSH_TYPES.GROUP_6]: { width: 200, height: 140, capacity: 6, label: 'Grupp 6', color: 'from-amber-500 to-amber-600' }
};

const DeskItem = ({
  desk, onDragStart, onDelete, onToggleLock, onRotate, isLocked, isSelected, selectedStudentIndex, onClick, onStudentClick, students = [], isDesignMode
}) => {
  const config = DESK_TYPES[desk.type];
  const rotation = desk.rotation || 0;

  const renderContent = () => {
    if (isDesignMode) {
      return <div className="text-white font-semibold text-xs pointer-events-none">{config?.label || 'Bänk'}</div>;
    }
    if (students.length === 0) {
      return <div className="text-white/60 text-xs font-medium pointer-events-none">Ledigt</div>;
    }
    if (config.capacity === 1) {
      const student = students[0];
      const isStudentSelected = isSelected && selectedStudentIndex === 0;
      return (
        <div
          className={`text-white font-bold text-sm px-2 text-center break-words cursor-pointer transition-all ${isStudentSelected ? 'bg-green-500/40 scale-105 ring-2 ring-green-300 rounded' : ''}`}
          onClick={(e) => { if (!isDesignMode && student) { e.stopPropagation(); onStudentClick?.(desk, 0); } }}
        >
          {student?.name}
          {student?.needsFront && <div className="w-2 h-2 rounded-full bg-yellow-400 absolute top-2 right-2" title="Nära tavlan" />}
          {student?.needsWall && <div className="w-2 h-2 rounded-full bg-green-400 absolute top-2 left-2" title="Vid vägg" />}
        </div>
      );
    }
    return (
      <div className="grid gap-1 p-2 w-full h-full" style={{ gridTemplateColumns: config.capacity === 2 ? 'repeat(2, 1fr)' : config.capacity === 4 ? 'repeat(2, 1fr)' : config.capacity === 5 ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)' }}>
        {Array.from({ length: config.capacity }).map((_, idx) => {
          const student = students[idx];
          const isStudentSelected = isSelected && selectedStudentIndex === idx;
          return (
            <div
              key={idx}
              className={`text-white text-[10px] font-semibold text-center bg-white/20 rounded px-1 flex items-center justify-center transition-all ${student && !isDesignMode ? 'cursor-pointer hover:bg-white/30' : ''} ${isStudentSelected ? 'bg-green-500/60 ring-2 ring-green-300 scale-110' : ''}`}
              onClick={(e) => { if (!isDesignMode && student) { e.stopPropagation(); onStudentClick?.(desk, idx); } }}
            >
              {student ? (
                <span className="truncate">
                  {student.name}
                  {student.needsFront && <span className="text-yellow-400 ml-0.5">●</span>}
                  {student.needsWall && <span className="text-green-400 ml-0.5">●</span>}
                </span>
              ) : <span className="text-white/40">-</span>}
            </div>
          );
        })}
      </div>
    );
  };

  if (!config) return null;

  return (
    <div
      className={`absolute rounded-xl shadow-lg transition-shadow duration-200 flex items-center justify-center bg-gradient-to-br ${config.color} ${isDesignMode ? 'cursor-move' : 'cursor-default'} ${isSelected ? 'ring-2 ring-green-300 z-50' : 'hover:shadow-xl'} ${isLocked ? 'ring-2 ring-purple-400' : ''}`}
      style={{ left: desk.x + 'px', top: desk.y + 'px', width: config.width + 'px', height: config.height + 'px', transform: `rotate(${rotation}deg)` }}
      onMouseDown={(e) => { if (isDesignMode) onDragStart(desk, e); }}
      onClick={(e) => { if (isDesignMode) { e.stopPropagation(); onClick(desk); } }}
    >
      {renderContent()}
      {isDesignMode && (
        <>
          <button className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 z-10 print:hidden" onClick={(e) => { e.stopPropagation(); onDelete(desk.id); }}><X size={14} /></button>
          <button className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 z-10 print:hidden cursor-grab active:cursor-grabbing" onMouseDown={(e) => onRotate(desk, e)} title="Dra för att rotera"><RotateCcw size={14} /></button>
        </>
      )}
      {!isDesignMode && students.length > 0 && (
        <button className={`absolute bottom-1 right-1 p-1 rounded-lg transition-all hover:scale-110 print:hidden ${isLocked ? 'bg-purple-100 text-purple-600' : 'bg-white/30 text-white hover:bg-white/50'}`} onClick={(e) => { e.stopPropagation(); onToggleLock(desk.id); }}>
          {isLocked ? <Lock size={12} fill="currentColor" /> : <Unlock size={12} />}
        </button>
      )}
    </div>
  );
};

const FreePositioningCanvas = ({ isDesignMode, currentBrush, desks = [], onDesksChange, lockedDesks = new Set(), onToggleLock, selectedDesk, onDeskSelect }) => {
  const canvasRef = useRef(null);
  const [draggedDesk, setDraggedDesk] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [nextDeskId, setNextDeskId] = useState(0);
  const [rotatingDesk, setRotatingDesk] = useState(null);
  const [rotationStart, setRotationStart] = useState(null);

  useEffect(() => {
    if (desks.length > 0) setNextDeskId(Math.max(...desks.map(d => d.id || 0)) + 1);
  }, [desks]);

  const handleCanvasClick = (e) => {
    if (!isDesignMode || !currentBrush || currentBrush === 'eraser') return;
    if (e.target.closest('.desk-item')) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const config = DESK_TYPES[currentBrush];
    if (!config) return;
    const x = e.clientX - rect.left - config.width / 2;
    const y = Math.max(e.clientY - rect.top - config.height / 2, 80);
    onDesksChange([...desks, { id: nextDeskId, type: currentBrush, x, y, capacity: config.capacity, students: [] }]);
    setNextDeskId(nextDeskId + 1);
  };

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (draggedDesk) {
      const config = DESK_TYPES[draggedDesk.type];
      let newX = Math.max(0, Math.min(e.clientX - dragOffset.x, rect.width - config.width));
      // TILLÅT ATT DRA HUR LÅNGT NER SOM HELST - RUMMET VÄXER!
      let newY = Math.max(80, e.clientY - dragOffset.y);
      setDraggedDesk({ ...draggedDesk, x: newX, y: newY });
      onDesksChange(desks.map(d => d.id === draggedDesk.id ? { ...d, x: newX, y: newY } : d));
    }
    if (rotatingDesk && rotationStart) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const currentAngle = Math.atan2(mouseY - rotationStart.centerY, mouseX - rotationStart.centerX) * (180 / Math.PI);
      let newRotation = ((rotationStart.initialRotation + (currentAngle - rotationStart.startAngle)) % 360 + 360) % 360;
      onDesksChange(desks.map(d => d.id === rotatingDesk.id ? { ...d, rotation: Math.round(newRotation) } : d));
    }
  }, [draggedDesk, dragOffset, rotatingDesk, rotationStart, desks, onDesksChange]);

  const handleMouseUp = useCallback(() => { setDraggedDesk(null); setRotatingDesk(null); setRotationStart(null); }, []);

  useEffect(() => {
    if (draggedDesk || rotatingDesk) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    }
  }, [draggedDesk, rotatingDesk, handleMouseMove, handleMouseUp]);

  // --- DYNAMISK HÖJD BERÄKNAS HÄR ---
  let dynamicHeight = 700; // Standardhöjd om rummet är tomt
  if (desks.length > 0) {
    const maxBottom = Math.max(...desks.map(d => {
      const config = DESK_TYPES[d.type] || { height: 60 };
      const maxDim = Math.max(config.width, config.height); // Hanterar rotation
      return d.y + maxDim;
    }));
    // Sätt höjden till nedersta bänken + 150 pixlar luft!
    dynamicHeight = Math.max(700, maxBottom + 150); 
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-6 justify-center bg-white p-4 rounded-xl border border-gray-100 print:hidden">
        <div className="text-center"><div className="text-2xl font-bold text-indigo-600">{desks.length}</div><div className="text-xs text-gray-500">Bänkar</div></div>
        <div className="text-center"><div className="text-2xl font-bold text-purple-600">{desks.reduce((s, d) => s + d.capacity, 0)}</div><div className="text-xs text-gray-500">Platser</div></div>
        <div className="text-center"><div className="text-2xl font-bold text-green-600">{desks.reduce((s, d) => s + (d.students?.filter(Boolean).length || 0), 0)}</div><div className="text-xs text-gray-500">Placerade</div></div>
      </div>
      <div 
        ref={canvasRef} 
        className="relative bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden print:shadow-none print:border print:rounded-none transition-all duration-300 ease-in-out" 
        style={{ height: `${dynamicHeight}px`, width: '100%' }} 
        onClick={handleCanvasClick}
      >
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-gray-800 to-gray-700 flex items-center justify-center text-white font-bold text-lg tracking-widest shadow-lg z-10 border-b-4 border-gray-900"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-3 print:hidden"></div>WHITEBOARD<div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-3 print:hidden"></div></div>
        <svg className="absolute inset-0 pointer-events-none opacity-10 print:hidden" style={{ zIndex: 1 }}><defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="gray" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" /></svg>
        <div className="absolute inset-0" style={{ zIndex: 5 }}>
          {desks.map(desk => (
            <DeskItem key={desk.id} desk={desk} onDragStart={(d, e) => { e.stopPropagation(); setDraggedDesk(d); setDragOffset({ x: e.clientX - d.x, y: e.clientY - d.y }); }} onDelete={(id) => onDesksChange(desks.filter(d => d.id !== id))} onRotate={(d, e) => { e.stopPropagation(); const conf = DESK_TYPES[d.type]; const cx = d.x + conf.width / 2; const cy = d.y + conf.height / 2; const rect = canvasRef.current.getBoundingClientRect(); setRotatingDesk(d); setRotationStart({ startAngle: Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * (180 / Math.PI), initialRotation: d.rotation || 0, centerX: cx, centerY: cy }); }} onToggleLock={onToggleLock} isLocked={lockedDesks.has(desk.id)} isSelected={selectedDesk?.deskId === desk.id} selectedStudentIndex={selectedDesk?.deskId === desk.id ? selectedDesk.studentIndex : -1} onClick={(d) => { if (!isDesignMode) onDeskSelect?.(d); }} onStudentClick={onDeskSelect} students={desk.students || []} isDesignMode={isDesignMode} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FreePositioningCanvas;