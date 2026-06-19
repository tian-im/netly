import React from 'react';
import Link from 'next/link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'success' | 'outline-error' | 'outline-primary' | 'outline-secondary';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  href?: string;
  icon?: React.ReactNode;
}

// WHY: We use a union type HTMLButtonElement | HTMLAnchorElement for forwardRef because
// the component can render either a standard <button> or a Next.js <Link> (anchor) dynamically.
export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, href, icon, children, ...props }, ref) => {
    
    // Map variant to DaisyUI classes
    // WHY: outline-primary, outline-secondary, and outline-error variants provide themed outline styling,
    // preserving the visual identity and brand accents of interactive buttons.
    const variantClasses = {
      primary: 'btn-primary text-primary-content',
      secondary: 'btn-secondary text-secondary-content',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      error: 'btn-error text-error-content',
      success: 'btn-success text-success-content',
      'outline-primary': 'btn-outline btn-primary',
      'outline-secondary': 'btn-outline btn-secondary',
      'outline-error': 'btn-outline btn-error',
    }[variant];


    // Map size to DaisyUI classes
    const sizeClasses = {
      xs: 'btn-xs px-2',
      sm: 'btn-sm px-3',
      md: 'btn-md px-5',
      lg: 'btn-lg px-6',
    }[size];

    // WHY: We override defaults with 'normal-case' and 'no-animation' to maintain a modern,
    // custom design aesthetic, replacing standard uppercase text and heavy native animations.
    // hover:scale-[0.98] is used for a premium, custom click-feeling micro-interaction.
    const baseClass = `btn rounded-xl transition-all duration-200 font-medium gap-2 normal-case no-animation hover:scale-[0.98] ${variantClasses} ${sizeClasses} ${className}`;

    // WHY: If href is provided, this component acts as a Next.js Link. We extract button-specific
    // props (type, disabled, form, etc.) to prevent passing them to the anchor element, which
    // would otherwise trigger HTML/DOM validation warnings.
    if (href) {
      const {
        type,
        disabled,
        form,
        formAction,
        name,
        value,
        ...linkProps
      } = props as React.ButtonHTMLAttributes<HTMLButtonElement>;

      return (
        <Link href={href} className={baseClass} ref={ref as React.Ref<HTMLAnchorElement>} {...(linkProps as any)}>
          {loading ? <span className="loading loading-spinner loading-xs" data-testid="loading-spinner" /> : icon}
          {children}
        </Link>
      );
    }

    // WHY: We force disable the button during loading states (loading={true}) to prevent duplicate
    // submissions even if the caller did not pass disabled={true} explicitly.
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

