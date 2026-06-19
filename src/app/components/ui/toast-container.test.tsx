import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { ToastContainer } from './toast-container';

afterEach(() => {
  cleanup();
});

describe('ToastContainer Component', () => {
  it('returns null when toasts list is empty', () => {
    const { container } = render(<ToastContainer toasts={[]} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a list of toast components', () => {
    const toasts = [
      { id: '1', message: 'Success message', type: 'success' as const },
      { id: '2', message: 'Error message', type: 'error' as const },
      { id: '3', message: 'Warning message', type: 'warning' as const },
      { id: '4', message: 'Info message', type: 'info' as const },
    ];
    render(<ToastContainer toasts={toasts} onClose={vi.fn()} />);

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });


  it('calls onClose with the correct id when dismiss button is clicked', () => {
    const handleClose = vi.fn();
    const toasts = [
      { id: 'custom-id-123', message: 'Success message', type: 'success' as const },
    ];
    render(<ToastContainer toasts={toasts} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Dismiss notification' });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledWith('custom-id-123');
  });
});
