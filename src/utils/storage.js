import { STORAGE_KEY } from './constants';

export const saveToLocal = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Kunde inte spara lokalt", e);
  }
};

export const loadFromLocal = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Kunde inte ladda data", e);
    return null;
  }
};

export const updateActivePlan = (data, classId, updates) => ({
  ...data,
  activePlans: {
    ...data.activePlans,
    [classId]: {
      ...data.activePlans?.[classId],
      ...updates
    }
  }
});