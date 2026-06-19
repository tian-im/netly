import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Button } from './button';

afterEach(() => {
  cleanup();
});

describe('Button Component', () => {
  it('renders standard text children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies the primary variant class by default', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('btn-primary');
  });

  it('applies other variant classes correctly', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button').className).toContain('btn-secondary');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button').className).toContain('btn-outline');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button').className).toContain('btn-ghost');

    rerender(<Button variant="error">Error</Button>);
    expect(screen.getByRole('button').className).toContain('btn-error');

    rerender(<Button variant="success">Success</Button>);
    expect(screen.getByRole('button').className).toContain('btn-success');
  });

  it('applies sizes correctly', () => {
    const { rerender } = render(<Button size="xs">XS</Button>);
    expect(screen.getByRole('button').className).toContain('btn-xs');

    rerender(<Button size="sm">SM</Button>);
    expect(screen.getByRole('button').className).toContain('btn-sm');

    rerender(<Button size="md">MD</Button>);
    expect(screen.getByRole('button').className).toContain('btn-md');

    rerender(<Button size="lg">LG</Button>);
    expect(screen.getByRole('button').className).toContain('btn-lg');
  });

  it('renders a spinner when loading is true', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as a link when href is passed', () => {
    render(<Button href="/dashboard">Go Dashboard</Button>);
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/dashboard');
  });

  it('handles link loading state', () => {
    render(<Button href="/dashboard" loading>Go Dashboard</Button>);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button when disabled is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
