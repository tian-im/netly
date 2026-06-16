import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import CurrencySelector from './CurrencySelector';
import enMessages from '../../../messages/en.json';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe('CurrencySelector', () => {
  it('renders with the current value', () => {
    const { container } = renderWithProvider(<CurrencySelector value="AUD" onChange={() => {}} />);
    const input = container.querySelector('input[role="combobox"]');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toContain('AUD');
    expect((input as HTMLInputElement).value).toContain('Australian Dollar');
  });

  it('calls onChange when a currency is selected from dropdown', async () => {
    const handleChange = vi.fn();
    const { container } = renderWithProvider(<CurrencySelector value="USD" onChange={handleChange} />);

    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'euro' } });

    // Should filter to currencies with "euro" in name
    const options = await screen.findAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(1);

    // Select the first option
    fireEvent.mouseDown(options[0]);
    expect(handleChange).toHaveBeenCalled();
  });

  it('shows all options on focus with empty search', async () => {
    const { container } = renderWithProvider(<CurrencySelector value="" onChange={() => {}} />);
    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;

    fireEvent.focus(input);
    const options = await screen.findAllByRole('option');
    expect(options.length).toBeGreaterThan(10);
  });

  it('filters options by currency code', async () => {
    const { container } = renderWithProvider(<CurrencySelector value="" onChange={() => {}} />);
    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'JPY' } });

    const options = await screen.findAllByRole('option');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toContain('JPY');
    expect(options[0].textContent).toContain('Japanese Yen');
  });

  it('filters options by currency name', async () => {
    const { container } = renderWithProvider(<CurrencySelector value="" onChange={() => {}} />);
    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'baht' } });

    const options = await screen.findAllByRole('option');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toContain('THB');
    expect(options[0].textContent).toContain('Thai Baht');
  });

  it('shows no results message when nothing matches', async () => {
    const { container } = renderWithProvider(<CurrencySelector value="" onChange={() => {}} />);
    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ZZZZZZ' } });

    await waitFor(() => {
      expect(screen.getByText(/No currencies match/i)).toBeTruthy();
    });
  });

  it('handles keyboard navigation (ArrowDown/ArrowUp/Enter)', async () => {
    const handleChange = vi.fn();
    const { container } = renderWithProvider(<CurrencySelector value="" onChange={handleChange} />);
    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;

    fireEvent.focus(input);
    // Wait for dropdown to render
    await screen.findAllByRole('option');

    // Arrow down to first option
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    // The first option should be selected (AED since it's alphabetically first)
    expect(handleChange).toHaveBeenCalledWith('AED');
  });

  it('disables the input when disabled prop is true', () => {
    const { container } = renderWithProvider(<CurrencySelector value="AUD" onChange={() => {}} disabled={true} />);
    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('closes dropdown on Escape', async () => {
    const { container } = renderWithProvider(<CurrencySelector value="" onChange={() => {}} />);
    const input = container.querySelector('input[role="combobox"]') as HTMLInputElement;

    fireEvent.focus(input);
    // Wait for dropdown to appear
    const options = await screen.findAllByRole('option');
    expect(options.length).toBeGreaterThan(0);

    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryAllByRole('option').length).toBe(0);
    });
  });
});
