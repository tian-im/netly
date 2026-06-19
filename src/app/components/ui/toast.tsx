import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  const styles = {
    success: { 
      bg: 'bg-success/10 border-success/30 text-success-content', 
      icon: <CheckCircle className="h-5 w-5 text-success" data-testid="toast-success-icon" /> 
    },
    error: { 
      bg: 'bg-error/10 border-error/30 text-error-content', 
      icon: <XCircle className="h-5 w-5 text-error" data-testid="toast-error-icon" /> 
    },
    warning: { 
      bg: 'bg-warning/10 border-warning/30 text-warning-content', 
      icon: <AlertTriangle className="h-5 w-5 text-warning" data-testid="toast-warning-icon" /> 
    },
    info: { 
      bg: 'bg-info/10 border-info/30 text-info-content', 
      icon: <Info className="h-5 w-5 text-info" data-testid="toast-info-icon" /> 
    },
  }[type];

  return (
    <div className={`flex items-center gap-3 p-3.5 border rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${styles.bg}`}>
      {styles.icon}
      <span className="text-sm font-medium flex-1">{message}</span>
      {onClose && (
        <button 
          onClick={onClose} 
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Close notification"
        >
          <X className="h-4 w-4 opacity-70" />
        </button>
      )}
    </div>
  );
};
