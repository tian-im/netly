import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Select } from './select';

afterEach(() => {
  cleanup();
});

describe('Select Component', () => {
  it('renders a select element with children', () => {
    render(
      <Select data-testid="select">
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </Select>
    );
    const select = screen.getByTestId('select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.className).toContain('select');
    expect(select.className).toContain('select-bordered');
    expect(select.options.length).toBe(2);
  });

  it('renders a label when provided', () => {
    render(<Select label="Test Label" data-testid="select" />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('renders error state and message correctly', () => {
    render(<Select error="This is an error" data-testid="select" />);
    const select = screen.getByTestId('select');
    expect(select.className).toContain('select-error');
    expect(screen.getByText('This is an error')).toBeInTheDocument();
    expect(screen.getByText('This is an error').className).toContain('text-error');
  });

  it('renders helper text when provided', () => {
    render(<Select helperText="Choose wisely" data-testid="select" />);
    expect(screen.getByText('Choose wisely')).toBeInTheDocument();
  });

  it('prioritizes error message over helper text', () => {
    render(<Select error="Error occurred" helperText="Choose wisely" data-testid="select" />);
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
    expect(screen.queryByText('Choose wisely')).not.toBeInTheDocument();
  });

  it('applies sizes correctly', () => {
    const { rerender } = render(<Select size="xs" data-testid="select" />);
    expect(screen.getByTestId('select').className).toContain('select-xs');

    rerender(<Select size="sm" data-testid="select" />);
    expect(screen.getByTestId('select').className).toContain('select-sm');

    rerender(<Select size="lg" data-testid="select" />);
    expect(screen.getByTestId('select').className).toContain('select-lg');
  });

  it('fires onChange handler when value changes', () => {
    const handleChange = vi.fn();
    render(
      <Select onChange={handleChange} data-testid="select">
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </Select>
    );
    const select = screen.getByTestId('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '2' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(select.value).toBe('2');
  });

  it('respects disabled prop', () => {
    render(<Select disabled data-testid="select" />);
    expect(screen.getByTestId('select')).toBeDisabled();
  });

  it('applies variants correctly', () => {
    const { rerender } = render(<Select variant="primary" data-testid="select" />);
    const select = screen.getByTestId('select');
    expect(select.className).toContain('select-primary');
    expect(select.className).toContain('focus:ring-primary/20');
    expect(select.className).not.toContain('focus:ring-warning/20');
    expect(select.className).not.toContain('focus:ring-error/20');

    rerender(<Select variant="warning" data-testid="select" />);
    expect(select.className).toContain('select-warning');
    expect(select.className).toContain('focus:ring-warning/20');
    expect(select.className).not.toContain('focus:ring-primary/20');
    expect(select.className).not.toContain('focus:ring-error/20');

    rerender(<Select variant="error" data-testid="select" />);
    expect(select.className).toContain('select-error');
    expect(select.className).toContain('focus:ring-error/20');
    expect(select.className).not.toContain('focus:ring-primary/20');
    expect(select.className).not.toContain('focus:ring-warning/20');

    rerender(<Select variant="default" data-testid="select" />);
    expect(select.className).toContain('focus:border-primary');
    expect(select.className).toContain('focus:ring-primary/20');
    expect(select.className).not.toContain('focus:ring-warning/20');
    expect(select.className).not.toContain('focus:ring-error/20');
  });

  it('prioritizes error prop over variant prop', () => {
    render(<Select error="Validation error" variant="primary" data-testid="select" />);
    expect(screen.getByTestId('select').className).toContain('select-error');
    expect(screen.getByTestId('select').className).toContain('focus:ring-error/20');
    expect(screen.getByTestId('select').className).not.toContain('select-primary');
  });

  it('applies ghost variant with no border, background, or ring', () => {
    render(<Select variant="ghost" size="xs" data-testid="select" />);
    const select = screen.getByTestId('select');
    expect(select.className).not.toContain('select-bordered');
    expect(select.className).not.toContain('focus:ring-2');
    expect(select.className).toContain('border-0');
    expect(select.className).toContain('bg-transparent');
    expect(select.className).toContain('cursor-pointer');
    expect(select.className).toContain('select-xs');
  });
});
