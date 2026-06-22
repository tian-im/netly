import React from 'react';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'warning' | 'error' | 'ghost';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, helperText, size = 'md', variant = 'default', children, ...props }, ref) => {
    const sizeClass = {
      xs: 'select-xs',
      sm: 'select-sm',
      md: 'select-md',
      lg: 'select-lg',
    }[size];

    // WHY: The ghost variant renders a transparent, borderless select for use in compact
    // UI contexts like the locale switcher. Unlike other variants, it suppresses the border,
    // focus ring, and select-bordered class.
    const isGhost = variant === 'ghost';

    const variantClass = error
      ? 'select-error'
      : isGhost
      ? 'border-0 bg-transparent cursor-pointer'
      : {
          default: 'focus:border-primary',
          primary: 'select-primary',
          warning: 'select-warning',
          error: 'select-error',
        }[variant];

    const ringClass = error
      ? 'focus:ring-error/20'
      : isGhost
      ? ''
      : {
          default: 'focus:ring-primary/20',
          primary: 'focus:ring-primary/20',
          warning: 'focus:ring-warning/20',
          error: 'focus:ring-error/20',
        }[variant];

    const borderedClass = isGhost ? '' : 'select-bordered';
    const selectClass = `select ${borderedClass} w-full rounded-lg ${ringClass ? `focus:ring-2 ${ringClass}` : 'focus:ring-0 focus:outline-none'} ${sizeClass} ${variantClass} ${className}`.trim().replace(/\s+/g, ' ');

    return (
      <div className="form-control w-full">
        {label && (
          <label className="label py-1" htmlFor={props.id}>
            <span className="label-text font-bold text-base-content/85 text-xs">{label}</span>
          </label>
        )}
        <select ref={ref} className={selectClass} {...props}>
          {children}
        </select>
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

Select.displayName = 'Select';
