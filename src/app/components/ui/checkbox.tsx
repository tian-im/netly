import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  variant?: 'checkbox' | 'toggle';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'warning' | 'error';
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', variant = 'checkbox', size = 'md', color = 'primary', ...props }, ref) => {
    const prefix = variant === 'toggle' ? 'toggle' : 'checkbox';
    const sizeClass = size !== 'md' ? `${prefix}-${size}` : '';
    const colorClass = `${prefix}-${color}`;
    const classes = `${prefix} ${sizeClass} ${colorClass} ${className}`.trim();

    // WHY: Checkboxes are inline form controls. We don't wrap them in form-control
    // to avoid breaking layout in table cells, labels, and inline groups.
    // The consumer is responsible for any label/error wrapping.
    return <input ref={ref} type="checkbox" className={classes} {...props} />;
  }
);
Checkbox.displayName = 'Checkbox';
