import React from 'react';
import { Trash2, History, Clock, EyeOff } from 'lucide-react';
import { useApp, ACTIONS } from '../../contexts/AppContext';
import Button from '../Button';

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
          <div key={p.id} className={`bg-white p-5 rounded-2xl border-2 shadow-md hover:shadow-lg transition-all duration-200 ${p.excludeFromHistory ? 'border-orange-100 bg-orange-50/20' : 'border-gray-100 hover:border-indigo-200'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-800 text-lg">{p.name}</h4>
                  {p.excludeFromHistory && (
                    <span className="bg-orange-100 text-orange-700 p-1 rounded-md" title="Denna plan påverkar inte framtida genereringar">
                      <EyeOff size={14} />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock size={12} />
                  {new Date(p.createdAt).toLocaleDateString('sv-SE')}
                </p>
              </div>
              <button onClick={() => deletePlan(p.id)} className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50">
                <Trash2 size={18} />
              </button>
            </div>
            <Button variant="outline" className={`w-full justify-center text-sm ${p.excludeFromHistory ? 'border-orange-200 text-orange-700 hover:bg-orange-100' : ''}`} onClick={() => onLoadPlan(p)}>
              Öppna
            </Button>
          </div>
        ))}
        {getPlans().length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
            Ingen historik än.
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;