import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import Pagination from './Pagination';
import enMessages from '../../../../messages/en.json';

// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockOnPageChange = vi.fn();

function renderPagination(totalCount: number, pageSize: number, currentPage: number) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    const root = createRoot(container);
    root.render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Pagination
          totalCount={totalCount}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={mockOnPageChange}
        />
      </NextIntlClientProvider>
    );
  });

  return container;
}

describe('Pagination', () => {
  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('renders nothing when totalCount is 0', () => {
    const container = renderPagination(0, 25, 1);
    expect(container.innerHTML).toBe('');
  });

  it('displays showing range text', () => {
    const container = renderPagination(50, 25, 1);
    expect(container.textContent).toContain('Showing 1–25 of 50');
  });

  it('disables first and prev buttons on page 1', () => {
    const container = renderPagination(50, 25, 1);
    const buttons = container.querySelectorAll('button');
    // First button (first page) should be disabled
    expect(buttons[0].hasAttribute('disabled')).toBe(true);
    // Second button (prev) should be disabled
    expect(buttons[1].hasAttribute('disabled')).toBe(true);
  });

  it('disables next and last buttons on last page', () => {
    const container = renderPagination(50, 25, 2);
    const buttons = container.querySelectorAll('button');
    // Next-to-last button (next)
    expect(buttons[buttons.length - 2].hasAttribute('disabled')).toBe(true);
    // Last button (last page)
    expect(buttons[buttons.length - 1].hasAttribute('disabled')).toBe(true);
  });

  it('calls onPageChange when clicking a page number', () => {
    const container = renderPagination(50, 25, 1);
    // Page 2 button
    const page2Button = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '2'
    );
    expect(page2Button).toBeTruthy();
    act(() => page2Button!.click());
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with 1 when clicking first page', () => {
    const container = renderPagination(50, 25, 2);
    const firstButton = container.querySelector('button');
    act(() => firstButton!.click());
    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('displays correct page numbers for large page counts', () => {
    const container = renderPagination(2000, 25, 40);
    // Total pages = 80, current = 40, should show: 1 ... 39 40 41 ... 80
    const pageButtons = Array.from(container.querySelectorAll('button'))
      .map((b) => b.textContent)
      .filter((t) => t && !isNaN(Number(t)))
      .map(Number);
    expect(pageButtons).toContain(1);
    expect(pageButtons).toContain(39);
    expect(pageButtons).toContain(40);
    expect(pageButtons).toContain(41);
    expect(pageButtons).toContain(80);
  });

  it('highlights current page with btn-primary class', () => {
    const container = renderPagination(50, 25, 2);
    const page2Button = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '2'
    );
    expect(page2Button!.className).toContain('btn-primary');
  });
});
