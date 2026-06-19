import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Toast } from './toast';

afterEach(() => {
  cleanup();
});

describe('Toast Component', () => {
  it('renders message text correctly', () => {
    render(<Toast message="Operation successful" />);
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('renders the correct style and icon for success toast', () => {
    render(<Toast message="Saved" type="success" />);
    expect(screen.getByTestId('toast-success-icon')).toBeInTheDocument();
    expect(screen.getByText('Saved').parentElement?.className).toContain('bg-success/10');
  });

  it('renders the correct style and icon for error toast', () => {
    render(<Toast message="Failed" type="error" />);
    expect(screen.getByTestId('toast-error-icon')).toBeInTheDocument();
    expect(screen.getByText('Failed').parentElement?.className).toContain('bg-error/10');
  });

  it('renders the correct style and icon for warning toast', () => {
    render(<Toast message="Warning" type="warning" />);
    expect(screen.getByTestId('toast-warning-icon')).toBeInTheDocument();
    expect(screen.getByText('Warning').parentElement?.className).toContain('bg-warning/10');
  });

  it('renders the correct style and icon for info toast (default)', () => {
    render(<Toast message="Information" type="info" />);
    expect(screen.getByTestId('toast-info-icon')).toBeInTheDocument();
    expect(screen.getByText('Information').parentElement?.className).toContain('bg-info/10');
  });

  it('does not render close button if onClose callback is not provided', () => {
    render(<Toast message="No close button" />);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('renders close button and fires onClose when clicked', () => {
    const handleClose = vi.fn();
    render(<Toast message="With close button" onClose={handleClose} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn).toBeInTheDocument();
    
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
