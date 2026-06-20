import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Modal } from './modal';

afterEach(() => {
  cleanup();
});

describe('Modal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} data-testid="modal">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    );
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} data-testid="modal-box">
        <Modal.Header data-testid="modal-header">
          <Modal.Title data-testid="modal-title">Title</Modal.Title>
        </Modal.Header>
        <Modal.Body data-testid="modal-body">Content</Modal.Body>
        <Modal.Actions data-testid="modal-actions">
          <button onClick={handleClose}>Close</button>
        </Modal.Actions>
      </Modal>
    );

    expect(screen.getByTestId('modal-box')).toBeInTheDocument();
    expect(screen.getByTestId('modal-header')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toBeInTheDocument();
    expect(screen.getByTestId('modal-body')).toBeInTheDocument();
    expect(screen.getByTestId('modal-actions')).toBeInTheDocument();
  });

  it('calls onClose when clicking the backdrop overlay', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnBackdropClick={true}>
        <Modal.Body>Content</Modal.Body>
      </Modal>
    );

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking backdrop if closeOnBackdropClick is false', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnBackdropClick={false}>
        <Modal.Body>Content</Modal.Body>
      </Modal>
    );

    expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <Modal.Body>Content</Modal.Body>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies custom size (max-width) classes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} maxWidth="sm" data-testid="modal-box">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    );
    expect(screen.getByTestId('modal-box')).toHaveClass('max-w-sm');

    rerender(
      <Modal isOpen={true} onClose={vi.fn()} maxWidth="4xl" data-testid="modal-box">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    );
    expect(screen.getByTestId('modal-box')).toHaveClass('max-w-4xl');
  });

  it('renders Modal.Header with a close button if onClose is provided', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <Modal.Header onClose={handleClose} data-testid="modal-header">
          <Modal.Title>Title</Modal.Title>
        </Modal.Header>
      </Modal>
    );

    const closeBtn = screen.getByLabelText('Close');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('propagates accessibility attributes to the dialog container', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        aria-labelledby="modal-title-id"
        aria-describedby="modal-desc-id"
        aria-label="Modal Dialog"
      >
        <Modal.Body>Content</Modal.Body>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title-id');
    expect(dialog).toHaveAttribute('aria-describedby', 'modal-desc-id');
    expect(dialog).toHaveAttribute('aria-label', 'Modal Dialog');
  });

  it('omits border-base-200 if a custom border class is provided in className', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} className="border-error/20" data-testid="modal-box">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    );

    const modalBox = screen.getByTestId('modal-box');
    expect(modalBox).toHaveClass('border-error/20');
    expect(modalBox).not.toHaveClass('border-base-200');
  });

  it('does not omit border-base-200 if a non-color border utility (like border-2) is provided in className', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} className="border-2 border-solid" data-testid="modal-box">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    );

    const modalBox = screen.getByTestId('modal-box');
    expect(modalBox).toHaveClass('border-2');
    expect(modalBox).toHaveClass('border-solid');
    expect(modalBox).toHaveClass('border-base-200');
  });
});
