import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Checkbox } from './checkbox';

afterEach(() => {
  cleanup();
});

describe('Checkbox Component', () => {
  it('renders a checkbox by default', () => {
    render(<Checkbox data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.className).toContain('checkbox');
    expect(checkbox.className).toContain('checkbox-primary');
  });

  it('renders a toggle when variant is toggle', () => {
    render(<Checkbox variant="toggle" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
    expect(checkbox.className).toContain('toggle');
    expect(checkbox.className).toContain('toggle-primary');
    expect(checkbox.className).not.toContain('checkbox');
  });

  it('applies sizes correctly for checkbox', () => {
    const { rerender } = render(<Checkbox size="xs" data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox').className).toContain('checkbox-xs');

    rerender(<Checkbox size="sm" data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox').className).toContain('checkbox-sm');

    rerender(<Checkbox size="lg" data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox').className).toContain('checkbox-lg');
  });

  it('applies sizes correctly for toggle', () => {
    const { rerender } = render(<Checkbox variant="toggle" size="xs" data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox').className).toContain('toggle-xs');

    rerender(<Checkbox variant="toggle" size="sm" data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox').className).toContain('toggle-sm');

    rerender(<Checkbox variant="toggle" size="lg" data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox').className).toContain('toggle-lg');
  });

  it('applies no size class for md size', () => {
    render(<Checkbox size="md" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox.className).not.toContain('checkbox-md');
  });

  it('applies custom color classes', () => {
    render(<Checkbox color="secondary" data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox').className).toContain('checkbox-secondary');
  });

  it('passes checked prop', () => {
    render(<Checkbox checked readOnly data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox')).toBeChecked();
  });

  it('fires onChange handler when clicked', () => {
    const handleChange = vi.fn();
    render(<Checkbox onChange={handleChange} data-testid="checkbox" />);
    fireEvent.click(screen.getByTestId('checkbox'));
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('respects disabled prop', () => {
    render(<Checkbox disabled data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox')).toBeDisabled();
  });

  it('passes through standard attributes like name and aria-label', () => {
    render(<Checkbox name="terms" aria-label="Accept terms" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
    expect(checkbox.name).toBe('terms');
    expect(checkbox).toHaveAttribute('aria-label', 'Accept terms');
  });

  it('passes custom className to checkbox', () => {
    render(<Checkbox className="custom-class" data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox').className).toContain('custom-class');
  });
});
