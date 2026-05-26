import { useState, useEffect } from 'react';
import NotifyService from '../../services/NotifyService';

const NotifyToast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = NotifyService.subscribe((notification) => {
      setToasts(prev => [...prev, notification]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== notification.id));
      }, notification.duration);
    });
    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, minWidth: 280 }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`alert alert-${toast.type} alert-dismissible shadow-sm mb-2`}
          role="alert"
        >
          {toast.message}
          <button
            type="button"
            className="btn-close"
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        </div>
      ))}
    </div>
  );
};

export default NotifyToast;
