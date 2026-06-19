import React from 'react';
import Link from 'next/link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  href?: string;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement & HTMLAnchorElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, href, icon, children, ...props }, ref) => {
    
    // Map variant to DaisyUI classes
    const variantClasses = {
      primary: 'btn-primary text-primary-content',
      secondary: 'btn-secondary text-secondary-content',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      error: 'btn-error text-error-content',
      success: 'btn-success text-success-content',
    }[variant];

    // Map size to DaisyUI classes
    const sizeClasses = {
      xs: 'btn-xs px-2',
      sm: 'btn-sm px-3',
      md: 'btn-md px-5',
      lg: 'btn-lg px-6',
    }[size];

    const baseClass = `btn rounded-xl transition-all duration-200 font-medium gap-2 normal-case no-animation hover:scale-[0.98] ${variantClasses} ${sizeClasses} ${className}`;

    if (href) {
      return (
        <Link href={href} className={baseClass} ref={ref as React.Ref<HTMLAnchorElement>} {...(props as any)}>
          {loading ? <span className="loading loading-spinner loading-xs" data-testid="loading-spinner" /> : icon}
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={baseClass}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? <span className="loading loading-spinner loading-xs" data-testid="loading-spinner" /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
