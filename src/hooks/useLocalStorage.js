import { useState, useEffect } from 'react';
import { saveToLocal, loadFromLocal } from '../utils/storage';

export const useLocalStorage = (initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    const localData = loadFromLocal();
    return localData || initialValue;
  });

  useEffect(() => {
    if (storedValue) {
      saveToLocal(storedValue);
    }
  }, [storedValue]);

  return [storedValue, setStoredValue];
};