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
    // WHY: DaisyUI v5 default error/success-content colors are dark; we enforce text-white for solid-background buttons
    expect(screen.getByRole('button').className).toContain('text-white');

    rerender(<Button variant="success">Success</Button>);
    expect(screen.getByRole('button').className).toContain('btn-success');
    expect(screen.getByRole('button').className).toContain('text-white');
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

  it('renders an icon when icon prop is provided', () => {
    render(<Button icon={<span data-testid="my-icon" />}>Save</Button>);
    expect(screen.getByTestId('my-icon')).toBeInTheDocument();
  });

  it('applies outline-error variant class correctly', () => {
    render(<Button variant="outline-error">Outline Error</Button>);
    expect(screen.getByRole('button').className).toContain('btn-outline');
    expect(screen.getByRole('button').className).toContain('btn-error');
  });

  it('applies outline-primary variant class correctly', () => {
    render(<Button variant="outline-primary">Outline Primary</Button>);
    expect(screen.getByRole('button').className).toContain('btn-outline');
    expect(screen.getByRole('button').className).toContain('btn-primary');
  });

  it('applies outline-secondary variant class correctly', () => {
    render(<Button variant="outline-secondary">Outline Secondary</Button>);
    expect(screen.getByRole('button').className).toContain('btn-outline');
    expect(screen.getByRole('button').className).toContain('btn-secondary');
  });

  it('applies accent variant class correctly', () => {
    render(<Button variant="accent">Accent</Button>);
    expect(screen.getByRole('button').className).toContain('btn-accent');
    expect(screen.getByRole('button').className).toContain('text-white');
  });

  it('applies outline-accent variant class correctly', () => {
    render(<Button variant="outline-accent">Outline Accent</Button>);
    expect(screen.getByRole('button').className).toContain('btn-outline');
    expect(screen.getByRole('button').className).toContain('btn-accent');
  });

  it('applies neutral, warning, and link variant classes correctly', () => {
    const { rerender } = render(<Button variant="neutral">Neutral</Button>);
    expect(screen.getByRole('button').className).toContain('btn-neutral');

    rerender(<Button variant="warning">Warning</Button>);
    expect(screen.getByRole('button').className).toContain('btn-warning');
    expect(screen.getByRole('button').className).toContain('text-white');

    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole('button').className).toContain('btn-link');
  });

  it('applies tab variant classes correctly and suppresses button defaults', () => {
    const { rerender } = render(<Button variant="tab">Tab</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('tab');
    expect(button.className).not.toContain('btn');
    expect(button.className).not.toContain('rounded-xl');
    expect(button.className).not.toContain('no-animation');

    rerender(<Button variant="tab" size="lg">Tab LG</Button>);
    expect(screen.getByRole('button').className).toContain('tab-lg');
    expect(screen.getByRole('button').className).not.toContain('btn-lg');
  });

  it('renders tab variant with xl size correctly', () => {
    render(<Button variant="tab" size="xl">Tab XL</Button>);
    expect(screen.getByRole('button').className).toContain('tab-xl');
  });

  it('renders tab variant as button even if href is passed', () => {
    render(<Button variant="tab" href="/some-path">Tab Button</Button>);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies segmented variant classes correctly', () => {
    render(<Button variant="segmented">Option</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('text-base-content/70');
    expect(button.className).toContain('hover:bg-base-300');
    expect(button.className).toContain('border-0');
  });

  it('suppresses rounded-xl and scale when join-item className is passed', () => {
    render(<Button className="join-item">Joined</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('join-item');
    expect(button.className).not.toContain('rounded-xl');
    expect(button.className).not.toContain('hover:scale-[0.98]');
  });

  it('passes target and rel to the anchor element when href is provided', () => {
    render(<Button href="/external-link" target="_blank" rel="noopener">Link</Button>);
    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
  });

  it('does not apply horizontal padding classes when className contains btn-square', () => {
    render(<Button className="btn-square">Square</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('btn-md');
    expect(button.className).not.toContain('px-5');
    expect(button.className).toContain('btn-square');
  });

  it('does not apply horizontal padding classes when className contains btn-circle', () => {
    render(<Button className="btn-circle" size="sm">Circle</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('btn-sm');
    expect(button.className).not.toContain('px-3');
    expect(button.className).toContain('btn-circle');
  });
});


