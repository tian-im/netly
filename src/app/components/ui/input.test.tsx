import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Input } from './input';

afterEach(() => {
  cleanup();
});

describe('Input Component', () => {
  it('renders standard input field correctly', () => {
    render(<Input placeholder="Enter username" />);
    const input = screen.getByPlaceholderText('Enter username') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('text');
  });

  it('renders the label correctly when provided', () => {
    render(<Input label="Username" placeholder="Enter username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('renders the helper text correctly when provided', () => {
    render(<Input helperText="Use a unique username" />);
    expect(screen.getByText('Use a unique username')).toBeInTheDocument();
  });

  it('renders error state correctly and overrides helper text', () => {
    render(<Input helperText="Will be hidden" error="Username is required" />);
    expect(screen.queryByText('Will be hidden')).not.toBeInTheDocument();
    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox').className).toContain('input-error');
  });

  it('handles input events and changes value', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} placeholder="Type here" />);
    const input = screen.getByPlaceholderText('Type here') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'testuser' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('testuser');
  });

  it('passes other standard input attributes like type, name, disabled', () => {
    render(<Input type="password" name="userpass" disabled placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.name).toBe('userpass');
    expect(input.disabled).toBe(true);
  });

  it('renders type="file" correctly with appropriate classes', () => {
    render(<Input type="file" data-testid="file-input" />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input.type).toBe('file');
    expect(input.className).toContain('file-input');
    expect(input.className.split(' ')).not.toContain('input');
  });

  it('renders type="file" error state correctly', () => {
    render(<Input type="file" data-testid="file-input" error="Invalid file format" />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input.className).toContain('file-input-error');
    expect(input.className).not.toContain('focus:border-primary');
    expect(screen.getByText('Invalid file format')).toBeInTheDocument();
  });

  it('adjusts focus ring color dynamically based on error state', () => {
    const { rerender } = render(<Input placeholder="Normal" />);
    expect(screen.getByPlaceholderText('Normal').className).toContain('focus:ring-primary/20');
    expect(screen.getByPlaceholderText('Normal').className).not.toContain('focus:ring-error/20');

    rerender(<Input placeholder="Normal" error="Some error" />);
    expect(screen.getByPlaceholderText('Normal').className).toContain('focus:ring-error/20');
    expect(screen.getByPlaceholderText('Normal').className).not.toContain('focus:ring-primary/20');
  });
});
