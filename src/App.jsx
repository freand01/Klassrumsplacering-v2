import React, { useState, useEffect } from 'react';
import { LayoutGrid, FileJson, FolderOpen, Users, Settings, MapPin, History, Sparkles } from 'lucide-react';
import { AppProvider, useApp, ACTIONS } from './contexts/AppContext';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useNotification } from './hooks/useNotification';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import Button from './components/Button';
import ClassSelector from './components/ClassSelector';
import EditStudentModal from './components/modals/EditStudentModal';
import PasteImportModal from './components/modals/PasteImportModal';
import StudentsTab from './components/tabs/StudentsTab';
import ConstraintsTab from './components/tabs/ConstraintsTab';
import LayoutTab from './components/tabs/LayoutTab';
import HistoryTab from './components/tabs/HistoryTab';
import { TAB_IDS } from './utils/constants';
import './styles/modern.css';

const AppContent = () => {
  const { state, dispatch } = useApp();
  const { currentClassId, data } = state;
  const { notification, hideNotification, showNotification, showError, showSuccess, showWarning } = useNotification();

  const [activeTab, setActiveTab] = useState(TAB_IDS.STUDENTS);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const updateStudent = (id, updates) => {
    dispatch({ type: ACTIONS.UPDATE_STUDENT, payload: { id, updates } });
    showSuccess('Elev uppdaterad');
  };

  const handlePasteImport = (namesList) => {
    const newStudents = namesList.map(name => ({
      id: crypto.randomUUID(), classId: currentClassId, name, needsFront: false, needsWall: false, needsSolo: false, createdAt: Date.now()
    }));
    dispatch({ type: ACTIONS.ADD_STUDENTS_BULK, payload: newStudents });
    showSuccess(`${newStudents.length} elever tillagda`);
  };

  const handleDeleteClass = (id) => {
    setConfirmDialog({
      message: "Är du säker? Detta raderar klassen permanent.",
      onConfirm: () => {
        dispatch({ type: ACTIONS.DELETE_CLASS, payload: id });
        if (currentClassId === id) dispatch({ type: ACTIONS.SET_CURRENT_CLASS_ID, payload: '' });
        showWarning('Klass borttagen'); setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleLoadPlan = (plan) => {
    dispatch({ type: ACTIONS.UPDATE_ACTIVE_PLAN, payload: { classId: plan.classId, updates: { desks: plan.desks || [], lockedDesks: plan.lockedDesks || [] } } });
    setActiveTab(TAB_IDS.LAYOUT); showSuccess('Placering laddad');
  };

  const handleExportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `klassplacering_v2_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    showSuccess('Projekt exporterat');
  };

  const handleImportData = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (imported.classes) {
          setConfirmDialog({
            message: "Ladda in projekt? Nuvarande data ersätts.",
            onConfirm: () => {
              dispatch({ type: ACTIONS.SET_DATA, payload: imported });
              if (imported.classes.length > 0) dispatch({ type: ACTIONS.SET_CURRENT_CLASS_ID, payload: imported.classes[0].id });
              showSuccess('Projekt importerat'); setConfirmDialog(null);
            },
            onCancel: () => setConfirmDialog(null)
          });
        }
      } catch { showError('Fel vid inläsning av fil'); }
    };
    reader.readAsText(file); e.target.value = ''; 
  };

  const tabs = [
    { id: TAB_IDS.STUDENTS, label: 'Elever', icon: Users },
    { id: TAB_IDS.CONSTRAINTS, label: 'Regler', icon: Settings },
    { id: TAB_IDS.LAYOUT, label: 'Placering', icon: MapPin },
    { id: TAB_IDS.HISTORY, label: 'Historik', icon: History }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 text-gray-800 font-sans pb-10 print:bg-white print:pb-0">
      {editingStudent && <EditStudentModal student={editingStudent} onClose={() => setEditingStudent(null)} onSave={updateStudent} />}
      {showPasteModal && <PasteImportModal onClose={() => setShowPasteModal(false)} onImport={handlePasteImport} />}
      {confirmDialog && <ConfirmDialog message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel} />}
      {notification && <Toast message={notification.message} type={notification.type} onClose={hideNotification} />}

      <header className="sticky top-0 z-40 print:hidden backdrop-blur-lg bg-white border-b shadow-sm">
        <div className="gradient-header">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><LayoutGrid className="text-white" size={24} /></div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">KlassPlacering <Sparkles className="text-yellow-300" size={18} /></h1>
                <p className="text-xs text-white/80">Modern fri placering</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="text-sm px-4 bg-white/20 text-white hover:bg-white/30 border-white/30" onClick={handleExportData}><FileJson size={16} /> Spara</Button>
              <label className="cursor-pointer">
                <input type="file" onChange={handleImportData} accept=".json" className="hidden" />
                <div className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg font-medium flex items-center gap-2 text-white hover:bg-white/30 text-sm"><FolderOpen size={16} /> Öppna</div>
              </label>
            </div>
          </div>
        </div>

        <ClassSelector showNotification={showNotification} />

        <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto py-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-indigo-50 border'}`}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 print:p-0 print:w-full print:max-w-none">
        {activeTab === TAB_IDS.STUDENTS && <StudentsTab onEditStudent={setEditingStudent} onShowPasteModal={() => setShowPasteModal(true)} onDeleteClass={handleDeleteClass} showNotification={showNotification} />}
        {activeTab === TAB_IDS.CONSTRAINTS && <ConstraintsTab showNotification={showNotification} />}
        {activeTab === TAB_IDS.LAYOUT && <LayoutTab showNotification={showNotification} />}
        {activeTab === TAB_IDS.HISTORY && <HistoryTab onLoadPlan={handleLoadPlan} showNotification={showNotification} />}
      </main>
    </div>
  );
};

export default function App() {
  const [data, setData] = useLocalStorage({ classes: [], students: [], constraints: [], plans: [], roomLayouts: [], activePlans: {} });

  useEffect(() => {
    if (data.classes.length > 0 && !data.currentClassId) setData(prev => ({ ...prev, currentClassId: prev.classes[0].id }));
  }, [data.classes.length, data.currentClassId, setData]);

  return (
    <ErrorBoundary>
      <AppProvider initialData={data}>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}