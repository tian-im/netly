'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CURRENCY_OPTIONS } from '@/lib/currencies';
import { getCurrencyInfo } from '@/lib/iso-4217-data';
import { Search } from 'lucide-react';

import { Input } from '@/app/components/ui';

interface CurrencySelectorProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
  placeholder?: string;
}

/**
 * Searchable currency selector with datalist-based autocomplete.
 * With 180+ currencies, a plain <select> is unusable — this provides
 * a text input with native browser autocomplete and fallback to select.
 */
export default function CurrencySelector({
  id,
  value,
  onChange,
  disabled = false,
  className = '',
  name,
  placeholder,
}: CurrencySelectorProps) {
  const tCommon = useTranslations('common');
  const resolvedPlaceholder = placeholder ?? tCommon('currencySearchPlaceholder');
  const [inputValue, setInputValue] = useState(() => {
    const info = getCurrencyInfo(value);
    return info ? `${info.code} - ${info.name}` : value;
  });
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Sync input when value prop changes externally
  useEffect(() => {
    const info = getCurrencyInfo(value);
    setInputValue(info ? `${info.code} - ${info.name}` : value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const search = inputValue.toLowerCase().trim();
    if (!search) return CURRENCY_OPTIONS;

    return CURRENCY_OPTIONS.filter(
      (opt) =>
        opt.key.toLowerCase().includes(search) ||
        opt.name.toLowerCase().includes(search)
    );
  }, [inputValue]);

  const handleSelect = (code: string) => {
    const info = getCurrencyInfo(code);
    setInputValue(info ? `${info.code} - ${info.name}` : code);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(code);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = () => {
    // Delay hiding to allow click on dropdown item
    setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(-1);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
          handleSelect(filteredOptions[activeIndex].key);
        } else if (filteredOptions.length === 1) {
          handleSelect(filteredOptions[0].key);
        } else {
          // Try to match exact code from input
          const match = CURRENCY_OPTIONS.find(
            (o) => o.key.toUpperCase() === inputValue.trim().toUpperCase()
          );
          if (match) handleSelect(match.key);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const listboxId = id ? `${id}-listbox` : 'currency-listbox';

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          className="pr-10"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={resolvedPlaceholder}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none">
          <Search className="h-4 w-4" />
        </span>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
        >
          {filteredOptions.slice(0, 100).map((opt, index) => (
            <li
              key={opt.key}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={opt.key === value}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 ${
                index === activeIndex
                  ? 'bg-primary/10 text-primary'
                  : opt.key === value
                  ? 'bg-base-200 font-semibold'
                  : 'hover:bg-base-200'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt.key);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="font-mono font-bold text-xs w-10">{opt.key}</span>
              <span className="text-base-content/70">{opt.name}</span>
            </li>
          ))}
          {filteredOptions.length > 100 && (
            <li className="px-3 py-2 text-xs text-base-content/40 text-center border-t border-base-200">
              {tCommon('currencyMoreResults', { count: filteredOptions.length - 100 })}
            </li>
          )}
        </ul>
      )}

      {isOpen && filteredOptions.length === 0 && inputValue.trim() && (
        <div className="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-xl">
          <p className="px-3 py-3 text-xs text-base-content/40 text-center">
            {tCommon('currencyNoMatches', { inputValue })}
          </p>
        </div>
      )}
    </div>
  );
}
