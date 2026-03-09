import React from 'react';
import { Trash2, History, Clock } from 'lucide-react';
import Button from '../Button';
import { useApp, ACTIONS } from '../../contexts/AppContext';

const HistoryTab = ({ onLoadPlan, showNotification }) => {
  const { state, dispatch } = useApp();
  const { data, currentClassId } = state;

  const getPlans = () => data.plans.filter(p => p.classId === currentClassId).sort((a, b) => b.createdAt - a.createdAt);

  const deletePlan = (id) => {
    dispatch({ type: ACTIONS.DELETE_PLAN, payload: id });
    showNotification('Placering borttagen', 'info');
  };

  if (!currentClassId) return null;

  return (
    <div className="space-y-5 print:hidden">
      <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
        <History size={22} className="text-indigo-600" />
        Sparade placeringar
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {getPlans().map((p) => (
          <div key={p.id} className="bg-white p-5 rounded-2xl border-2 border-gray-100 shadow-md hover:shadow-lg hover:border-indigo-200 transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-gray-800 text-lg">{p.name}</h4>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock size={12} />
                  {new Date(p.createdAt).toLocaleDateString('sv-SE')}
                </p>
              </div>
              <button onClick={() => deletePlan(p.id)} className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50">
                <Trash2 size={18} />
              </button>
            </div>
            <Button variant="outline" className="w-full justify-center text-sm" onClick={() => onLoadPlan(p)}>
              Öppna
            </Button>
          </div>
        ))}
        {getPlans().length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
            Ingen historik än. Sparade placeringar hamnar här.
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;