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
      <h3 className="text-lg font-bold text-text flex items-center gap-2">
        <History size={22} className="text-primary-2" />
        Sparade placeringar
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {getPlans().map((p) => (
          <div key={p.id} className={`p-5 rounded-2xl transition-all duration-200 glass ${p.excludeFromHistory ? 'border border-warning/20 bg-warning/5' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-text text-lg">{p.name}</h4>
                  {p.excludeFromHistory && (
                    <span className="bg-warning/15 text-warning p-1 rounded-md border border-warning/25" title="Denna plan påverkar inte framtida genereringar">
                      <EyeOff size={14} />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted flex items-center gap-1 mt-1">
                  <Clock size={12} />
                  {new Date(p.createdAt).toLocaleDateString('sv-SE')}
                </p>
              </div>
              <button onClick={() => deletePlan(p.id)} className="text-white/35 hover:text-rose-300 p-2 rounded-lg hover:bg-white/5">
                <Trash2 size={18} />
              </button>
            </div>
            <Button variant="outline" className={`w-full justify-center text-sm ${p.excludeFromHistory ? 'border border-warning/25 text-warning hover:bg-warning/10' : ''}`} onClick={() => onLoadPlan(p)}>
              Öppna
            </Button>
          </div>
        ))}
        {getPlans().length === 0 && (
          <div className="col-span-full text-center py-12 text-muted border border-dashed border-white/15 rounded-2xl bg-white/3">
            Ingen historik än.
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;