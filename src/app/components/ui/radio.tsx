import React from 'react';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'warning' | 'error';
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className = '', size = 'md', color = 'primary', ...props }, ref) => {
    const sizeClass = size !== 'md' ? `radio-${size}` : '';
    const colorClass = `radio-${color}`;
    const classes = `radio ${sizeClass} ${colorClass} ${className}`.trim();
    return <input ref={ref} type="radio" className={classes} {...props} />;
  }
);
Radio.displayName = 'Radio';
