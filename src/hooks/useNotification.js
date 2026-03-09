import { useState, useCallback } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotification({ id, message, type });

    if (duration > 0) {
      setTimeout(() => {
        setNotification(prev => prev?.id === id ? null : prev);
      }, duration);
    }
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showError = useCallback((message) => showNotification(message, 'error'), [showNotification]);
  const showSuccess = useCallback((message) => showNotification(message, 'success'), [showNotification]);
  const showWarning = useCallback((message) => showNotification(message, 'warning'), [showNotification]);
  const showInfo = useCallback((message) => showNotification(message, 'info'), [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    showError,
    showSuccess,
    showWarning,
    showInfo
  };
};