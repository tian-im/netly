import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Radio } from './radio';

afterEach(() => {
  cleanup();
});

describe('Radio Component', () => {
  it('renders a radio by default', () => {
    render(<Radio data-testid="radio" />);
    const radio = screen.getByTestId('radio') as HTMLInputElement;
    expect(radio).toBeInTheDocument();
    expect(radio.type).toBe('radio');
    expect(radio.className).toContain('radio');
    expect(radio.className).toContain('radio-primary');
  });

  it('applies sizes correctly', () => {
    const { rerender } = render(<Radio size="xs" data-testid="radio" />);
    expect(screen.getByTestId('radio').className).toContain('radio-xs');

    rerender(<Radio size="sm" data-testid="radio" />);
    expect(screen.getByTestId('radio').className).toContain('radio-sm');

    rerender(<Radio size="lg" data-testid="radio" />);
    expect(screen.getByTestId('radio').className).toContain('radio-lg');
  });

  it('applies no size class for md size', () => {
    render(<Radio size="md" data-testid="radio" />);
    const radio = screen.getByTestId('radio');
    expect(radio.className).not.toContain('radio-md');
  });

  it('applies custom color classes', () => {
    render(<Radio color="secondary" data-testid="radio" />);
    expect(screen.getByTestId('radio').className).toContain('radio-secondary');
  });

  it('passes checked prop', () => {
    render(<Radio checked readOnly data-testid="radio" />);
    expect(screen.getByTestId('radio')).toBeChecked();
  });

  it('fires onChange handler when clicked', () => {
    const handleChange = vi.fn();
    render(<Radio onChange={handleChange} data-testid="radio" />);
    fireEvent.click(screen.getByTestId('radio'));
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('respects disabled prop', () => {
    render(<Radio disabled data-testid="radio" />);
    expect(screen.getByTestId('radio')).toBeDisabled();
  });

  it('passes through standard attributes like name and value', () => {
    render(<Radio name="gender" value="male" data-testid="radio" />);
    const radio = screen.getByTestId('radio') as HTMLInputElement;
    expect(radio.name).toBe('gender');
    expect(radio.value).toBe('male');
  });

  it('passes custom className to radio', () => {
    render(<Radio className="custom-class" data-testid="radio" />);
    expect(screen.getByTestId('radio').className).toContain('custom-class');
  });
});
