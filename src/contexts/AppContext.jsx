import React, { createContext, useContext, useReducer } from 'react';
import { updateActivePlan } from '../utils/storage';

const AppContext = createContext();

export const ACTIONS = {
  SET_DATA: 'SET_DATA',
  SET_CURRENT_CLASS_ID: 'SET_CURRENT_CLASS_ID',
  ADD_CLASS: 'ADD_CLASS',
  DELETE_CLASS: 'DELETE_CLASS',
  ADD_STUDENT: 'ADD_STUDENT',
  UPDATE_STUDENT: 'UPDATE_STUDENT',
  REMOVE_STUDENT: 'REMOVE_STUDENT',
  ADD_STUDENTS_BULK: 'ADD_STUDENTS_BULK',
  ADD_CONSTRAINT: 'ADD_CONSTRAINT',
  REMOVE_CONSTRAINT: 'REMOVE_CONSTRAINT',
  SAVE_ROOM_LAYOUT: 'SAVE_ROOM_LAYOUT',
  DELETE_ROOM_LAYOUT: 'DELETE_ROOM_LAYOUT',
  SAVE_PLAN: 'SAVE_PLAN',
  DELETE_PLAN: 'DELETE_PLAN',
  UPDATE_ACTIVE_PLAN: 'UPDATE_ACTIVE_PLAN'
};

const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_DATA:
      return { ...state, data: action.payload };

    case ACTIONS.SET_CURRENT_CLASS_ID:
      return { ...state, currentClassId: action.payload };

    case ACTIONS.ADD_CLASS: {
      const newClass = action.payload;
      return {
        ...state,
        data: {
          ...state.data,
          classes: [...state.data.classes, newClass].sort((a, b) => a.name.localeCompare(b.name))
        }
      };
    }

    case ACTIONS.DELETE_CLASS: {
      const classId = action.payload;
      const { [classId]: _deleted, ...remainingActivePlans } = state.data.activePlans || {};
      return {
        ...state,
        data: {
          classes: state.data.classes.filter(c => c.id !== classId),
          students: state.data.students.filter(s => s.classId !== classId),
          constraints: state.data.constraints.filter(c => c.classId !== classId),
          plans: state.data.plans.filter(p => p.classId !== classId),
          roomLayouts: state.data.roomLayouts.filter(l => l.classId !== classId),
          activePlans: remainingActivePlans
        }
      };
    }

    case ACTIONS.ADD_STUDENT:
      return { ...state, data: { ...state.data, students: [...state.data.students, action.payload] } };

    case ACTIONS.UPDATE_STUDENT:
      return {
        ...state,
        data: {
          ...state.data,
          students: state.data.students.map(s =>
            s.id === action.payload.id ? { ...s, ...action.payload.updates } : s
          )
        }
      };

    case ACTIONS.REMOVE_STUDENT:
      return {
        ...state,
        data: {
          ...state.data,
          students: state.data.students.filter(s => s.id !== action.payload),
          constraints: state.data.constraints.filter(
            c => c.student1 !== action.payload && c.student2 !== action.payload
          )
        }
      };

    case ACTIONS.ADD_STUDENTS_BULK:
      return { ...state, data: { ...state.data, students: [...state.data.students, ...action.payload] } };

    case ACTIONS.ADD_CONSTRAINT:
      return { ...state, data: { ...state.data, constraints: [...state.data.constraints, action.payload] } };

    case ACTIONS.REMOVE_CONSTRAINT:
      return { ...state, data: { ...state.data, constraints: state.data.constraints.filter(c => c.id !== action.payload) } };

    case ACTIONS.SAVE_ROOM_LAYOUT:
      return { ...state, data: { ...state.data, roomLayouts: [...(state.data.roomLayouts || []), action.payload] } };

    case ACTIONS.DELETE_ROOM_LAYOUT:
      return { ...state, data: { ...state.data, roomLayouts: state.data.roomLayouts.filter(l => l.id !== action.payload) } };

    case ACTIONS.SAVE_PLAN:
      return { ...state, data: { ...state.data, plans: [action.payload, ...state.data.plans] } };

    case ACTIONS.DELETE_PLAN:
      return { ...state, data: { ...state.data, plans: state.data.plans.filter(p => p.id !== action.payload) } };

    case ACTIONS.UPDATE_ACTIVE_PLAN:
      return { ...state, data: updateActivePlan(state.data, action.payload.classId, action.payload.updates) };

    default:
      return state;
  }
};

export const AppProvider = ({ children, initialData }) => {
  const [state, dispatch] = useReducer(appReducer, {
    data: initialData || {
      classes: [], students: [], constraints: [], plans: [], roomLayouts: [], activePlans: {}
    },
    currentClassId: ''
  });

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp måste användas inuti en AppProvider');
  return context;
};