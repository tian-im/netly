import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { Autocomplete, AutocompleteOption } from './autocomplete';

afterEach(() => {
  cleanup();
});

const defaultOptions: AutocompleteOption[] = [
  { value: '1', label: 'Apple' },
  { value: '2', label: 'Banana' },
  { value: '3', label: 'Cherry' },
];

function TestWrapper({
  initialValue = '',
  options = defaultOptions,
  onChange = () => {},
  ...props
}: {
  initialValue?: string;
  options?: AutocompleteOption[];
  onChange?: (val: string) => void;
  [key: string]: any;
}) {
  const [val, setVal] = useState(initialValue);
  
  React.useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  return (
    <Autocomplete
      options={options}
      value={val}
      onChange={(v) => {
        setVal(v);
        onChange(v);
      }}
      data-testid="autocomplete-input"
      {...props}
    />
  );
}

describe('Autocomplete Component', () => {
  it('renders input with label and correct initial value', () => {
    render(<TestWrapper label="Test Autocomplete" initialValue="2" />);
    
    expect(screen.getByText('Test Autocomplete')).toBeInTheDocument();
    const input = screen.getByTestId('autocomplete-input') as HTMLInputElement;
    expect(input.value).toBe('Banana');
  });

  it('renders helperText and error message correctly', () => {
    const { rerender } = render(<TestWrapper helperText="Helper Text" />);
    expect(screen.getByText('Helper Text')).toBeInTheDocument();

    rerender(<TestWrapper error="Error Message" />);
    expect(screen.getByText('Error Message')).toBeInTheDocument();
    expect(screen.queryByText('Helper Text')).not.toBeInTheDocument();
  });

  it('opens dropdown and displays all options on focus', async () => {
    render(<TestWrapper />);
    const input = screen.getByTestId('autocomplete-input');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    
    fireEvent.focus(input);
    
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('filters options correctly when typing', async () => {
    render(<TestWrapper />);
    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.focus(input);
    await userEvent.type(input, 'ch');

    expect(screen.getByText('Cherry')).toBeInTheDocument();
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    expect(screen.queryByText('Banana')).not.toBeInTheDocument();
  });

  it('shows no matches message when no options match', async () => {
    render(<TestWrapper noMatchesText="No fruits found" />);
    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.focus(input);
    await userEvent.type(input, 'xyz');

    expect(screen.getByText('No fruits found')).toBeInTheDocument();
  });

  it('selects option on click, updates input value, calls onChange, and closes list', async () => {
    const handleChange = vi.fn();
    render(<TestWrapper onChange={handleChange} />);
    const input = screen.getByTestId('autocomplete-input') as HTMLInputElement;

    fireEvent.focus(input);
    const appleOption = screen.getByText('Apple');
    
    // Simulate mousedown to prevent blur issues in test environment
    fireEvent.mouseDown(appleOption);

    expect(input.value).toBe('Apple');
    expect(handleChange).toHaveBeenCalledWith('1');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates options using keyboard arrow keys and selects with Enter', async () => {
    const handleChange = vi.fn();
    render(<TestWrapper onChange={handleChange} />);
    const input = screen.getByTestId('autocomplete-input');

    // Focus input to open list
    fireEvent.focus(input);
    
    // Press ArrowDown to highlight Apple (index 0)
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Press ArrowDown to highlight Banana (index 1)
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Press Enter to select Banana
    fireEvent.keyDown(input, { key: 'Enter' });

    const inputEl = screen.getByTestId('autocomplete-input') as HTMLInputElement;
    expect(inputEl.value).toBe('Banana');
    expect(handleChange).toHaveBeenCalledWith('2');
  });

  it('closes dropdown and resets input value on Escape', async () => {
    render(<TestWrapper initialValue="2" />);
    const input = screen.getByTestId('autocomplete-input') as HTMLInputElement;

    fireEvent.focus(input);
    await userEvent.type(input, 'Cherry');
    expect(input.value).toBe('BananaCherry'); // userEvent appends

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input.value).toBe('Banana'); // reverted
  });

  it('resets input value on outside click', async () => {
    render(
      <div>
        <button data-testid="outside-btn">Outside</button>
        <TestWrapper initialValue="2" />
      </div>
    );
    const input = screen.getByTestId('autocomplete-input') as HTMLInputElement;
    
    fireEvent.focus(input);
    await userEvent.type(input, 'Cherry');
    expect(input.value).toBe('BananaCherry');

    const outsideBtn = screen.getByTestId('outside-btn');
    fireEvent.mouseDown(outsideBtn);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input.value).toBe('Banana'); // reverted
  });

  it('respects disabled prop and prevents interaction', () => {
    render(<TestWrapper disabled placeholder="Disabled field" />);
    const input = screen.getByTestId('autocomplete-input') as HTMLInputElement;

    expect(input).toBeDisabled();
    fireEvent.focus(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('handles keyboard Tab key correctly', async () => {
    const handleChange = vi.fn();
    const { rerender } = render(<TestWrapper onChange={handleChange} initialValue="" />);
    const input = screen.getByTestId('autocomplete-input');

    // Case 1: Tab with activeIndex highlights and selects the item
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 0 (Apple)
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(handleChange).toHaveBeenCalledWith('1');

    // Case 2: Tab without activeIndex reverts the value
    rerender(<TestWrapper onChange={handleChange} initialValue="2" />);
    fireEvent.focus(input);
    await userEvent.type(input, 'xyz');
    fireEvent.keyDown(input, { key: 'Tab' });
    const inputEl = screen.getByTestId('autocomplete-input') as HTMLInputElement;
    expect(inputEl.value).toBe('Banana');
  });

  it('selects the option on Enter when exactly 1 filtered result remains', async () => {
    const handleChange = vi.fn();
    render(<TestWrapper onChange={handleChange} />);
    const input = screen.getByTestId('autocomplete-input') as HTMLInputElement;

    fireEvent.focus(input);
    await userEvent.type(input, 'cher'); // leaves Cherry only
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input.value).toBe('Cherry');
    expect(handleChange).toHaveBeenCalledWith('3');
  });

  it('opens dropdown when pressing ArrowDown or ArrowUp while closed', () => {
    render(<TestWrapper />);
    const input = screen.getByTestId('autocomplete-input');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // ArrowDown opens
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click outside to close
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // ArrowUp opens
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('sets activeIndex on option mouse enter', async () => {
    render(<TestWrapper />);
    const input = screen.getByTestId('autocomplete-input');

    fireEvent.focus(input);
    const bananaOption = screen.getByText('Banana').closest('li');
    expect(bananaOption).toBeInTheDocument();

    fireEvent.mouseEnter(bananaOption!);
    // Banana option should have selection styling class
    expect(bananaOption!.className).toContain('bg-primary/10');
  });

  it('applies sizes and size-specific padding classes correctly', () => {
    const { rerender } = render(<TestWrapper size="xs" />);
    let input = screen.getByTestId('autocomplete-input');
    expect(input.className).toContain('input-xs');
    expect(input.className).toContain('pr-8');

    rerender(<TestWrapper size="sm" />);
    expect(input.className).toContain('input-sm');
    expect(input.className).toContain('pr-8');

    rerender(<TestWrapper size="md" />);
    expect(input.className).toContain('input-md');
    expect(input.className).toContain('pr-10');

    rerender(<TestWrapper size="lg" />);
    expect(input.className).toContain('input-lg');
    expect(input.className).toContain('pr-10');
  });

  it('syncs input value when controlled value changes externally', () => {
    const { rerender } = render(<TestWrapper initialValue="1" />);
    const input = screen.getByTestId('autocomplete-input') as HTMLInputElement;
    expect(input.value).toBe('Apple');

    rerender(<TestWrapper initialValue="3" />);
    expect(input.value).toBe('Cherry');
  });

  it('handles empty options array gracefully', () => {
    render(<TestWrapper options={[]} noMatchesText="Empty list" />);
    const input = screen.getByTestId('autocomplete-input');

    fireEvent.focus(input);
    expect(screen.getByText('Empty list')).toBeInTheDocument();
  });

  it('handles unmatched value gracefully by showing empty or matching string', () => {
    render(<TestWrapper initialValue="unmatched_id" />);
    const input = screen.getByTestId('autocomplete-input') as HTMLInputElement;
    expect(input.value).toBe('');
  });
});

describe('Autocomplete dropdown positioning', () => {
  it('uses position:fixed for the dropdown to avoid overflow clipping', () => {
    render(<TestWrapper />);
    const input = screen.getByTestId('autocomplete-input');

    fireEvent.focus(input);
    const listbox = screen.getByRole('listbox');
    expect(listbox.style.position).toBe('fixed');
    expect(listbox.style.top).toBe('4px');  // getBoundingClientRect() defaults to 0 in jsdom, +4 = 4
    expect(listbox.style.left).toBe('0px');
  });

  it('computes dropdown position from getBoundingClientRect', () => {
    // Override getBoundingClientRect on the container element
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100, left: 50, bottom: 140, right: 350,
      width: 300, height: 40,
      x: 50, y: 100,
      toJSON: () => {},
    }));

    try {
      render(<TestWrapper />);
      const input = screen.getByTestId('autocomplete-input');
      fireEvent.focus(input);

      const listbox = screen.getByRole('listbox');
      expect(listbox.style.position).toBe('fixed');
      expect(listbox.style.top).toBe('144px');  // bottom (140) + 4
      expect(listbox.style.left).toBe('50px');
      expect(listbox.style.width).toBe('300px');
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('no-matches dropdown also uses position:fixed', async () => {
    render(<TestWrapper options={[]} noMatchesText="No results" />);
    const input = screen.getByTestId('autocomplete-input');

    fireEvent.focus(input);
    const noMatchesDiv = screen.getByText('No results');
    expect(noMatchesDiv.style.position).toBe('fixed');
  });

  it('repositions on window resize while open', async () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 200, left: 80, bottom: 240, right: 400,
      width: 320, height: 40,
      x: 80, y: 200,
      toJSON: () => {},
    });

    try {
      render(<TestWrapper />);
      const input = screen.getByTestId('autocomplete-input');
      fireEvent.focus(input);

      // Before resize: based on initial rect
      let listbox = screen.getByRole('listbox');
      expect(listbox.style.top).toBe('244px');

      // Update mock for resize
      spy.mockReturnValue({
        top: 300, left: 100, bottom: 340, right: 420,
        width: 320, height: 40,
        x: 100, y: 300,
        toJSON: () => {},
      });
      fireEvent.resize(window);

      listbox = screen.getByRole('listbox');
      expect(listbox.style.top).toBe('344px');  // new bottom (340) + 4
      expect(listbox.style.left).toBe('100px');
    } finally {
      spy.mockRestore();
    }
  });

  it('repositions on scroll while open', async () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 50, left: 20, bottom: 90, right: 220,
      width: 200, height: 40,
      x: 20, y: 50,
      toJSON: () => {},
    });

    try {
      render(<TestWrapper />);
      const input = screen.getByTestId('autocomplete-input');
      fireEvent.focus(input);

      let listbox = screen.getByRole('listbox');
      expect(listbox.style.top).toBe('94px');

      // Simulate scroll changing position
      spy.mockReturnValue({
        top: 10, left: 20, bottom: 50, right: 220,
        width: 200, height: 40,
        x: 20, y: 10,
        toJSON: () => {},
      });
      fireEvent.scroll(window);

      listbox = screen.getByRole('listbox');
      expect(listbox.style.top).toBe('54px');  // new bottom (50) + 4
    } finally {
      spy.mockRestore();
    }
  });

  it('removes scroll and resize listeners when dropdown closes', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    render(<TestWrapper />);
    const input = screen.getByTestId('autocomplete-input');

    // Open
    fireEvent.focus(input);
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    addSpy.mockClear();
    removeSpy.mockClear();

    // Close via Escape
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
