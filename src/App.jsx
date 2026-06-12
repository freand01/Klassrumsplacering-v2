import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, FileJson, FolderOpen, Users, Settings, MapPin, History, Sparkles, Save, Moon, Sun } from 'lucide-react';
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

// --- SÄKERHET & KRYPTERING ---
const SECRET_KEY = "KlassPlaceringHemligNyckel2026"; 

const encryptData = (text) => {
  const encoded = encodeURIComponent(text); 
  let result = '';
  for (let i = 0; i < encoded.length; i++) {
    result += String.fromCharCode(encoded.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
  }
  return btoa(result); 
};

const decryptData = (encodedText) => {
  try {
    const decoded = atob(encodedText);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
    }
    return decodeURIComponent(result);
  } catch (e) {
    return encodedText; // Fallback för gamla okrypterade filer
  }
};
// ------------------------------------

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

  const [hasUnsavedFileChanges, setHasUnsavedFileChanges] = useState(false);
  const isFirstRender = useRef(true);
  const skipNextDirtyCheck = useRef(false);

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('kp_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kp_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (skipNextDirtyCheck.current) {
      skipNextDirtyCheck.current = false;
      return;
    }
    setHasUnsavedFileChanges(true); 
  }, [data]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedFileChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedFileChanges]);

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
      
      const decryptedText = decryptData(text);
      
      let imported;
      try {
        imported = JSON.parse(decryptedText);
      } catch (error) {
        showError('Filen är korrupt eller ej giltig.');
        return;
      }

      // 12-månaders-kollen för extern fil
      if (imported._security && imported._security.createdAt) {
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        if (Date.now() - imported._security.createdAt > ONE_YEAR_MS) {
          try {
            const writable = await handle.createWritable();
            await writable.write(""); 
            await writable.close();
          } catch(e) {
            console.error("Kunde inte skriva över filen", e);
          }
          showError('Säkerhetsspärr: Filen är äldre än 12 månader och har raderats från hårddisken.');
          return;
        }
      }

      const finalData = imported.data || imported;
      
      if (finalData.classes) {
        setConfirmDialog({
          message: `Ladda in projekt från "${file.name}"? Nuvarande osparad data ersätts.`,
          onConfirm: () => {
            skipNextDirtyCheck.current = true; 
            dispatch({ type: ACTIONS.SET_DATA, payload: finalData });
            if (finalData.classes.length > 0) dispatch({ type: ACTIONS.SET_CURRENT_CLASS_ID, payload: finalData.classes[0].id });
            setFileHandle(handle); 
            setHasUnsavedChanges(false);
            setHasUnsavedFileChanges(false); 
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
      const exportObj = {
        _security: { createdAt: Date.now() },
        data: data
      };
      
      const jsonStr = JSON.stringify(exportObj);
      const encryptedData = encryptData(jsonStr);

      const writable = await handle.createWritable();
      await writable.write(encryptedData);
      await writable.close();
      setHasUnsavedFileChanges(false); 
      showSuccess('Projektet har sparats krypterat!');
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

  // UPPDATERAD: Nu med stöd för den nya historik-flaggan
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
        createdAt: Date.now(),
        excludeFromHistory: false // Standard: Spara som vanlig historik
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
    <div data-theme={theme} className="min-h-screen text-text font-sans pb-10 print:bg-white print:pb-0">
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

      <header className={`sticky top-0 z-40 print:hidden bg-bg/95 backdrop-blur-xl shadow-lg isolate ${theme === 'light' ? 'border-b border-border/80' : 'border-b border-white/10'}`}>
        <div className="gradient-header">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className={`p-2 rounded-2xl ${theme === 'light' ? 'glass-strong' : 'glass'}`}><LayoutGrid className={theme === 'light' ? 'text-text' : 'text-white'} size={24} /></div>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${theme === 'light' ? 'text-text' : 'text-white'}`}>Klassrumsplacering <Sparkles className={theme === 'light' ? 'text-warning' : 'text-yellow-300'} size={18} /></h1>
                <p className={`text-xs flex items-center gap-1 font-medium ${theme === 'light' ? 'text-muted' : 'text-white/80'}`}>
                  {fileHandle ? `Öppen fil: ${fileHandle.name}` : 'Modern placering i klassrummet'}
                  {hasUnsavedFileChanges && <span className="text-yellow-300 font-bold text-sm" title="Osparade ändringar">*</span>}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <Button
                variant="outline"
                className={`text-sm ${theme === 'light' ? 'border border-border/80 bg-white/60 text-text hover:bg-white/75' : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'}`}
                title={theme === 'dark' ? 'Växla till ljust läge' : 'Växla till mörkt läge'}
                onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Ljust' : 'Mörkt'}
              </Button>
              <Button variant="outline" className={`text-sm ${theme === 'light' ? 'border border-border/80 bg-white/60 text-text hover:bg-white/75' : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'}`} onClick={handleOpenFile}>
                <FolderOpen size={16} /> Öppna
              </Button>
              <Button variant="outline" className={`text-sm relative ${theme === 'light' ? 'border border-border/80 bg-white/60 text-text hover:bg-white/75' : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'}`} onClick={handleSave}>
                <Save size={16} /> Spara
                {hasUnsavedFileChanges && <span className={`absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 ${theme === 'light' ? 'border-white' : 'border-white/30'}`}></span>}
              </Button>
              {fileHandle && (
                <Button variant="outline" className={`text-sm ${theme === 'light' ? 'border border-border/80 bg-white/60 text-text hover:bg-white/75' : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'}`} onClick={handleSaveAs}>
                  Spara som...
                </Button>
              )}
            </div>
          </div>
        </div>

        <ClassSelector theme={theme} showNotification={showNotification} onClassSelect={handleClassChange} />

        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="glass-strong rounded-2xl p-2 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap border ${
                activeTab === tab.id
                  ? `bg-white/12 ${theme === 'light' ? 'text-text border-border/70' : 'text-white border-white/15'} shadow-glow`
                  : `${theme === 'light' ? 'text-muted border-transparent hover:bg-black/5 hover:text-text' : 'text-white/75 border-transparent hover:bg-white/8 hover:text-white'}`
              }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
          </div>
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

  // Självsanerande intern historik vid uppstart
  useEffect(() => {
    let needsUpdate = false;
    let newData = { ...data };

    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    if (data.plans && data.plans.length > 0) {
      const validPlans = data.plans.filter(plan => {
         const age = now - (plan.createdAt || now); 
         return age <= ONE_YEAR_MS;
      });
      
      if (validPlans.length !== data.plans.length) {
        newData.plans = validPlans;
        needsUpdate = true;
        console.log(`Säkerhetsstädning: Raderade ${data.plans.length - validPlans.length} gamla historik-objekt.`);
      }
    }

    if (data.classes && data.classes.length > 0 && !data.currentClassId) {
      newData.currentClassId = data.classes[0].id;
      needsUpdate = true;
    }

    if (needsUpdate) {
      setData(newData);
    }
  }, []); 

  return (
    <ErrorBoundary>
      <AppProvider initialData={data}>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}