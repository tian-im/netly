import React from 'react';
import { Toast, ToastType } from './toast';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

// WHY: A standardized screen overlay container to stack toast notifications neatly on the bottom right.
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div 
      className="toast toast-end toast-bottom z-50 p-4 font-semibold" 
      role="log" 
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  );
};
