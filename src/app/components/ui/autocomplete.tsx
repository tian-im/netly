'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface AutocompleteOption {
  value: string;
  label: string;
}

export interface AutocompleteProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  noMatchesText?: string;
}

export const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>(
  (
    {
      id,
      options,
      value,
      onChange,
      label,
      error,
      helperText,
      size = 'md',
      noMatchesText = 'No matches found',
      className = '',
      placeholder,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const listboxRef = useRef<HTMLUListElement>(null);
    
    // Find initial option matching current value
    const initialOption = useMemo(() => {
      return options.find((opt) => opt.value === value);
    }, [options, value]);

    // Keep track of search/input text
    const [inputValue, setInputValue] = useState(initialOption ? initialOption.label : '');
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    // WHY: position:fixed with manual bounding-rect measurement avoids dropdown
    // clipping when the Autocomplete is placed inside ancestors with overflow:hidden
    // (modals, scrollable cards, etc.). We recompute on scroll/resize while open.
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const reposition = useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }, []);

    // Reposition when dropdown opens, and on scroll/resize while open
    useEffect(() => {
      if (!isOpen) return;
      reposition();
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      return () => {
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('resize', reposition);
      };
    }, [isOpen, reposition]);

    // Sync input value if value prop updates externally
    useEffect(() => {
      const match = options.find((opt) => opt.value === value);
      setInputValue(match ? match.label : '');
    }, [value, options]);

    // Filter options based on input value
    const filteredOptions = useMemo(() => {
      const query = inputValue.toLowerCase().trim();
      if (!query) return options;
      return options.filter((opt) => opt.label.toLowerCase().includes(query));
    }, [options, inputValue]);

    // Close and reset input value on outside clicks
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setActiveIndex(-1);
          // Revert input text back to the currently selected option's label
          const currentOption = options.find((opt) => opt.value === value);
          setInputValue(currentOption ? currentOption.label : '');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [options, value]);

    // Scroll active item into view
    useEffect(() => {
      if (isOpen && activeIndex >= 0 && listboxRef.current) {
        const activeOptionEl = listboxRef.current.children[activeIndex] as HTMLElement;
        if (activeOptionEl && typeof activeOptionEl.scrollIntoView === 'function') {
          activeOptionEl.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [activeIndex, isOpen]);

    const handleSelect = (option: AutocompleteOption) => {
      setInputValue(option.label);
      onChange(option.value);
      setIsOpen(false);
      setActiveIndex(-1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setIsOpen(true);
      setActiveIndex(-1);
    };

    const handleFocus = () => {
      if (!disabled) {
        setIsOpen(true);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          setIsOpen(true);
          e.preventDefault();
          return;
        }
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            handleSelect(filteredOptions[activeIndex]);
          } else if (filteredOptions.length === 1) {
            handleSelect(filteredOptions[0]);
          } else {
            // Revert value
            const currentOption = options.find((opt) => opt.value === value);
            setInputValue(currentOption ? currentOption.label : '');
            setIsOpen(false);
            setActiveIndex(-1);
          }
          break;
        case 'Escape':
          e.preventDefault();
          const currentOption = options.find((opt) => opt.value === value);
          setInputValue(currentOption ? currentOption.label : '');
          setIsOpen(false);
          setActiveIndex(-1);
          break;
        case 'Tab':
          // Select active or revert, then allow normal tab behavior
          if (isOpen) {
            if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
              handleSelect(filteredOptions[activeIndex]);
            } else {
              const currentOpt = options.find((opt) => opt.value === value);
              setInputValue(currentOpt ? currentOpt.label : '');
              setIsOpen(false);
              setActiveIndex(-1);
            }
          }
          break;
      }
    };

    // Styling configurations
    const sizeClass = {
      xs: 'input-xs',
      sm: 'input-sm',
      md: 'input-md',
      lg: 'input-lg',
    }[size];

    const paddingClass = {
      xs: 'pr-8',
      sm: 'pr-8',
      md: 'pr-10',
      lg: 'pr-10',
    }[size];

    const iconRightClass = {
      xs: 'right-2',
      sm: 'right-2',
      md: 'right-3',
      lg: 'right-3',
    }[size];

    const ringClass = error ? 'focus:ring-error/20' : 'focus:ring-primary/20';
    
    const inputClass = `input input-bordered w-full rounded-lg focus:ring-2 ${paddingClass} ${ringClass} ${
      error ? 'input-error' : 'focus:border-primary'
    } ${sizeClass} ${className}`.trim();

    const listboxId = id ? `${id}-listbox` : 'autocomplete-listbox';

    return (
      <div ref={containerRef} className="form-control w-full relative">
        {label && (
          <label className="label py-1" htmlFor={id}>
            <span className="label-text font-bold text-base-content/85 text-xs">{label}</span>
          </label>
        )}
        <div className="relative w-full">
          <input
            id={id}
            ref={ref}
            type="text"
            className={inputClass}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            {...props}
          />
          <span className={`absolute ${iconRightClass} top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none`}>
            {isOpen ? <Search className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>

        {isOpen && filteredOptions.length > 0 && (
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            className="z-50 bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
            style={dropdownStyle}
          >
            {filteredOptions.map((opt, index) => (
              <li
                key={opt.value}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={opt.value === value}
                className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${
                  index === activeIndex
                    ? 'bg-primary/10 text-primary'
                    : opt.value === value
                    ? 'bg-base-200 font-semibold'
                    : 'hover:bg-base-200'
                }`}
                onMouseDown={(e) => {
                  // Prevent input focus loss
                  e.preventDefault();
                  handleSelect(opt);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span>{opt.label}</span>
              </li>
            ))}
          </ul>
        )}

        {isOpen && filteredOptions.length === 0 && (
          <div
            className="z-50 bg-base-100 border border-base-300 rounded-lg shadow-xl p-3 text-xs text-base-content/40 text-center"
            style={dropdownStyle}
          >
            {noMatchesText}
          </div>
        )}

        {(error || helperText) && (
          <label className="label py-0.5">
            <span className={`label-text-alt text-xs whitespace-normal break-words w-full ${error ? 'text-error font-medium' : 'text-base-content/50'}`}>
              {error || helperText}
            </span>
          </label>
        )}
      </div>
    );
  }
);

Autocomplete.displayName = 'Autocomplete';
