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
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-semibold mb-4 flex gap-2">
          <ShieldAlert size={20} className="text-orange-600" /> Hantera kompisregler
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
            <button onClick={() => setConstraintType(CONSTRAINT_TYPES.AVOID)} className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${constraintType === CONSTRAINT_TYPES.AVOID ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500'}`}>
              <Ban size={16} /> Får ej sitta bredvid
            </button>
            <button onClick={() => setConstraintType(CONSTRAINT_TYPES.PAIR)} className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${constraintType === CONSTRAINT_TYPES.PAIR ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}>
              <Link size={16} /> Ska sitta bredvid
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <select className="flex-1 p-2 border rounded-lg w-full" value={constraintStudent1} onChange={e => setConstraintStudent1(e.target.value)}>
              <option value="">Elev 1</option>
              {getStudents().map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ArrowRight className="text-gray-400 hidden md:block" />
            <select className="flex-1 p-2 border rounded-lg w-full" value={constraintStudent2} onChange={e => setConstraintStudent2(e.target.value)}>
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
            <div key={c.id} className={`p-3 rounded-lg border flex justify-between items-center ${isPair ? 'bg-green-50 border-green-200 text-green-900' : 'bg-orange-50 border-orange-100 text-orange-900'}`}>
              <span className="text-sm flex items-center gap-2">
                {isPair ? <Link size={16} /> : <Ban size={16} />}
                <b>{s1.name}</b> {isPair ? 'ska sitta med' : 'får ej sitta med'} <b>{s2.name}</b>
              </span>
              <button onClick={() => dispatch({ type: ACTIONS.REMOVE_CONSTRAINT, payload: c.id })} className="text-gray-400 hover:text-red-600">
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