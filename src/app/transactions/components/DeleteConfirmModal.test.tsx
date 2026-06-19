import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import DeleteConfirmModal from './DeleteConfirmModal';
import enMessages from '../../../../messages/en.json';

// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockOnClose = vi.fn();
const mockOnConfirm = vi.fn();

let activeRoot: any = null;
let container: HTMLDivElement | null = null;

function renderModal(isOpen: boolean, count: number) {
  container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    activeRoot = createRoot(container!);
    activeRoot.render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <DeleteConfirmModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          count={count}
        />
      </NextIntlClientProvider>
    );
  });

  return container;
}

describe('DeleteConfirmModal', () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnConfirm.mockClear();
  });

  afterEach(() => {
    if (activeRoot) {
      act(() => {
        activeRoot.unmount();
      });
      activeRoot = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  it('renders nothing when isOpen is false', () => {
    const container = renderModal(false, 5);
    expect(container.innerHTML).toBe('');
  });

  it('renders modal with title, cancel and confirm buttons', () => {
    const container = renderModal(true, 5);
    expect(container.textContent).toContain('Confirm Delete');
    expect(container.textContent).toContain('Are you sure you want to permanently delete 5 transactions?');
    
    const buttons = container.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);
    expect(buttonTexts).toContain('Cancel');
    expect(buttonTexts).toContain('Delete Selected (5)');
  });

  it('renders singular message when count is 1', () => {
    const container = renderModal(true, 1);
    expect(container.textContent).toContain('Are you sure you want to delete this transaction?');
    
    const buttons = container.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);
    expect(buttonTexts).toContain('Delete Selected (1)');
  });

  it('calls onClose when Cancel is clicked', () => {
    const container = renderModal(true, 5);
    const cancelBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cancel'
    );
    act(() => cancelBtn!.click());
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Delete is clicked', () => {
    const container = renderModal(true, 5);
    const deleteBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.startsWith('Delete Selected')
    );
    act(() => deleteBtn!.click());
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    renderModal(true, 5);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
