import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, FileJson, FolderOpen, Users, Settings, MapPin, History, Sparkles, Save } from 'lucide-react';
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

const getWeekNumber = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

const AppContent = () => {
  const { state, dispatch } = useApp();
  const { currentClassId, data } = state;
  const { notification, hideNotification, showNotification, showError, showSuccess, showWarning } = useNotification();

  const [activeTab, setActiveTab] = useState(TAB_IDS.STUDENTS);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [fileHandle, setFileHandle] = useState(null);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // --- NYTT: Logik för att varna vid stängning av programmet ---
  const [hasUnsavedFileChanges, setHasUnsavedFileChanges] = useState(false);
  const isFirstRender = useRef(true);
  const skipNextDirtyCheck = useRef(false);

  // 1. Känn av varje gång databasen ändras (något har lagts till/tagits bort)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (skipNextDirtyCheck.current) {
      skipNextDirtyCheck.current = false;
      return;
    }
    setHasUnsavedFileChanges(true); // Nu är programmet "smutsigt" (osparat)
  }, [data]);

  // 2. Lyssna efter att användaren klickar på krysset för att stänga appen
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedFileChanges) {
        e.preventDefault();
        e.returnValue = ''; // Triggar systemets standardvarning för osparade ändringar
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedFileChanges]);
  // -------------------------------------------------------------

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
        if (currentClassId === id) {
          dispatch({ type: ACTIONS.SET_CURRENT_CLASS_ID, payload: '' });
          setHasUnsavedChanges(false);
        }
        showWarning('Klass borttagen'); setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleLoadPlan = (plan) => {
    dispatch({ type: ACTIONS.UPDATE_ACTIVE_PLAN, payload: { classId: plan.classId, updates: { desks: plan.desks || [], lockedSeats: plan.lockedSeats || [] } } });
    setHasUnsavedChanges(false);
    setActiveTab(TAB_IDS.LAYOUT); 
    showSuccess('Placering laddad');
  };

  const handleOpenFile = async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON Filer', accept: { 'application/json': ['.json'] } }]
      });
      const file = await handle.getFile();
      const text = await file.text();
      const imported = JSON.parse(text);
      
      if (imported.classes) {
        setConfirmDialog({
          message: `Ladda in projekt från "${file.name}"? Nuvarande osparad data ersätts.`,
          onConfirm: () => {
            skipNextDirtyCheck.current = true; // Säg till appen att laddningen inte är en "ny ändring"
            dispatch({ type: ACTIONS.SET_DATA, payload: imported });
            if (imported.classes.length > 0) dispatch({ type: ACTIONS.SET_CURRENT_CLASS_ID, payload: imported.classes[0].id });
            setFileHandle(handle); 
            setHasUnsavedChanges(false);
            setHasUnsavedFileChanges(false); // Nollställ fil-varningen
            showSuccess(`Projektet "${file.name}" laddades in`); 
            setConfirmDialog(null);
          },
          onCancel: () => setConfirmDialog(null)
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError') showError('Kunde inte öppna filen');
    }
  };

  const saveToFileHandle = async (handle) => {
    try {
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      setHasUnsavedFileChanges(false); // Nollställ varningen när vi sparat
      showSuccess('Projektet har sparats!');
    } catch (error) {
      showError('Kunde inte skriva till filen. Saknar rättigheter?');
    }
  };

  const handleSave = async () => {
    if (fileHandle) {
      await saveToFileHandle(fileHandle);
    } else {
      await handleSaveAs();
    }
  };

  const handleSaveAs = async () => {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `klassplacering_v2_${new Date().toISOString().slice(0, 10)}.json`,
        types: [{ description: 'JSON Filer', accept: { 'application/json': ['.json'] } }]
      });
      await saveToFileHandle(handle);
      setFileHandle(handle); 
    } catch (error) {
      if (error.name !== 'AbortError') showError('Sparandet avbröts');
    }
  };

  const handleTabClick = (tabId) => {
    if (activeTab === TAB_IDS.LAYOUT && hasUnsavedChanges && tabId !== activeTab) {
      setPendingAction({ type: 'TAB', payload: tabId });
    } else {
      setActiveTab(tabId);
    }
  };

  const handleClassChange = (classId) => {
    if (activeTab === TAB_IDS.LAYOUT && hasUnsavedChanges && classId !== currentClassId) {
      setPendingAction({ type: 'CLASS', payload: classId });
    } else {
      dispatch({ type: ACTIONS.SET_CURRENT_CLASS_ID, payload: classId });
    }
  };

  const executePendingAction = () => {
    if (pendingAction.type === 'TAB') setActiveTab(pendingAction.payload);
    if (pendingAction.type === 'CLASS') dispatch({ type: ACTIONS.SET_CURRENT_CLASS_ID, payload: pendingAction.payload });
    setPendingAction(null);
  };

  const saveCurrentLayoutToHistory = () => {
    const activePlan = data.activePlans?.[currentClassId];
    if (!activePlan || !activePlan.desks) return;

    const currentClass = data.classes?.find(c => c.id === currentClassId);
    const className = currentClass ? currentClass.name : 'Okänd klass';
    const timeStr = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    const autoPlanName = `${className} v.${getWeekNumber()} (Justerad ${timeStr})`;

    dispatch({
      type: ACTIONS.SAVE_PLAN,
      payload: {
        id: crypto.randomUUID(),
        classId: currentClassId,
        name: autoPlanName,
        desks: activePlan.desks,
        lockedSeats: activePlan.lockedSeats || [],
        createdAt: Date.now()
      }
    });
    showNotification(`Sparades i historiken som "${autoPlanName}"`, 'success');
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

      {pendingAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-orange-600">
              Osparade ändringar
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Du har gjort manuella ändringar i placeringen som inte är sparade i historiken. Vill du spara dessa innan du byter vy?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setPendingAction(null)}>Avbryt</Button>
              <Button variant="secondary" onClick={() => {
                setHasUnsavedChanges(false);
                executePendingAction();
              }}>Nej, kasta ändringar</Button>
              <Button onClick={() => {
                saveCurrentLayoutToHistory();
                setHasUnsavedChanges(false);
                executePendingAction();
              }}>Ja, spara</Button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 print:hidden backdrop-blur-lg bg-white border-b shadow-sm">
        <div className="gradient-header">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><LayoutGrid className="text-white" size={24} /></div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">Klassrumsplacering <Sparkles className="text-yellow-300" size={18} /></h1>
                
                {/* NYTT: En liten gul stjärna (*) syns om man har osparade ändringar */}
                <p className="text-xs text-white/80 flex items-center gap-1 font-medium">
                  {fileHandle ? `Öppen fil: ${fileHandle.name}` : 'Modern placering i klassrummet'}
                  {hasUnsavedFileChanges && <span className="text-yellow-300 font-bold text-sm" title="Osparade ändringar">*</span>}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <Button variant="outline" className="text-sm border-2 border-white/30 bg-white/20 text-white hover:bg-white/30 hover:border-white/50" onClick={handleOpenFile}>
                <FolderOpen size={16} /> Öppna
              </Button>
              <Button variant="outline" className="text-sm border-2 border-white/30 bg-white/20 text-white hover:bg-white/30 hover:border-white/50 relative" onClick={handleSave}>
                <Save size={16} /> Spara
                {/* Liten röd prick på spara-knappen för extra tydlighet */}
                {hasUnsavedFileChanges && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-indigo-600"></span>}
              </Button>
              {fileHandle && (
                <Button variant="outline" className="text-sm border-2 border-white/30 bg-white/20 text-white hover:bg-white/30 hover:border-white/50" onClick={handleSaveAs}>
                  Spara som...
                </Button>
              )}
            </div>
          </div>
        </div>

        <ClassSelector showNotification={showNotification} onClassSelect={handleClassChange} />

        <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto py-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-indigo-50 border'}`}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 print:p-0 print:w-full print:max-w-none">
        {activeTab === TAB_IDS.STUDENTS && <StudentsTab onEditStudent={setEditingStudent} onShowPasteModal={() => setShowPasteModal(true)} onDeleteClass={handleDeleteClass} showNotification={showNotification} />}
        {activeTab === TAB_IDS.CONSTRAINTS && <ConstraintsTab showNotification={showNotification} />}
        {activeTab === TAB_IDS.LAYOUT && <LayoutTab showNotification={showNotification} setHasUnsavedChanges={setHasUnsavedChanges} />}
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