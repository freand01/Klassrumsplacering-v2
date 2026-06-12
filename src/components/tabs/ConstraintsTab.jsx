import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, Ban, Link, UserMinus } from 'lucide-react';
import Button from '../Button';
import { useApp, ACTIONS } from '../../contexts/AppContext';
import { CONSTRAINT_TYPES } from '../../utils/constants';

const ConstraintsTab = ({ showNotification }) => {
  const { state, dispatch } = useApp();
  const { data, currentClassId } = state;

  const [constraintStudent1, setConstraintStudent1] = useState('');
  const [constraintStudent2, setConstraintStudent2] = useState('');
  const [constraintType, setConstraintType] = useState(CONSTRAINT_TYPES.AVOID);

  const getStudents = () => data.students.filter(s => s.classId === currentClassId).sort((a, b) => a.name.localeCompare(b.name));
  const getConstraints = () => {
    const classStudentIds = new Set(getStudents().map(s => s.id));
    return data.constraints.filter(c => classStudentIds.has(c.student1) && classStudentIds.has(c.student2));
  };

  const addConstraint = () => {
    if (!constraintStudent1 || !constraintStudent2 || constraintStudent1 === constraintStudent2) {
      showNotification('Välj två olika elever', 'warning');
      return;
    }

    // NYTT: Kontrollera om någon av eleverna ska sitta själv innan vi skapar en "Sitta med"-regel
    if (constraintType === CONSTRAINT_TYPES.PAIR) {
      const s1 = getStudents().find(s => s.id === constraintStudent1);
      const s2 = getStudents().find(s => s.id === constraintStudent2);
      
      const soloStudents = [];
      if (s1?.needsSolo) soloStudents.push(s1.name);
      if (s2?.needsSolo) soloStudents.push(s2.name);

      if (soloStudents.length > 0) {
        const names = soloStudents.join(' och ');
        const confirmMsg = `⚠️ Logisk krock!\n\n${names} har inställningen "Ensam" (Ska sitta själv).\nAtt samtidigt tvinga någon att sitta bredvid skapar problem för algoritmen.\n\nVill du ändå spara regeln?`;
        
        if (!window.confirm(confirmMsg)) {
          return; // Avbryt skapandet om användaren klickar Nej
        }
      }
    }

    dispatch({
      type: ACTIONS.ADD_CONSTRAINT,
      payload: { id: crypto.randomUUID(), classId: currentClassId, student1: constraintStudent1, student2: constraintStudent2, type: constraintType }
    });
    setConstraintStudent1(''); setConstraintStudent2('');
    showNotification('Regel sparad', 'success');
  };

  if (!currentClassId) return null;

  return (
    <div className="space-y-6 print:hidden">
      <div className="glass p-6 rounded-2xl">
        <h3 className="font-semibold mb-4 flex gap-2 text-text">
          <ShieldAlert size={20} className="text-warning" /> Hantera kompisregler
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex bg-white/6 p-1 rounded-xl w-fit border border-white/10">
            <button onClick={() => setConstraintType(CONSTRAINT_TYPES.AVOID)} className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${constraintType === CONSTRAINT_TYPES.AVOID ? 'bg-white/12 text-text border border-white/10' : 'text-white/60 hover:text-text'}`}>
              <Ban size={16} /> Får ej sitta bredvid
            </button>
            <button onClick={() => setConstraintType(CONSTRAINT_TYPES.PAIR)} className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${constraintType === CONSTRAINT_TYPES.PAIR ? 'bg-white/12 text-text border border-white/10' : 'text-white/60 hover:text-text'}`}>
              <Link size={16} /> Ska sitta bredvid
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <select className="flex-1 p-2.5 rounded-xl w-full bg-panel/60 border border-border/60 text-text" value={constraintStudent1} onChange={e => setConstraintStudent1(e.target.value)}>
              <option value="">Elev 1</option>
              {getStudents().map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ArrowRight className="text-white/35 hidden md:block" />
            <select className="flex-1 p-2.5 rounded-xl w-full bg-panel/60 border border-border/60 text-text" value={constraintStudent2} onChange={e => setConstraintStudent2(e.target.value)}>
              <option value="">Elev 2</option>
              {getStudents().filter(s => s.id !== constraintStudent1).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Button onClick={addConstraint} disabled={!constraintStudent1 || !constraintStudent2}>Spara regel</Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {getConstraints().map(c => {
          const s1 = getStudents().find(s => s.id === c.student1);
          const s2 = getStudents().find(s => s.id === c.student2);
          if (!s1 || !s2) return null;
          const isPair = c.type === CONSTRAINT_TYPES.PAIR;

          return (
            <div key={c.id} className={`p-3 rounded-2xl border flex justify-between items-center ${isPair ? 'bg-success/10 border-success/25 text-text' : 'bg-warning/10 border-warning/20 text-text'}`}>
              <span className="text-sm flex items-center gap-2 text-text">
                {isPair ? <Link size={16} /> : <Ban size={16} />}
                <b>{s1.name}</b> {isPair ? 'ska sitta med' : 'får ej sitta med'} <b>{s2.name}</b>
              </span>
              <button onClick={() => dispatch({ type: ACTIONS.REMOVE_CONSTRAINT, payload: c.id })} className="text-white/40 hover:text-rose-300">
                <UserMinus size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConstraintsTab;