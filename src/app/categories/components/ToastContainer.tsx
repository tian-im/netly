'use client';

import { X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast toast-end toast-bottom z-50 p-4" role="log" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`alert ${
            toast.type === 'success' ? 'alert-success' : 'alert-error'
          } shadow-lg border border-white/10`}
        >
          <div className="flex justify-between items-center w-full gap-2">
            <span>{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="btn btn-ghost btn-circle btn-xs hover:bg-white/20 text-white flex items-center justify-center focus:outline-none"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
