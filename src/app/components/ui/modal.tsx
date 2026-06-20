import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  zIndex?: string;
  closeOnBackdropClick?: boolean;
}

const ModalComponent = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      maxWidth = 'md',
      zIndex = 'z-50',
      closeOnBackdropClick = true,
      className = '',
      children,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    // WHY: Centralized handling of the Escape key to close the modal, ensuring
    // consistent accessibility behavior and eliminating duplicate window-level
    // keydown event listeners across page components.
    useEffect(() => {
      if (!isOpen) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const maxWidthClass = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
    }[maxWidth] || 'max-w-md';

    // WHY: To prevent conflicts when a consumer specifies their own custom border utility
    // (e.g. border-error/20), we only apply the default border-base-200 class if no
    // other border color modifier is specified in className. We exclude layout, style,
    // and width modifiers (like border-2, border-solid) from this check.
    const hasCustomBorderColor = className.split(' ').some((cls) => {
      if (!cls.startsWith('border-')) return false;
      if (cls === 'border-base-200') return false;
      const suffix = cls.substring(7);
      if (['solid', 'dashed', 'dotted', 'double', 'none'].includes(suffix)) return false;
      if (/^[0248]$/.test(suffix)) return false;
      if (/^[xytblr]$/.test(suffix)) return false;
      if (/^[xytblr]-[0248]$/.test(suffix)) return false;
      return true;
    });
    const borderClass = hasCustomBorderColor ? '' : 'border-base-200';

    return (
      <div
        className={`modal modal-open ${zIndex}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        aria-label={ariaLabel}
      >
        <div
          ref={ref}
          className={`modal-box border ${borderClass} shadow-2xl bg-base-100 ${maxWidthClass} ${className}`.trim()}
          {...props}
        >
          {children}
        </div>
        {closeOnBackdropClick && (
          <div
            className="modal-backdrop bg-black/40 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
            data-testid="modal-backdrop"
          />
        )}
      </div>
    );
  }
);

ModalComponent.displayName = 'Modal';

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  showBorder?: boolean;
  onClose?: () => void;
}

// WHY: A standard flex-row header that handles alignment of titles and includes an
// optional built-in close button, replacing repetitive layout styles in modals.
const ModalHeader = ({
  className = '',
  showBorder = false,
  onClose,
  children,
  ...props
}: ModalHeaderProps) => {
  const borderClass = showBorder ? 'border-b border-base-200 pb-3' : '';
  return (
    <div className={`flex justify-between items-center ${borderClass} ${className}`.trim()} {...props}>
      {children}
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="btn-circle flex items-center justify-center p-0"
          aria-label="Close"
          icon={<X className="h-4 w-4" />}
        />
      )}
    </div>
  );
};
ModalHeader.displayName = 'Modal.Header';

export interface ModalTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  color?: 'primary' | 'error' | 'success' | 'warning' | 'default';
  icon?: React.ReactNode;
}

// WHY: Color presets standardise context semantics (e.g. error for delete confirmations,
// warning for discard, primary for standard actions) while ensuring consistent font sizing.
const ModalTitle = ({
  className = '',
  color = 'primary',
  icon,
  children,
  ...props
}: ModalTitleProps) => {
  const colorClass = {
    primary: 'text-primary',
    error: 'text-error',
    success: 'text-success',
    warning: 'text-warning',
    default: 'text-base-content',
  }[color];

  return (
    <h3 className={`font-bold text-lg flex items-center gap-2 ${colorClass} ${className}`.trim()} {...props}>
      {icon}
      {children}
    </h3>
  );
};
ModalTitle.displayName = 'Modal.Title';

export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalBody = ({ className = '', ...props }: ModalBodyProps) => {
  return <div className={`py-4 text-sm text-base-content/85 ${className}`.trim()} {...props} />;
};
ModalBody.displayName = 'Modal.Body';

export interface ModalActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  showBorder?: boolean;
}

const ModalActions = ({ className = '', showBorder = false, ...props }: ModalActionsProps) => {
  const borderClass = showBorder ? 'border-t border-base-200 pt-3' : '';
  return <div className={`modal-action ${borderClass} ${className}`.trim()} {...props} />;
};
ModalActions.displayName = 'Modal.Actions';

export const Modal = Object.assign(ModalComponent, {
  Header: ModalHeader,
  Title: ModalTitle,
  Body: ModalBody,
  Actions: ModalActions,
});
