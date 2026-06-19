import React from 'react';
import Link from 'next/link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'success' | 'outline-error' | 'outline-primary' | 'outline-secondary' | 'neutral' | 'warning' | 'link' | 'tab' | 'segmented';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  href?: string;
  icon?: React.ReactNode;
  target?: string;
  rel?: string;
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
      neutral: 'btn-neutral text-neutral-content',
      warning: 'btn-warning text-warning-content',
      link: 'btn-link p-0 h-auto min-h-0 text-left justify-start',
      tab: 'tab',
      segmented: 'bg-transparent text-base-content/70 hover:bg-base-300 border-0',
    }[variant];


    // Map size to DaisyUI classes
    const sizeClasses = variant === 'tab'
      ? { xs: 'tab-xs', sm: 'tab-sm', md: 'tab-md', lg: 'tab-lg', xl: 'tab-xl' }[size]
      : variant === 'link'
      ? { xs: 'btn-xs', sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg', xl: 'btn-xl' }[size]
      : { xs: 'btn-xs px-2', sm: 'btn-sm px-3', md: 'btn-md px-5', lg: 'btn-lg px-6', xl: 'btn-xl px-7' }[size];

    // WHY: We override defaults with 'normal-case' and 'no-animation' to maintain a modern,
    // custom design aesthetic, replacing standard uppercase text and heavy native animations.
    // hover:scale-[0.98] is used for a premium, custom click-feeling micro-interaction.
    // For tabs and links, we suppress scale and btn-specific extra paddings.
    const isTab = variant === 'tab';
    const isLink = variant === 'link';
    const isJoinItem = className.includes('join-item');
    const prefix = isTab ? '' : 'btn ';
    const btnExtras = isTab
      ? ''
      : (isLink || isJoinItem)
      ? 'transition-all duration-200 no-animation '
      : 'rounded-md transition-all duration-200 no-animation hover:scale-[0.98] ';
    const baseClass = `${prefix}${btnExtras}font-medium gap-2 normal-case ${variantClasses} ${sizeClasses} ${className}`.trim();

    // WHY: If href is provided, this component acts as a Next.js Link. We extract button-specific
    // props (type, disabled, form, etc.) to prevent passing them to the anchor element, which
    // would otherwise trigger HTML/DOM validation warnings.
    // Tabs should never render as links.
    if (href && variant !== 'tab') {
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

