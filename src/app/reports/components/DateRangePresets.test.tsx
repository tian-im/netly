import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../../messages/en.json';
import DateRangePresets from './DateRangePresets';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('DateRangePresets Component', () => {
  beforeEach(() => {
    // Set system time to a fixed date in UTC for stable preset calculations (2026-08-21)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 7, 21))); // August 21, 2026 UTC
  });

  const renderComponent = (startDateStr = '', endDateStr = '', onSelectRange = vi.fn()) => {
    return render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <DateRangePresets
          startDateStr={startDateStr}
          endDateStr={endDateStr}
          onSelectRange={onSelectRange}
        />
      </NextIntlClientProvider>
    );
  };

  it('renders presets select dropdown and labels', () => {
    renderComponent();
    expect(screen.getByLabelText('Presets:')).toBe(screen.getByRole('combobox'));
    
    // It should have options for presets
    expect(screen.getByRole('option', { name: 'This Month' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last Month' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last 3 Months' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last 6 Months' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last 12 Months' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Year to Date (YTD)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last Quarter' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'This Year' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All Time' })).toBeInTheDocument();
  });

  it('renders custom option as disabled and hidden', () => {
    renderComponent('2026-06-10', '2026-06-20');
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const customOption = select.querySelector('option[value="custom"]') as HTMLOptionElement;
    expect(customOption).toBeInTheDocument();
    expect(customOption).toBeDisabled();
    expect(customOption).toHaveAttribute('hidden');
  });

  it('does not call onSelectRange if custom option is selected', () => {
    const handleSelectRange = vi.fn();
    renderComponent('2026-08-01', '2026-08-31', handleSelectRange);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'custom' } });
    expect(handleSelectRange).not.toHaveBeenCalled();
  });

  const expectedPresets = [
    { key: 'this-month', start: '2026-08-01', end: '2026-08-31', name: 'This Month' },
    { key: 'last-month', start: '2026-07-01', end: '2026-07-31', name: 'Last Month' },
    { key: 'three-months', start: '2026-06-01', end: '2026-08-31', name: 'Last 3 Months' },
    { key: 'six-months', start: '2026-03-01', end: '2026-08-31', name: 'Last 6 Months' },
    { key: 'twelve-months', start: '2025-09-01', end: '2026-08-31', name: 'Last 12 Months' },
    { key: 'ytd', start: '2026-01-01', end: '2026-08-31', name: 'Year to Date (YTD)' },
    { key: 'last-quarter', start: '2026-04-01', end: '2026-06-30', name: 'Last Quarter' },
    { key: 'this-year', start: '2026-01-01', end: '2026-08-21', name: 'This Year' },
    { key: 'all-time', start: '1970-01-01', end: '2026-08-21', name: 'All Time' },
  ];

  expectedPresets.forEach(({ key, start, end, name }) => {
    it(`handles preset "${key}" correctly`, () => {
      const handleSelectRange = vi.fn();
      renderComponent('', '', handleSelectRange);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: key } });

      expect(handleSelectRange).toHaveBeenCalledWith(start, end);
    });

    it(`selects option "${key}" when current dates match`, () => {
      renderComponent(start, end);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe(key);
    });
  });

  it('handles last-quarter preset correctly when system time is in Q1 (February)', () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 1, 21))); // Feb 21, 2026 UTC
    const handleSelectRange = vi.fn();
    renderComponent('', '', handleSelectRange);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'last-quarter' } });

    expect(handleSelectRange).toHaveBeenCalledWith('2025-10-01', '2025-12-31');
  });
});

